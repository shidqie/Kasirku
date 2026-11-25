import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createMember, bayarKasbon, adjustMemberDebt, reconcileMemberDebt } from "@/services/member.service";
import { createProduct } from "@/services/product.service";
import { catatBarangMasuk } from "@/services/stock.service";
import { checkout } from "@/services/transaction.service";

describe("Tahap 5: Member & Kasbon Ledger Integration Tests", () => {
  let ownerId: string;
  let testMemberId: string;
  let testProductId: string;
  let defaultSatuanId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // 1. Buat Member dengan Batas Kasbon Rp 100.000
    const m = await createMember(
      {
        nama: "Ibu Nurul Kasbon Uji",
        telepon: "081234567899",
        alamat: "Gang Samping Toko",
        batasKasbon: 100000,
        saldoAwal: 0,
      },
      ownerId
    );
    testMemberId = m.id;

    // 2. Buat Produk untuk belanja kasbon
    const prod = await createProduct(
      {
        nama: "Minyak Goreng 2L Uji",
        satuanDasar: "pouch",
        stokMinimum: 2,
        satuanList: [
          { namaSatuan: "pouch", faktorKeDasar: 1, hargaJual: 35000, hargaBeli: 31000, isDefault: true },
        ],
      },
      ownerId
    );
    testProductId = prod.id;
    defaultSatuanId = prod.satuanProduk[0].id;

    // Restock minyak
    await catatBarangMasuk(
      {
        items: [
          {
            produkId: testProductId,
            namaSatuan: "pouch",
            faktorKeDasar: 1,
            qty: 10,
            hargaBeliPerSatuan: 31000,
          },
        ],
      },
      ownerId
    );
  });

  afterAll(async () => {
    if (testMemberId) {
      await prisma.kasbonMutasi.deleteMany({ where: { memberId: testMemberId } });
      await prisma.kasbonPembayaran.deleteMany({ where: { memberId: testMemberId } });
      await prisma.transaksi.deleteMany({ where: { memberId: testMemberId } });
      await prisma.member.deleteMany({ where: { id: testMemberId } });
    }
    if (testProductId) {
      await prisma.stokMutasi.deleteMany({ where: { produkId: testProductId } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
  });

  it("User Story D1: Checkout metode KASBON otomatis menambah saldo utang member via mutasi KASBON", async () => {
    const key = crypto.randomUUID();

    // Belanja 1 pouch minyak @ 35.000
    const res = await checkout(
      {
        idempotencyKey: key,
        memberId: testMemberId,
        items: [
          {
            produkId: testProductId,
            satuanProdukId: defaultSatuanId,
            qty: 1,
          },
        ],
        diskon: 0,
        metodePembayaran: "KASBON",
      },
      { id: ownerId, role: "OWNER" }
    );

    expect(res.transaksi).toBeDefined();
    expect(res.transaksi?.total).toBe(35000);

    // Cek saldo utang member sekarang 35.000
    const m = await prisma.member.findUnique({ where: { id: testMemberId } });
    expect(m?.saldoUtangCache).toBe(35000);

    // Cek ada mutasi kasbon append-only
    const mutasi = await prisma.kasbonMutasi.findFirst({
      where: { memberId: testMemberId, tipe: "KASBON" },
    });
    expect(mutasi).toBeDefined();
    expect(mutasi?.jumlah).toBe(35000);
  });

  it("User Story D2: Transaksi kasbon ditolak jika total utang melebihi batas kasbon member", async () => {
    const key = crypto.randomUUID();

    // Member sudah punya utang 35.000, limit 100.000. Sisa limit: 65.000.
    // Coba belanja 2 pouch minyak @ 35.000 = 70.000. Total utang jadi 105.000 > 100.000.
    await expect(
      checkout(
        {
          idempotencyKey: key,
          memberId: testMemberId,
          items: [
            {
              produkId: testProductId,
              satuanProdukId: defaultSatuanId,
              qty: 2, // 70.000
            },
          ],
          diskon: 0,
          metodePembayaran: "KASBON",
        },
        { id: ownerId, role: "OWNER" }
      )
    ).rejects.toThrow("melebihi batas kasbon member");
  });

  it("User Story D4: Staff menerima pembayaran kasbon sebagian", async () => {
    // Utang saat ini: 35.000. Bayar sebagian: 15.000 tunai (uang diterima 20.000).
    const bayarRes = await bayarKasbon(
      testMemberId,
      {
        jumlah: 15000,
        metode: "TUNAI",
        uangDiterima: 20000,
      },
      ownerId
    );

    expect(bayarRes.bukti).toBeDefined();
    expect(bayarRes.bukti.nomorBukti).toMatch(/^BYR-\d{8}-\d{4}$/);
    expect(bayarRes.kembalian).toBe(5000); // 20000 - 15000
    expect(bayarRes.member.saldoUtangCache).toBe(20000); // 35000 - 15000 = 20000

    // Cek mutasi PEMBAYARAN bertanda negatif (-15.000)
    const mutasiBayar = await prisma.kasbonMutasi.findFirst({
      where: { memberId: testMemberId, tipe: "PEMBAYARAN" },
    });
    expect(mutasiBayar?.jumlah).toBe(-15000);
  });

  it("User Story D7: Owner dapat mengoreksi saldo kasbon dengan mutasi PENYESUAIAN", async () => {
    // Saldo utang saat ini 20.000. Koreksi -5.000 -> sisa utang jadi 15.000.
    const adjRes = await adjustMemberDebt(
      testMemberId,
      { jumlah: -5000, catatan: "Diskon khusus tetangga dari owner" },
      ownerId
    );

    expect(adjRes.member.saldoUtangCache).toBe(15000);

    const mutasiAdj = await prisma.kasbonMutasi.findFirst({
      where: { memberId: testMemberId, tipe: "PENYESUAIAN" },
    });
    expect(mutasiAdj?.jumlah).toBe(-5000);
  });

  it("Prinsip 5.2 #5: Rekonsiliasi kasbon memverifikasi saldo_utang_cache sama persis dengan SUM(jumlah) mutasi", async () => {
    const rec = await reconcileMemberDebt(testMemberId, ownerId);
    expect(rec.selisihDitemukan).toBe(false);
    expect(rec.saldoCacheLama).toBe(15000);
    expect(rec.saldoMutasiNyata).toBe(15000);
  });
});

