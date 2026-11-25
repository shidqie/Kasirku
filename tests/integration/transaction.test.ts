import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "@/services/product.service";
import { catatBarangMasuk } from "@/services/stock.service";
import { checkout, voidTransaction, hitungPembulatan } from "@/services/transaction.service";

describe("Tahap 4: Kasir, Checkout Atomik, Idempotensi, & Void Tests", () => {
  let ownerId: string;
  let testProductId: string;
  let defaultSatuanId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // Buat produk untuk pengujian checkout
    const prod = await createProduct(
      {
        nama: "Telur Ayam Negeri Uji",
        satuanDasar: "kg",
        stokMinimum: 5,
        satuanList: [
          { namaSatuan: "kg", faktorKeDasar: 1, hargaJual: 28000, hargaBeli: 24000, isDefault: true },
        ],
      },
      ownerId
    );
    testProductId = prod.id;
    defaultSatuanId = prod.satuanProduk[0].id;

    // Tambah stok masuk 20 kg
    await catatBarangMasuk(
      {
        items: [
          {
            produkId: testProductId,
            namaSatuan: "kg",
            faktorKeDasar: 1,
            qty: 20,
            hargaBeliPerSatuan: 24000,
          },
        ],
      },
      ownerId
    );
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.stokMutasi.deleteMany({ where: { produkId: testProductId } });
      await prisma.transaksiItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
  });

  it("User Story C3: Helper hitungPembulatan benar untuk 0, 100, dan 500", () => {
    // Aturan BULAT_100
    expect(hitungPembulatan(12430, "BULAT_100")).toBe(-30); // 12400
    expect(hitungPembulatan(12460, "BULAT_100")).toBe(40); // 12500
    expect(hitungPembulatan(12500, "BULAT_100")).toBe(0);

    // Aturan BULAT_500
    expect(hitungPembulatan(12200, "BULAT_500")).toBe(-200); // 12000
    expect(hitungPembulatan(12350, "BULAT_500")).toBe(150); // 12500

    // Aturan BULAT_0
    expect(hitungPembulatan(12345, "BULAT_0")).toBe(0);
  });

  it("User Story C1, C2, B4: Checkout atomik dengan kuantitas desimal (0,5 kg telur)", async () => {
    const key = crypto.randomUUID();

    const res = await checkout(
      {
        idempotencyKey: key,
        items: [
          {
            produkId: testProductId,
            satuanProdukId: defaultSatuanId,
            qty: 0.5, // 0.5 kg telur @ 28000 = 14000
          },
        ],
        diskon: 0,
        metodePembayaran: "TUNAI",
        uangDiterima: 20000,
      },
      { id: ownerId, role: "OWNER" }
    );

    expect(res.transaksi).toBeDefined();
    expect(res.isDuplicate).toBe(false);
    expect(res.transaksi?.total).toBe(14000);
    expect(res.transaksi?.items[0].subtotal).toBe(14000);
    expect(Number(res.transaksi?.items[0].qty)).toBe(0.5);

    // Kembalian: 20000 - 14000 = 6000
    expect(res.transaksi?.pembayaran[0].kembalian).toBe(6000);

    // Cek stok berkurang: 20 kg - 0.5 kg = 19.5 kg
    const p = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(p?.stokCache)).toBe(19.5);
  });

  it("User Story C8: Idempotency key yang sama mengembalikan transaksi yang sama tanpa menduplikasi data", async () => {
    const key = crypto.randomUUID();

    // Request pertama
    const res1 = await checkout(
      {
        idempotencyKey: key,
        items: [
          {
            produkId: testProductId,
            satuanProdukId: defaultSatuanId,
            qty: 1,
          },
        ],
        diskon: 0,
        metodePembayaran: "TRANSFER",
      },
      { id: ownerId, role: "OWNER" }
    );

    expect(res1.isDuplicate).toBe(false);

    // Request kedua dengan key yang sama persis
    const res2 = await checkout(
      {
        idempotencyKey: key,
        items: [
          {
            produkId: testProductId,
            satuanProdukId: defaultSatuanId,
            qty: 1,
          },
        ],
        diskon: 0,
        metodePembayaran: "TRANSFER",
      },
      { id: ownerId, role: "OWNER" }
    );

    expect(res2.isDuplicate).toBe(true);
    expect(res2.transaksi?.id).toBe(res1.transaksi?.id);
    expect(res2.transaksi?.nomorStruk).toBe(res1.transaksi?.nomorStruk);
  });

  it("User Story C6: Pembatalan transaksi (void) non-destruktif mengembalikan stok melalui mutasi lawan", async () => {
    const key = crypto.randomUUID();

    // Checkout 2 kg
    const res = await checkout(
      {
        idempotencyKey: key,
        items: [
          {
            produkId: testProductId,
            satuanProdukId: defaultSatuanId,
            qty: 2,
          },
        ],
        diskon: 0,
        metodePembayaran: "TUNAI",
        uangDiterima: 60000,
      },
      { id: ownerId, role: "OWNER" }
    );

    const trxId = res.transaksi!.id;
    const stokSebelumVoid = (await prisma.produk.findUnique({ where: { id: testProductId } }))!.stokCache;

    // Lakukan void transaksi
    const voidRes = await voidTransaction(
      trxId,
      "Salah varian barang",
      { id: ownerId, role: "OWNER" }
    );

    expect(voidRes.status).toBe("BATAL");
    expect(voidRes.alasanBatal).toBe("Salah varian barang");

    // Stok harus bertambah kembali +2 kg
    const pAfterVoid = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(pAfterVoid?.stokCache)).toBe(Number(stokSebelumVoid) + 2);

    // Cek ada mutasi BATAL_JUAL append-only
    const mutasiBatal = await prisma.stokMutasi.findFirst({
      where: { refId: trxId, tipe: "BATAL_JUAL" },
    });
    expect(mutasiBatal).toBeDefined();
    expect(Number(mutasiBatal?.qtyDasar)).toBe(2);
  });
});

