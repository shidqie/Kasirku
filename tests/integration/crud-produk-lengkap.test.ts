import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createCategory,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/services/product.service";
import { catatBarangMasuk, getStockMutations } from "@/services/stock.service";
import { getPriceHistory } from "@/services/price-history.service";
import { checkout } from "@/services/transaction.service";

describe("Penyempurnaan CRUD Produk & Harga (Multi-Satuan, Harga Beli, Arsip, Riwayat)", () => {
  const suffix = Date.now().toString(36);
  let ownerId: string;
  let originalHargaBeliAktif = true;
  let testCatId: string;
  let produkId: string;
  let pcsSatuanId: string;
  let inactiveProdId: string;
  const createdProductIds: string[] = [];
  const createdTxIds: string[] = [];

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!owner) throw new Error("Owner seed tidak ditemukan");
    ownerId = owner.id;

    const settings = await prisma.pengaturanToko.findUnique({ where: { id: "default" } });
    originalHargaBeliAktif = settings?.aktifkanHargaBeli ?? true;

    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: true },
    });

    const cat = await createCategory(`Kategori CRUD ${suffix}`, ownerId);
    testCatId = cat.id;
  });

  afterAll(async () => {
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
    if (testCatId) {
      await prisma.kategori.deleteMany({ where: { id: testCatId } });
    }
  });

  it("1. CREATE: Membuat produk multi-satuan (Pcs/Pak/Dus), satuan pembelian Dus, status aktif/nonaktif & SKU otomatis", async () => {
    const prod = await createProduct(
      {
        nama: `Indomie Soto CRUD ${suffix}`,
        kategoriId: testCatId,
        barcode: `899555${suffix.slice(-5)}`,
        satuanDasar: "pcs",
        stokMinimum: 10,
        aktif: true,
        satuanList: [
          { namaSatuan: "pcs", faktorKeDasar: 1, hargaBeli: 2500, hargaJual: 3500, isDefault: true, isDefaultBeli: false },
          { namaSatuan: "pak", faktorKeDasar: 12, hargaBeli: 29000, hargaJual: 40000, isDefault: false, isDefaultBeli: false },
          { namaSatuan: "dus", faktorKeDasar: 24, hargaBeli: 56000, hargaJual: 78000, isDefault: false, isDefaultBeli: true },
        ],
      },
      ownerId
    );
    produkId = prod.id;
    createdProductIds.push(prod.id);

    expect(prod.sku).toMatch(/^PRD-/);
    expect(prod.merek).toBe("Indomie");
    expect(prod.aktif).toBe(true);
    expect(prod.satuanProduk.length).toBe(3);

    const pcs = prod.satuanProduk.find((s) => s.namaSatuan === "pcs");
    const dus = prod.satuanProduk.find((s) => s.namaSatuan === "dus");
    pcsSatuanId = pcs!.id;
    expect(pcs?.isDefault).toBe(true);
    expect(pcs?.isDefaultBeli).toBe(false);
    expect(dus?.isDefaultBeli).toBe(true);
    expect(Number(dus?.faktorKeDasar)).toBe(24);
    expect(dus?.hargaBeli).toBe(56000);

    // Produk dapat dibuat dalam status nonaktif dan difilter
    const inactive = await createProduct(
      {
        nama: `Produk Nonaktif CRUD ${suffix}`,
        satuanDasar: "pcs",
        stokMinimum: 0,
        aktif: false,
        satuanList: [{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 5000, isDefault: true }],
      },
      ownerId
    );
    inactiveProdId = inactive.id;
    createdProductIds.push(inactive.id);

    const activeList = await getProducts({ aktifOnly: true });
    expect(activeList.some((p) => p.id === produkId)).toBe(true);
    expect(activeList.some((p) => p.id === inactiveProdId)).toBe(false);

    const allList = await getProducts({ aktifOnly: false });
    expect(allList.some((p) => p.id === inactiveProdId && p.aktif === false)).toBe(true);
  }, 20000);

  it("2. INTEGRASI STOK & TRANSAKSI: Beli dalam Dus (+24/dus), jual Eceran (Pcs), dan baca Riwayat Mutasi & Harga", async () => {
    // Beli 2 dus = +48 pcs
    await catatBarangMasuk(
      {
        catatan: "Pembelian dus uji CRUD",
        items: [
          {
            produkId,
            namaSatuan: "dus",
            faktorKeDasar: 24,
            qty: 2,
            hargaBeliPerSatuan: 56000,
          },
        ],
      },
      ownerId
    );

    let current = await prisma.produk.findUnique({ where: { id: produkId } });
    expect(Number(current?.stokCache)).toBe(48);

    // Jual 5 pcs
    const txRes = await checkout(
      {
        idempotencyKey: crypto.randomUUID(),
        items: [{ produkId, satuanProdukId: pcsSatuanId, qty: 5 }],
        diskon: 0,
        metodePembayaran: "TUNAI",
        uangDiterima: 20000,
      },
      { id: ownerId, role: "OWNER" }
    );
    expect(txRes.transaksi).toBeTruthy();
    if (txRes.transaksi) createdTxIds.push(txRes.transaksi.id);

    current = await prisma.produk.findUnique({ where: { id: produkId } });
    expect(Number(current?.stokCache)).toBe(43);

    // Riwayat mutasi stok mencatat MASUK (+48) & JUAL (-5)
    const mutations = await getStockMutations(produkId);
    expect(mutations.some((m) => m.tipe === "MASUK" && Number(m.qtyDasar) === 48)).toBe(true);
    expect(mutations.some((m) => m.tipe === "JUAL" && Number(m.qtyDasar) === -5)).toBe(true);
  }, 20000);

  it("3. UPDATE & TOGGLE HARGA BELI: Nonaktifkan harga beli tidak menghapus harga beli lama atau merusak transaksi lama", async () => {
    // Nonaktifkan fitur harga beli secara global
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: false },
    });

    const prodBefore = await prisma.produk.findUnique({
      where: { id: produkId },
      include: { satuanProduk: true },
    });

    // Update harga jual pcs (3500 -> 3800) saat fitur harga beli NONAKTIF & ubah stok minimum
    await updateProduct(
      produkId,
      {
        stokMinimum: 15,
        satuanList: prodBefore!.satuanProduk.map((s) => ({
          id: s.id,
          namaSatuan: s.namaSatuan,
          faktorKeDasar: Number(s.faktorKeDasar),
          hargaJual: s.namaSatuan === "pcs" ? 3800 : s.hargaJual,
          isDefault: s.isDefault,
          isDefaultBeli: s.isDefaultBeli,
        })),
      },
      ownerId,
      undefined,
      { allowEditHargaBeli: false, userRole: "OWNER" }
    );

    const afterOff = await prisma.produk.findUnique({
      where: { id: produkId },
      include: { satuanProduk: true },
    });
    const dusUnit = afterOff?.satuanProduk.find((s) => s.namaSatuan === "dus");
    const pcsUnit = afterOff?.satuanProduk.find((s) => s.namaSatuan === "pcs");
    expect(pcsUnit?.hargaJual).toBe(3800);
    // Harga beli lama TETAP aman (56000 untuk dus, 2500 untuk pcs)
    expect(dusUnit?.hargaBeli).toBe(56000);
    expect(pcsUnit?.hargaBeli).toBe(2500);
    expect(Number(afterOff?.stokMinimum)).toBe(15);

    // Transaksi lama TETAP memakai harga snapshot lama (3500)
    const oldTxItem = await prisma.transaksiItem.findFirst({
      where: { transaksiId: createdTxIds[0], produkId },
    });
    expect(oldTxItem?.hargaJualSnapshot).toBe(3500);
    expect(oldTxItem?.hargaBeliSnapshot).toBe(2500);

    // Riwayat perubahan harga jual tercatat
    const priceHistory = await getPriceHistory({ produkId, includeCostHistory: true });
    expect(
      priceHistory.some(
        (h) => h.jenisPerubahan === "HARGA_JUAL" && h.hargaLama === 3500 && h.hargaBaru === 3800
      )
    ).toBe(true);

    // Aktifkan kembali harga beli & pastikan data masih utuh
    await prisma.pengaturanToko.updateMany({
      where: { id: "default" },
      data: { aktifkanHargaBeli: true },
    });
    const afterOn = await prisma.produk.findUnique({
      where: { id: produkId },
      include: { satuanProduk: true },
    });
    expect(afterOn?.satuanProduk.find((s) => s.namaSatuan === "dus")?.hargaBeli).toBe(56000);
  }, 20000);

  it("4. DELETE / SOFT-DELETE ARSIP: Produk bertransaksi diarsipkan (aktif=false), laporan & transaksi tetap utuh, bisa dipulihkan", async () => {
    const res = await deleteProduct(produkId, ownerId);
    expect(res.hasHistory).toBe(true);
    expect(res.aktif).toBe(false);

    // Transaksi lama & mutasi masih utuh
    const txStillExists = await prisma.transaksi.findUnique({
      where: { id: createdTxIds[0] },
      include: { items: true },
    });
    expect(txStillExists?.items.length).toBe(1);

    // Bisa diaktifkan kembali melalui Edit (updateProduct)
    const restored = await updateProduct(produkId, { aktif: true }, ownerId);
    expect(restored?.aktif).toBe(true);
  }, 15000);
});
