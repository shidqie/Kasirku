import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  STORE_ASSIGNABLE_ROLES,
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
} from "@/lib/auth/permissions";
import { createUserSchema, updateUserSchema } from "@/lib/validations/auth.schema";
import { updateUser } from "@/services/auth.service";
import { adjustStockManual, catatBarangMasuk } from "@/services/stock.service";
import { createProduct } from "@/services/product.service";
import {
  approveProposal,
  createProposal,
  listProposals,
  rejectProposal,
} from "@/services/proposal.service";

describe("Revisi RBAC 3 Role Utama (Pemilik, Kepala Toko, Kasir)", () => {
  const suffix = Date.now().toString(36);
  let ownerId: string;
  let kepalaId: string;
  let kasirId: string;
  let kasirLainId: string;
  let legacyGudangId: string;

  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdProposalIds: string[] = [];

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!owner) throw new Error("Akun OWNER seed tidak ditemukan untuk pengujian");
    ownerId = owner.id;

    const kepala = await prisma.user.create({
      data: {
        nama: "Kepala Toko Uji",
        username: `kepala_uji_${suffix}`,
        passwordHash: "hash",
        role: "KEPALA_TOKO",
        permissions: [],
        aktif: true,
      },
    });
    kepalaId = kepala.id;
    createdUserIds.push(kepala.id);

    const kasir = await prisma.user.create({
      data: {
        nama: "Kasir Uji",
        username: `kasir_uji_${suffix}`,
        passwordHash: "hash",
        role: "STAFF_KASIR",
        permissions: [],
        aktif: true,
      },
    });
    kasirId = kasir.id;
    createdUserIds.push(kasir.id);

    const kasirLain = await prisma.user.create({
      data: {
        nama: "Kasir Lain Uji",
        username: `kasir_lain_${suffix}`,
        passwordHash: "hash",
        role: "STAFF_KASIR",
        permissions: [],
        aktif: true,
      },
    });
    kasirLainId = kasirLain.id;
    createdUserIds.push(kasirLain.id);

    const legacyGudang = await prisma.user.create({
      data: {
        nama: "Petugas Gudang Lama Uji",
        username: `gudang_lama_${suffix}`,
        passwordHash: "hash",
        role: "STAFF_GUDANG",
        permissions: ["produk:cost", "stok:view"],
        aktif: true,
      },
    });
    legacyGudangId = legacyGudang.id;
    createdUserIds.push(legacyGudang.id);

    await prisma.activityLog.create({
      data: {
        userId: legacyGudangId,
        role: "STAFF_GUDANG",
        aksi: "AKTIVITAS_LAMA",
        entitas: "User",
        entitasId: legacyGudangId,
      },
    });
  });

  afterAll(async () => {
    const extraProds = await prisma.produk.findMany({
      where: {
        OR: [
          { id: { in: createdProductIds } },
          { nama: { contains: suffix } },
        ],
      },
      select: { id: true },
    });
    const allProdIds = Array.from(new Set([...createdProductIds, ...extraProds.map((p) => p.id)]));

    await prisma.pengajuanPerubahan.deleteMany({
      where: {
        OR: [
          ...(createdProposalIds.length > 0 ? [{ id: { in: createdProposalIds } }] : []),
          { namaProduk: { contains: suffix } },
        ],
      },
    });
    if (allProdIds.length > 0) {
      await prisma.riwayatHarga.deleteMany({ where: { produkId: { in: allProdIds } } });
      await prisma.stokMutasi.deleteMany({ where: { produkId: { in: allProdIds } } });
      await prisma.barangMasukItem.deleteMany({ where: { produkId: { in: allProdIds } } });
      await prisma.productBarcode.deleteMany({ where: { productId: { in: allProdIds } } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: { in: allProdIds } } });
      await prisma.produk.deleteMany({ where: { id: { in: allProdIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.activityLog.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.activityLog.deleteMany({ where: { entitasId: { in: createdUserIds } } });
      await prisma.barangMasuk.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("1. Sistem hanya menyediakan 3 role utama dan menolak pembuatan/update ke STAFF_GUDANG", () => {
    expect([...STORE_ASSIGNABLE_ROLES]).toEqual(["OWNER", "KEPALA_TOKO", "STAFF_KASIR"]);

    const invalidCreate = createUserSchema.safeParse({
      nama: "Test Gudang",
      username: "testgudang",
      password: "password123",
      role: "STAFF_GUDANG",
    });
    expect(invalidCreate.success).toBe(false);

    const invalidUpdate = updateUserSchema.safeParse({
      role: "STAFF_GUDANG",
    });
    expect(invalidUpdate.success).toBe(false);

    // Role legacy STAFF_GUDANG tidak punya izin aktif (termasuk izin ekstra lama) sampai dimigrasi
    expect(resolvePermissions("STAFF_GUDANG", ["produk:cost", "stok:view"])).toEqual([]);
  });

  it("2. Pemisahan hak akses Pemilik, Kepala Toko (operasional & persediaan), dan Kasir", () => {
    const ownerUser = { role: "OWNER", permissions: [] };
    expect(hasPermission(ownerUser, "produk:cost")).toBe(true);
    expect(hasPermission(ownerUser, "reports:profit")).toBe(true);
    expect(hasPermission(ownerUser, "users:manage")).toBe(true);
    expect(hasPermission(ownerUser, "pengajuan:approve")).toBe(true);

    const kepalaToko = { role: "KEPALA_TOKO", permissions: [] };
    // Punya penuh kendali produk, persediaan (ex-gudang), pengawasan, dan approval pengajuan
    expect(hasPermission(kepalaToko, "produk:manage")).toBe(true);
    expect(hasPermission(kepalaToko, "produk:price")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:view")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:barang_masuk")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:barang_keluar")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:adjust")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:opname_submit")).toBe(true);
    expect(hasPermission(kepalaToko, "stok:opname_approve")).toBe(true);
    expect(hasPermission(kepalaToko, "pengajuan:approve")).toBe(true);
    // Tanpa izin khusus, Kepala Toko TIDAK bisa lihat harga beli / profit / kelola user
    expect(hasPermission(kepalaToko, "produk:cost")).toBe(false);
    expect(hasPermission(kepalaToko, "reports:profit")).toBe(false);
    expect(hasPermission(kepalaToko, "users:manage")).toBe(false);
    // Jika diberi izin khusus oleh Pemilik, Kepala Toko bisa melihat harga beli & profit
    const kepalaWithCost = { role: "KEPALA_TOKO", permissions: ["produk:cost", "reports:profit"] };
    expect(hasPermission(kepalaWithCost, "produk:cost")).toBe(true);
    expect(hasPermission(kepalaWithCost, "reports:profit")).toBe(true);

    const kasir = { role: "STAFF_KASIR", permissions: [] };
    expect(hasPermission(kasir, "kasir:checkout")).toBe(true);
    expect(hasPermission(kasir, "produk:view")).toBe(true);
    expect(hasPermission(kasir, "pengajuan:create")).toBe(true);
    expect(hasAnyPermission(kasir, ["produk:manage", "produk:price", "produk:cost", "reports:profit"])).toBe(false);
  });

  it("3. Kepala Toko dapat melakukan penyesuaian stok tanpa PIN Owner, Kasir tetap ditolak", async () => {
    const prod = await createProduct(
      {
        nama: `Produk Stok RBAC ${suffix}`,
        satuanDasar: "pcs",
        stokMinimum: 2,
        satuanList: [
          { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 5000, hargaBeli: 3500, isDefault: true },
        ],
      },
      ownerId
    );
    createdProductIds.push(prod.id);

    await catatBarangMasuk(
      {
        items: [
          {
            produkId: prod.id,
            namaSatuan: "pcs",
            faktorKeDasar: 1,
            qty: 10,
            hargaBeliPerSatuan: 3500,
          },
        ],
      },
      kepalaId
    );

    // Kepala Toko adjust stok langsung tanpa pinOwner
    const adj = await adjustStockManual(
      {
        produkId: prod.id,
        qtyDasar: -2,
        catatan: "Barang rusak kemasan uji RBAC",
      },
      { id: kepalaId, role: "KEPALA_TOKO" }
    );
    expect(Number(adj.produk.stokCache)).toBe(8);

    // Kasir tanpa PIN Owner ditolak
    await expect(
      adjustStockManual(
        {
          produkId: prod.id,
          qtyDasar: 1,
          catatan: "Coba ubah langsung",
        },
        { id: kasirId, role: "STAFF_KASIR" }
      )
    ).rejects.toThrow();
  });

  it(
    "4a. Kasir mengajukan produk baru dan disetujui Kepala Toko hingga masuk katalog",
    async () => {
      const prodProposal = await createProposal(
        {
          tipe: "PRODUK_BARU",
          catatanPengaju: "Barang titipan baru di etalase",
          payload: {
            nama: `Minuman Ajuan Kasir ${suffix}`,
            satuanDasar: "botol",
            stokMinimum: 5,
            barcode: `899000${suffix.slice(-5)}`,
            satuanList: [
              { namaSatuan: "botol", faktorKeDasar: 1, hargaJual: 4000, isDefault: true },
            ],
          },
        },
        { id: kasirId, role: "STAFF_KASIR" }
      );
      createdProposalIds.push(prodProposal.id);
      expect(prodProposal.status).toBe("MENUNGGU");

      const beforeApprove = await prisma.produk.findFirst({
        where: { nama: `Minuman Ajuan Kasir ${suffix}` },
      });
      expect(beforeApprove).toBeNull();

      const allForKepala = await listProposals({
        status: "MENUNGGU",
        canReview: true,
        userId: kepalaId,
      });
      expect(allForKepala.proposals.some((p) => p.id === prodProposal.id)).toBe(true);

      const listKasirLain = await listProposals({
        status: "ALL",
        canReview: false,
        userId: kasirLainId,
      });
      expect(listKasirLain.proposals.some((p) => p.id === prodProposal.id)).toBe(false);

      const approvedNew = await approveProposal(
        prodProposal.id,
        { id: kepalaId, role: "KEPALA_TOKO" },
        "Oke masuk katalog"
      );
      expect(approvedNew.status).toBe("DISETUJUI");
      expect(approvedNew.produkId).toBeTruthy();
      createdProductIds.push(approvedNew.produkId!);
    },
    20000
  );

  it(
    "4b. Kasir mengajukan perubahan harga, disetujui/ditolak Kepala Toko tanpa menghapus harga beli",
    async () => {
      const targetWithCost = await createProduct(
        {
          nama: `Snack Harga Uji ${suffix}`,
          satuanDasar: "pcs",
          stokMinimum: 3,
          satuanList: [
            { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 2000, hargaBeli: 1500, isDefault: true },
          ],
        },
        ownerId
      );
      createdProductIds.push(targetWithCost.id);
      const unit = targetWithCost.satuanProduk[0];

      // Kasir ajukan ubah harga jual pcs dari 2000 -> 2500
      const priceProposal = await createProposal(
        {
          tipe: "UBAH_HARGA",
          catatanPengaju: "Harga modal supplier naik menurut nota",
          payload: {
            produkId: targetWithCost.id,
            perubahan: [
              {
                satuanId: unit.id,
                namaSatuan: "pcs",
                faktorKeDasar: 1,
                hargaBaru: 2500,
                isDefault: true,
              },
            ],
          },
        },
        { id: kasirId, role: "STAFF_KASIR" }
      );
      createdProposalIds.push(priceProposal.id);
      expect((priceProposal.payloadJson as any).perubahan[0].hargaLama).toBe(2000);

      await approveProposal(
        priceProposal.id,
        { id: kepalaId, role: "KEPALA_TOKO" },
        "Disetujui harga baru 2.500"
      );

      const refreshed = await prisma.produk.findUnique({
        where: { id: targetWithCost.id },
        include: { satuanProduk: true },
      });
      expect(refreshed?.satuanProduk[0].hargaJual).toBe(2500);
      // KRITIS: hargaBeli lama 1500 HARUS TETAP TERJAGA (tidak menjadi 0)
      expect(refreshed?.satuanProduk[0].hargaBeli).toBe(1500);

      // Riwayat perubahan harga jual tercatat ke user peninjau (Kepala Toko)
      const history = await prisma.riwayatHarga.findFirst({
        where: { produkId: targetWithCost.id, jenisPerubahan: "HARGA_JUAL" },
        orderBy: { dibuatPada: "desc" },
      });
      expect(history?.hargaLama).toBe(2000);
      expect(history?.hargaBaru).toBe(2500);
      expect(history?.userId).toBe(kepalaId);

      // Penolakan pengajuan menjaga harga tetap 2500
      const rejectedProposal = await createProposal(
        {
          tipe: "UBAH_HARGA",
          payload: {
            produkId: targetWithCost.id,
            perubahan: [
              {
                satuanId: refreshed!.satuanProduk[0].id,
                namaSatuan: "pcs",
                faktorKeDasar: 1,
                hargaBaru: 9900,
              },
            ],
          },
        },
        { id: kasirId, role: "STAFF_KASIR" }
      );
      createdProposalIds.push(rejectedProposal.id);

      const rejected = await rejectProposal(
        rejectedProposal.id,
        { id: ownerId, role: "OWNER" },
        "Terlalu mahal"
      );
      expect(rejected.status).toBe("DITOLAK");
      expect(rejected.catatanPeninjau).toBe("Terlalu mahal");

      const afterReject = await prisma.produk.findUnique({
        where: { id: targetWithCost.id },
        include: { satuanProduk: true },
      });
      expect(afterReject?.satuanProduk[0].hargaJual).toBe(2500);
    },
    20000
  );

  it("5. Migrasi akun Petugas Gudang lama oleh Pemilik tetap mempertahankan ID & riwayat aktivitas lama", async () => {
    const migrated = await updateUser(
      legacyGudangId,
      { role: "KEPALA_TOKO" },
      ownerId
    );
    expect(migrated.id).toBe(legacyGudangId);
    expect(migrated.role).toBe("KEPALA_TOKO");

    // Pastikan riwayat aktivitas lama tetap tersimpan utuh
    const oldLog = await prisma.activityLog.findFirst({
      where: { userId: legacyGudangId, aksi: "AKTIVITAS_LAMA" },
    });
    expect(oldLog).not.toBeNull();
    expect(oldLog?.role).toBe("STAFF_GUDANG");
  });
});
