import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createCategory,
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  getProducts,
} from "@/services/product.service";
import { createProductGroupWithVariants } from "@/services/product-group.service";
import { catatBarangMasuk } from "@/services/stock.service";
import { checkout } from "@/services/transaction.service";
import { getPriceHistory } from "@/services/price-history.service";
import { hasPermission } from "@/lib/auth/permissions";
import { sanitizeProductCost, calculateMargin } from "@/lib/product-visibility";

describe("Modul Daftar Produk & Harga Modern POS - Pengujian Lengkap", () => {
  let ownerId: string;
  let originalHargaBeliAktif = true;
  let testCatId: string;
  let indomieId: string;
  let indomiePcsSatuanId: string;
  let dupId: string;
  let groupId: string;
  const createdProductIds: string[] = [];
  const createdTxIds: string[] = [];

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    const settings = await prisma.pengaturanToko.findUnique({ where: { id: "default" } });
    originalHargaBeliAktif = settings?.aktifkanHargaBeli ?? true;

    // Pastikan aktifkanHargaBeli aktif di awal skenario uji
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: true },
    });

    const cat = await createCategory("Mie Uji Integrasi", ownerId);
    testCatId = cat.id;
  });

  afterAll(async () => {
    // Kembalikan pengaturan toko awal
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: originalHargaBeliAktif },
    });

    if (createdTxIds.length > 0) {
      await prisma.pembayaran.deleteMany({ where: { transaksiId: { in: createdTxIds } } });
      await prisma.transaksiItem.deleteMany({ where: { transaksiId: { in: createdTxIds } } });
      await prisma.transaksi.deleteMany({ where: { id: { in: createdTxIds } } });
    }

    if (createdProductIds.length > 0) {
      await prisma.riwayatHarga.deleteMany({ where: { produkId: { in: createdProductIds } } });
      await prisma.stokMutasi.deleteMany({ where: { produkId: { in: createdProductIds } } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: { in: createdProductIds } } });
      await prisma.productBarcode.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: { in: createdProductIds } } });
      await prisma.produk.deleteMany({ where: { id: { in: createdProductIds } } });
    }

    if (groupId) {
      await prisma.productGroup.deleteMany({ where: { id: groupId } });
    }
    if (testCatId) {
      await prisma.kategori.deleteMany({ where: { id: testCatId } });
    }
  });

  it("1. Menambah produk multi-satuan dengan SKU otomatis unik & anti-duplikat", async () => {
    const indomie = await createProduct(
      {
        nama: "Indomie Goreng Uji",
        kategoriId: testCatId,
        barcode: "8998866200991",
        satuanDasar: "pcs",
        stokMinimum: 20,
        satuanList: [
          {
            namaSatuan: "pcs",
            faktorKeDasar: 1,
            hargaJual: 3000,
            hargaBeli: 2500,
            isDefault: true,
          },
          {
            namaSatuan: "dus",
            faktorKeDasar: 40,
            hargaJual: 112000,
            hargaBeli: 100000,
            isDefault: false,
          },
        ],
      },
      ownerId
    );

    indomieId = indomie.id;
    createdProductIds.push(indomie.id);
    indomiePcsSatuanId = indomie.satuanProduk.find((s) => s.namaSatuan === "pcs")!.id;

    expect(indomie.sku).toBeTruthy();
    expect(indomie.sku).toMatch(/^PRD-[A-Z0-9]{3}-\d{3,}$/);

    // Cari produk berdasarkan SKU
    const foundBySku = await getProducts({ search: indomie.sku! });
    expect(foundBySku.some((p) => p.id === indomie.id)).toBe(true);

    // SKU duplikat harus ditolak
    await expect(
      createProduct(
        {
          sku: indomie.sku,
          nama: "Indomie Palsu SKU Kembar",
          satuanDasar: "pcs",
          stokMinimum: 5,
          satuanList: [{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 3000, hargaBeli: 2500 }],
        },
        ownerId
      )
    ).rejects.toThrow("sudah digunakan");
  });

  it("2. Pembelian satuan dus (2 dus x 40 pcs = +80 pcs) dan penjualan satuan pcs (5 pcs -> 75 pcs)", async () => {
    await catatBarangMasuk(
      {
        catatan: "Beli Indomie 2 dus",
        items: [
          {
            produkId: indomieId,
            namaSatuan: "dus",
            faktorKeDasar: 40,
            qty: 2,
            hargaBeliPerSatuan: 100000,
          },
        ],
      },
      ownerId
    );

    let afterBuy = await prisma.produk.findUnique({ where: { id: indomieId } });
    expect(Number(afterBuy?.stokCache)).toBe(80);

    // Jual 5 pcs di kasir
    const txRes = await checkout(
      {
        idempotencyKey: crypto.randomUUID(),
        items: [{ produkId: indomieId, satuanProdukId: indomiePcsSatuanId, qty: 5 }],
        diskon: 0,
        metodePembayaran: "TUNAI",
        uangDiterima: 20000,
      },
      { id: ownerId, role: "OWNER" }
    );
    expect(txRes.transaksi).not.toBeNull();
    createdTxIds.push(txRes.transaksi!.id);

    const afterSell = await prisma.produk.findUnique({ where: { id: indomieId } });
    expect(Number(afterSell?.stokCache)).toBe(75);
    expect(txRes.transaksi!.items[0].hargaBeliSnapshot).toBe(2500);
  });

  it("3. Edit harga & pencatatan riwayat perubahan harga jual dan harga beli permanen", async () => {
    const edited = await updateProduct(
      indomieId,
      {
        satuanList: [
          { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 3500, hargaBeli: 2700, isDefault: true },
          { namaSatuan: "dus", faktorKeDasar: 40, hargaJual: 120000, hargaBeli: 105000, isDefault: false },
        ],
      },
      ownerId
    );
    expect(edited).toBeDefined();

    const fullHistory = await getPriceHistory({ produkId: indomieId, includeCostHistory: true });
    expect(fullHistory.some((h) => h.jenisPerubahan === "HARGA_JUAL" && h.hargaLama === 3000 && h.hargaBaru === 3500)).toBe(true);
    expect(fullHistory.some((h) => h.jenisPerubahan === "HARGA_BELI" && h.hargaLama === 2500 && h.hargaBaru === 2700)).toBe(true);

    // Kasir tanpa izin harga beli hanya boleh melihat riwayat harga jual
    const kasirHistory = await getPriceHistory({ produkId: indomieId, includeCostHistory: false });
    expect(kasirHistory.some((h) => h.jenisPerubahan === "HARGA_BELI")).toBe(false);
    expect(kasirHistory.some((h) => h.jenisPerubahan === "HARGA_JUAL")).toBe(true);
  });

  it("4. Nonaktifkan fitur harga beli: sembunyikan modal & pertahankan data lama saat diedit & diaktifkan kembali", async () => {
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: false },
    });

    // Simulasi edit harga jual saat fitur harga beli nonaktif (payload hargaBeli tidak dikirim / 0)
    await updateProduct(
      indomieId,
      {
        satuanList: [
          { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 3600, hargaBeli: 0, isDefault: true },
          { namaSatuan: "dus", faktorKeDasar: 40, hargaJual: 122000, hargaBeli: 0, isDefault: false },
        ],
      },
      ownerId,
      undefined,
      { allowEditHargaBeli: false }
    );

    // Aktifkan kembali fitur harga beli: data hargaBeli lama (2700 & 105000) TIDAK boleh hilang!
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: true },
    });

    const restored = await prisma.produk.findUnique({
      where: { id: indomieId },
      include: { satuanProduk: true },
    });
    const pcsUnit = restored?.satuanProduk.find((s) => s.namaSatuan === "pcs");
    const dusUnit = restored?.satuanProduk.find((s) => s.namaSatuan === "dus");
    expect(pcsUnit?.hargaJual).toBe(3600);
    expect(pcsUnit?.hargaBeli).toBe(2700);
    expect(dusUnit?.hargaBeli).toBe(105000);
  });

  it("5. Duplikat produk mendapat ID baru, SKU baru, barcode kosong, dan menyalin harga beli", async () => {
    const dup = await duplicateProduct(indomieId, ownerId);
    dupId = dup.id;
    createdProductIds.push(dup.id);

    expect(dup.id).not.toBe(indomieId);
    expect(dup.sku).toBeTruthy();
    expect(dup.sku).not.toBe(
      (await prisma.produk.findUnique({ where: { id: indomieId }, select: { sku: true } }))?.sku
    );
    expect(dup.barcode).toBeNull();
    expect(dup.nama).toContain("(Salinan)");
    const pcsCopy = dup.satuanProduk.find((s) => s.namaSatuan === "pcs");
    expect(pcsCopy?.hargaBeli).toBe(2700);
  });

  it("6. Varian produk (Le Minerale 600ml, 1.5L, 15L) terpisah SKU, barcode, dan stoknya", async () => {
    const created = await createProductGroupWithVariants(
      {
        nama: "Le Minerale Uji",
        brand: "Le Minerale",
        kategoriId: testCatId,
        variants: [
          {
            variantName: "600 ml",
            barcode: "8996001000601",
            satuanDasar: "botol",
            stokMinimum: 10,
            stokAwal: 24,
            satuanList: [{ namaSatuan: "botol", faktorKeDasar: 1, hargaJual: 3500, hargaBeli: 2600, isDefault: true }],
          },
          {
            variantName: "1,5 liter",
            barcode: "8996001000151",
            satuanDasar: "botol",
            stokMinimum: 5,
            stokAwal: 12,
            satuanList: [{ namaSatuan: "botol", faktorKeDasar: 1, hargaJual: 6000, hargaBeli: 4500, isDefault: true }],
          },
        ],
      },
      ownerId
    );
    groupId = created.group.id;
    created.variants.forEach((v) => createdProductIds.push(v.id));

    expect(created.variants.length).toBe(2);
    const [v1, v2] = created.variants;
    expect(v1.sku).not.toBe(v2.sku);
    expect(v1.barcode).toBe("8996001000601");
    expect(v2.barcode).toBe("8996001000151");
    expect(Number(v1.stokCache)).toBe(24);
    expect(Number(v2.stokCache)).toBe(12);
  });

  it("7. Soft-delete menjaga riwayat harga & transaksi lama tetap aman, dan RBAC Pemilik vs Kasir", async () => {
    await deleteProduct(dupId, ownerId);
    const inactive = await prisma.produk.findUnique({ where: { id: dupId } });
    expect(inactive?.aktif).toBe(false);

    // Transaksi sebelumnya tetap punya hargaBeliSnapshot utuh
    const oldTx = await prisma.transaksi.findUnique({
      where: { id: createdTxIds[0] },
      include: { items: true },
    });
    expect(oldTx?.items[0].hargaBeliSnapshot).toBe(2500);

    // Hak akses: Pemilik punya `produk:cost`, Kasir tidak punya kecuali diberi izin khusus
    expect(hasPermission({ role: "OWNER" }, "produk:cost")).toBe(true);
    expect(hasPermission({ role: "STAFF_KASIR" }, "produk:cost")).toBe(false);
    expect(hasPermission({ role: "STAFF_KASIR", permissions: ["produk:cost"] }, "produk:cost")).toBe(true);

    // Sanitasi API: hargaBeli dihapus dari payload untuk Kasir tanpa izin
    const prod = await prisma.produk.findUnique({
      where: { id: indomieId },
      include: {
        satuanProduk: { orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }] },
      },
    });
    const forKasir = sanitizeProductCost(prod!, false);
    const forOwner = sanitizeProductCost(prod!, true);
    expect(forKasir.satuanProduk[0].hargaBeli).toBeUndefined();
    expect(forOwner.satuanProduk.find((s) => s.namaSatuan === "pcs")?.hargaBeli).toBe(2700);
    expect(forOwner.satuanProduk.find((s) => s.namaSatuan === "dus")?.hargaBeli).toBe(105000);

    // Perhitungan margin keuntungan akurat
    const margin = calculateMargin(3600, 2700);
    expect(margin.nominal).toBe(900);
    expect(margin.percent).toBeCloseTo(33.3, 1);
  });
});
