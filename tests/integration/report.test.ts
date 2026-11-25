import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "@/services/product.service";
import { catatBarangMasuk } from "@/services/stock.service";
import { checkout, voidTransaction } from "@/services/transaction.service";
import { createMember } from "@/services/member.service";
import {
  getSalesReport,
  getProfitReport,
  getDebtReport,
  getVoidReport,
  getDashboardSummary,
} from "@/services/report.service";

describe("Tahap 7: Laporan & Dashboard Owner Integration Tests", () => {
  let ownerId: string;
  let testProductId: string;
  let testSatuanId: string;
  let testMemberId: string;
  let finishedTrxId: string;
  let voidedTrxId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // 1. Buat member
    const member = await createMember(
      {
        nama: "Ibu Nur Laporan",
        telepon: "081987654321",
        batasKasbon: 500000,
      },
      ownerId
    );
    testMemberId = member.id;

    // 2. Buat produk dengan HPP 10.000 dan Jual 15.000
    const prod = await createProduct(
      {
        nama: "Kopi Sachet Laporan",
        satuanDasar: "renceng",
        stokMinimum: 5,
        satuanList: [
          { namaSatuan: "renceng", faktorKeDasar: 1, hargaJual: 15000, hargaBeli: 10000, isDefault: true },
        ],
      },
      ownerId
    );
    testProductId = prod.id;
    testSatuanId = prod.satuanProduk[0].id;

    // 3. Catat stok masuk
    await catatBarangMasuk(
      {
        items: [
          {
            produkId: testProductId,
            namaSatuan: "renceng",
            faktorKeDasar: 1,
            qty: 50,
            hargaBeliPerSatuan: 10000,
          },
        ],
      },
      ownerId
    );

    // 4. Buat 1 transaksi sukses tunai (2 renceng = 30.000, diskon 2.000 = 28.000)
    // HPP = 2 x 10.000 = 20.000. Laba = 30.000 - 20.000 - 2.000 = 8.000.
    const trx1 = await checkout(
      {
        idempotencyKey: crypto.randomUUID(),
        items: [{ produkId: testProductId, satuanProdukId: testSatuanId, qty: 2 }],
        diskon: 2000,
        metodePembayaran: "TUNAI",
        uangDiterima: 30000,
      },
      { id: ownerId, role: "OWNER" }
    );
    finishedTrxId = trx1.transaksi!.id;

    // 5. Buat 1 transaksi kasbon (1 renceng = 15.000) lalu void
    const trx2 = await checkout(
      {
        idempotencyKey: crypto.randomUUID(),
        items: [{ produkId: testProductId, satuanProdukId: testSatuanId, qty: 1 }],
        diskon: 0,
        metodePembayaran: "KASBON",
        memberId: testMemberId,
      },
      { id: ownerId, role: "OWNER" }
    );
    voidedTrxId = trx2.transaksi!.id;

    await voidTransaction(
      voidedTrxId,
      "Salah input varian saat pengujian laporan",
      { id: ownerId, role: "OWNER" }
    );
  });

  afterAll(async () => {
    if (voidedTrxId) {
      await prisma.kasbonMutasi.deleteMany({ where: { transaksiId: voidedTrxId } });
      await prisma.pembayaran.deleteMany({ where: { transaksiId: voidedTrxId } });
      await prisma.transaksiItem.deleteMany({ where: { transaksiId: voidedTrxId } });
      await prisma.transaksi.deleteMany({ where: { id: voidedTrxId } });
    }
    if (finishedTrxId) {
      await prisma.pembayaran.deleteMany({ where: { transaksiId: finishedTrxId } });
      await prisma.transaksiItem.deleteMany({ where: { transaksiId: finishedTrxId } });
      await prisma.transaksi.deleteMany({ where: { id: finishedTrxId } });
    }
    if (testProductId) {
      await prisma.stokMutasi.deleteMany({ where: { produkId: testProductId } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
    if (testMemberId) {
      await prisma.kasbonMutasi.deleteMany({ where: { memberId: testMemberId } });
      await prisma.member.deleteMany({ where: { id: testMemberId } });
    }
  });

  it("User Story F1: getSalesReport mengakumulasi penjualan, omzet, diskon, dan metode bayar", async () => {
    const report = await getSalesReport();
    expect(report.totalTransaksi).toBeGreaterThanOrEqual(1);
    expect(report.totalOmzet).toBeGreaterThanOrEqual(28000);
    expect(report.totalDiskon).toBeGreaterThanOrEqual(2000);
    expect(report.perMetode["TUNAI"].total).toBeGreaterThanOrEqual(28000);
    expect(report.perKasir.length).toBeGreaterThanOrEqual(1);
  });

  it("User Story F2: getProfitReport menghitung laba kotor akurat dari hargaBeliSnapshot", async () => {
    const report = await getProfitReport();
    expect(report.totalPenjualanKotor).toBeGreaterThanOrEqual(30000);
    expect(report.totalHPP).toBeGreaterThanOrEqual(20000);
    expect(report.labaKotor).toBeGreaterThanOrEqual(8000);
    expect(report.marginPersen).toBeGreaterThan(0);
  });

  it("User Story F3: getDebtReport mengurutkan utang terbesar dan mendeteksi umur piutang", async () => {
    // Tambah kasbon langsung untuk verifikasi umur utang
    await prisma.kasbonMutasi.create({
      data: {
        memberId: testMemberId,
        tipe: "KASBON",
        jumlah: 45000,
        catatan: "Kasbon uji laporan",
        userId: ownerId,
        dibuatPada: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 hari lalu
      },
    });
    await prisma.member.update({
      where: { id: testMemberId },
      data: { saldoUtangCache: 45000 },
    });

    const debtReport = await getDebtReport();
    expect(debtReport.totalPiutang).toBeGreaterThanOrEqual(45000);
    const foundMember = debtReport.members.find((m) => m.id === testMemberId);
    expect(foundMember).toBeDefined();
    expect(foundMember?.saldoUtangCache).toBe(45000);
    expect(foundMember?.isOverdue).toBe(true); // > 30 hari
  });

  it("User Story F5: getVoidReport merekap transaksi yang dibatalkan beserta alasannya", async () => {
    const voidReport = await getVoidReport();
    expect(voidReport.count).toBeGreaterThanOrEqual(1);
    const found = voidReport.voids.find((v) => v.id === voidedTrxId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("BATAL");
    expect(found?.alasanBatal).toBe("Salah input varian saat pengujian laporan");
  });

  it("User Story F6: getDashboardSummary merangkum seluruh metrik KPI toko", async () => {
    const summary = await getDashboardSummary();
    expect(summary.omzetHariIni).toBeGreaterThanOrEqual(28000);
    expect(summary.transaksiHariIni).toBeGreaterThanOrEqual(1);
    expect(summary.omzetBulanIni).toBeGreaterThanOrEqual(28000);
    expect(summary.totalPiutangKasbon).toBeGreaterThanOrEqual(45000);
    expect(summary.recentTrx.length).toBeGreaterThanOrEqual(1);
  });
});
