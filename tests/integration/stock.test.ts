import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "@/services/product.service";
import {
  catatBarangMasuk,
  reconcileStock,
  getLowStockProducts,
  adjustStockManual,
} from "@/services/stock.service";

describe("Tahap 3: Stok Ledger, Barang Masuk, Status Warna & Perlu Belanja Tests", () => {
  let ownerId: string;
  let testProductId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // Buat produk dengan satuan dasar kg dan satuan karung 25kg
    const p = await createProduct(
      {
        nama: "Gula Pasir Kristal Uji",
        satuanDasar: "kg",
        stokMinimum: 10,
        satuanList: [
          { namaSatuan: "kg", faktorKeDasar: 1, hargaJual: 17000, hargaBeli: 15000, isDefault: true },
          { namaSatuan: "karung 50kg", faktorKeDasar: 50, hargaJual: 800000, hargaBeli: 730000, isDefault: false },
        ],
      },
      ownerId
    );
    testProductId = p.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.stokMutasi.deleteMany({ where: { produkId: testProductId } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
  });

  it("User Story E1: Barang masuk 1 karung (50 kg) otomatis menambah 50 kg ke satuan dasar", async () => {
    const res = await catatBarangMasuk(
      {
        catatan: "Penerimaan belanja gula",
        items: [
          {
            produkId: testProductId,
            namaSatuan: "karung 50kg",
            faktorKeDasar: 50,
            qty: 1, // 1 karung
            hargaBeliPerSatuan: 730000,
          },
        ],
      },
      ownerId
    );

    expect(res.bm).toBeDefined();
    expect(res.bm.nomor).toMatch(/^BM-\d{8}-\d{4}$/);

    // Cek produk: stok_cache harus 50 kg
    const p = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(p?.stokCache)).toBe(50);

    // Cek mutasi ledger append-only
    const mutasi = await prisma.stokMutasi.findFirst({
      where: { produkId: testProductId, tipe: "MASUK" },
    });
    expect(mutasi).toBeDefined();
    expect(Number(mutasi?.qtyDasar)).toBe(50);
  });

  it("Prinsip 5.2 #5: Rekonsiliasi memastikan stok_cache sama dengan SUM(qty_dasar) mutasi", async () => {
    const rec = await reconcileStock(testProductId, ownerId);
    expect(rec.selisihDitemukan).toBe(false);
    expect(rec.stokCacheLama).toBe(50);
    expect(rec.stokMutasiNyata).toBe(50);
  });

  it("User Story E3 & E4: Status warna dan Perlu Belanja", async () => {
    // Saat stok 50 kg dan min 10 kg -> Stok Aman, tidak masuk low stock
    let lowList = await getLowStockProducts();
    let found = lowList.find((x) => x.id === testProductId);
    expect(found).toBeUndefined();

    // Kurangi stok dengan penyesuaian manual agar stok tinggal 5 kg (dibawah stok min 10)
    await adjustStockManual(
      {
        produkId: testProductId,
        qtyDasar: -45, // 50 - 45 = 5 kg
        catatan: "Uji coba stok menipis",
      },
      { id: ownerId, role: "OWNER" }
    );

    // Sekarang harus masuk daftar Perlu Belanja dengan status MENIPIS (kuning)
    lowList = await getLowStockProducts();
    found = lowList.find((x) => x.id === testProductId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("MENIPIS");
    expect(found?.warna).toBe("yellow");
    expect(found?.stokSaatIni).toBe(5);
  });
});

