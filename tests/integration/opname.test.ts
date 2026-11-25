import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "@/services/product.service";
import { catatBarangMasuk } from "@/services/stock.service";
import { createOpname, approveOpname, rejectOpname } from "@/services/opname.service";

describe("Tahap 6: Stok Opname dengan Persetujuan Integration Tests", () => {
  let ownerId: string;
  let testProductId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // Buat produk dengan stok awal 50 pcs
    const prod = await createProduct(
      {
        nama: "Kecap Manis Botol Opname Uji",
        satuanDasar: "botol",
        stokMinimum: 5,
        satuanList: [
          { namaSatuan: "botol", faktorKeDasar: 1, hargaJual: 10000, hargaBeli: 8000, isDefault: true },
        ],
      },
      ownerId
    );
    testProductId = prod.id;

    // Catat stok masuk 50 botol
    await catatBarangMasuk(
      {
        items: [
          {
            produkId: testProductId,
            namaSatuan: "botol",
            faktorKeDasar: 1,
            qty: 50,
            hargaBeliPerSatuan: 8000,
          },
        ],
      },
      ownerId
    );
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.stokOpnameItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.stokMutasi.deleteMany({ where: { produkId: testProductId } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: testProductId } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
  });

  it("User Story E5: Pengajuan opname menghitung selisih tetapi stok fisik belum berubah sebelum persetujuan", async () => {
    // Hitung fisik ternyata hanya ada 45 botol (selisih -5 botol terhadap stok sistem 50)
    const op = await createOpname(
      {
        catatan: "Opname mingguan rak bumbu",
        items: [{ produkId: testProductId, stokFisik: 45 }],
      },
      ownerId
    );

    expect(op.opname.status).toBe("MENUNGGU");
    expect(op.items[0].stokSistem.toNumber()).toBe(50);
    expect(op.items[0].stokFisik.toNumber()).toBe(45);
    expect(op.items[0].selisih.toNumber()).toBe(-5);
    expect(op.items[0].nilaiSelisih).toBe(-40000); // -5 botol x 8000

    // KRITIS: Stok di produk HARUS TETAP 50 botol (belum berubah)
    const p = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(p?.stokCache)).toBe(50);

    // Cek belum ada mutasi bertipe OPNAME
    const mutasi = await prisma.stokMutasi.findFirst({
      where: { produkId: testProductId, tipe: "OPNAME" },
    });
    expect(mutasi).toBeNull();
  });

  it("User Story E6: Owner menyetujui opname, mutasi OPNAME ditulis, dan stok cache menyesuaikan", async () => {
    const opnameMenunggu = await prisma.stokOpname.findFirst({
      where: { status: "MENUNGGU" },
    });
    expect(opnameMenunggu).toBeDefined();

    const approved = await approveOpname(opnameMenunggu!.id, ownerId);
    expect(approved.status).toBe("DISETUJUI");

    // Sekarang stok harus berubah menjadi 45 botol
    const p = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(p?.stokCache)).toBe(45);

    // Mutasi OPNAME harus tercatat dengan qtyDasar -5
    const mutasi = await prisma.stokMutasi.findFirst({
      where: { produkId: testProductId, tipe: "OPNAME" },
    });
    expect(mutasi).toBeDefined();
    expect(Number(mutasi?.qtyDasar)).toBe(-5);
  });

  it("User Story E6: Owner menolak opname, stok tetap utuh tanpa mutasi", async () => {
    // Buat opname baru dengan fisik 30 botol
    const opBaru = await createOpname(
      {
        catatan: "Opname keliru",
        items: [{ produkId: testProductId, stokFisik: 30 }],
      },
      ownerId
    );

    // Owner tolak
    const rejected = await rejectOpname(opBaru.opname.id, "Penghitungan salah rak", ownerId);
    expect(rejected.status).toBe("DITOLAK");

    // Stok harus tetap 45 botol
    const p = await prisma.produk.findUnique({ where: { id: testProductId } });
    expect(Number(p?.stokCache)).toBe(45);
  });
});

