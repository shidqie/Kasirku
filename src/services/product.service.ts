import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { Prisma } from "@prisma/client";

export interface CreateProductInput {
  nama: string;
  kategoriId?: string | null;
  barcode?: string | null;
  satuanDasar: string;
  stokMinimum: number;
  stokKosong?: number;
  satuanList: {
    namaSatuan: string;
    faktorKeDasar: number;
    hargaJual: number;
    hargaBeli: number;
    isDefault?: boolean;
  }[];
}

export interface UpdateProductInput {
  nama?: string;
  kategoriId?: string | null;
  barcode?: string | null;
  satuanDasar?: string;
  stokMinimum?: number;
  stokKosong?: number;
  aktif?: boolean;
  satuanList?: {
    id?: string;
    namaSatuan: string;
    faktorKeDasar: number;
    hargaJual: number;
    hargaBeli: number;
    isDefault?: boolean;
  }[];
}

// 1. Kategori Services
export async function getCategories() {
  return prisma.kategori.findMany({
    orderBy: { nama: "asc" },
    include: {
      _count: {
        select: { produk: true },
      },
    },
  });
}

export async function createCategory(nama: string, userId: string, ip?: string) {
  const existing = await prisma.kategori.findUnique({ where: { nama } });
  if (existing) throw new Error(`Kategori '${nama}' sudah ada`);

  const category = await prisma.kategori.create({ data: { nama } });
  await logActivity({
    userId,
    role: "OWNER",
    aksi: "BUAT_KATEGORI",
    entitas: "Kategori",
    entitasId: category.id,
    sesudahJson: { nama },
    ip,
  });
  return category;
}

export async function updateCategory(id: string, nama: string, userId: string, ip?: string) {
  const sebelum = await prisma.kategori.findUnique({ where: { id } });
  if (!sebelum) throw new Error("Kategori tidak ditemukan");

  const category = await prisma.kategori.update({
    where: { id },
    data: { nama },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UBAH_KATEGORI",
    entitas: "Kategori",
    entitasId: id,
    sebelumJson: { nama: sebelum.nama },
    sesudahJson: { nama },
    ip,
  });
  return category;
}

export async function deleteCategory(id: string, userId: string, ip?: string) {
  const count = await prisma.produk.count({ where: { kategoriId: id } });
  if (count > 0) {
    throw new Error(`Tidak dapat menghapus kategori karena masih digunakan oleh ${count} produk`);
  }

  const deleted = await prisma.kategori.delete({ where: { id } });
  await logActivity({
    userId,
    role: "OWNER",
    aksi: "HAPUS_KATEGORI",
    entitas: "Kategori",
    entitasId: id,
    sebelumJson: { nama: deleted.nama },
    ip,
  });
  return deleted;
}

// 2. Produk Services
export async function getProducts(params?: {
  search?: string;
  kategoriId?: string;
  aktifOnly?: boolean;
}) {
  const where: Prisma.ProdukWhereInput = {};

  if (params?.aktifOnly !== false) {
    where.aktif = true;
  }

  if (params?.kategoriId) {
    where.kategoriId = params.kategoriId;
  }

  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { nama: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await prisma.produk.findMany({
    where,
    orderBy: { nama: "asc" },
    include: {
      kategori: true,
      satuanProduk: {
        orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
      },
    },
  });

  // Tandai produk yang harganya naik dalam 7 hari terakhir (dari HARGA_NAIK atau UBAH_PRODUK)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPriceLogs = await prisma.activityLog.findMany({
    where: {
      aksi: { in: ["HARGA_NAIK", "UBAH_PRODUK"] },
      dibuatPada: { gte: sevenDaysAgo },
    },
    select: {
      aksi: true,
      entitasId: true,
      sebelumJson: true,
      sesudahJson: true,
    },
    orderBy: { dibuatPada: "desc" },
    take: 200,
  });

  const hargaNaikIds = new Set<string>();
  for (const log of recentPriceLogs) {
    const sesudah = log.sesudahJson as Record<string, any> | null;
    if (log.aksi === "HARGA_NAIK") {
      if (Array.isArray(sesudah?.produkIds)) {
        for (const id of sesudah.produkIds) {
          if (typeof id === "string") hargaNaikIds.add(id);
        }
      } else if (log.entitasId && log.entitasId !== "ALL") {
        hargaNaikIds.add(log.entitasId);
      }
    } else if (log.aksi === "UBAH_PRODUK" && log.entitasId) {
      const sebelum = log.sebelumJson as Record<string, any> | null;
      const beforeList: Array<{ satuan?: string; jual?: number }> = Array.isArray(sebelum?.satuanList)
        ? sebelum.satuanList
        : [];
      const afterList: Array<{ satuan?: string; jual?: number }> = Array.isArray(sesudah?.satuanList)
        ? sesudah.satuanList
        : [];
      const raised = afterList.some((a, i) => {
        const prev = beforeList.find((b) => b.satuan === a.satuan) || beforeList[i];
        return typeof a.jual === "number" && typeof prev?.jual === "number" && a.jual > prev.jual;
      });
      if (raised) hargaNaikIds.add(log.entitasId);
    }
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  return products.map((p) => {
    const createdMs = p.createdAt.getTime();
    const updatedMs = p.updatedAt.getTime();
    const isBaru = nowMs - createdMs <= sevenDaysMs;
    const isDiperbarui = !isBaru && nowMs - updatedMs <= sevenDaysMs && updatedMs - createdMs > 60_000;
    return {
      ...p,
      hargaNaik: hargaNaikIds.has(p.id),
      isBaru,
      isDiperbarui,
    };
  });
}

export async function getProductById(id: string) {
  return prisma.produk.findUnique({
    where: { id },
    include: {
      kategori: true,
      satuanProduk: {
        orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
      },
    },
  });
}

export async function createProduct(input: CreateProductInput, userId: string, ip?: string) {
  if (input.barcode) {
    const existingBarcode = await prisma.produk.findUnique({
      where: { barcode: input.barcode },
    });
    if (existingBarcode) {
      throw new Error(`Barcode '${input.barcode}' sudah digunakan oleh produk lain`);
    }
  }

  // Pastikan setidaknya satu satuan adalah default
  const hasDefault = input.satuanList.some((s) => s.isDefault);
  const unitsToCreate = input.satuanList.map((s, idx) => ({
    namaSatuan: s.namaSatuan,
    faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
    hargaJual: s.hargaJual,
    hargaBeli: s.hargaBeli,
    isDefault: hasDefault ? !!s.isDefault : idx === 0,
  }));

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.produk.create({
      data: {
        nama: input.nama,
        kategoriId: input.kategoriId || null,
        barcode: input.barcode ? input.barcode.trim() : null,
        satuanDasar: input.satuanDasar,
        stokMinimum: new Prisma.Decimal(input.stokMinimum),
        stokCache: new Prisma.Decimal(0),
        stokKosong: new Prisma.Decimal(input.stokKosong ?? 0),
        satuanProduk: {
          create: unitsToCreate,
        },
      },
      include: {
        satuanProduk: true,
        kategori: true,
      },
    });

    return p;
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "BUAT_PRODUK",
    entitas: "Produk",
    entitasId: product.id,
    sesudahJson: {
      nama: product.nama,
      barcode: product.barcode,
      satuanDasar: product.satuanDasar,
      satuan: unitsToCreate,
    },
    ip,
  });

  return product;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  userId: string,
  ip?: string
) {
  const sebelum = await prisma.produk.findUnique({
    where: { id },
    include: { satuanProduk: true },
  });

  if (!sebelum) throw new Error("Produk tidak ditemukan");

  if (input.barcode && input.barcode !== sebelum.barcode) {
    const existing = await prisma.produk.findUnique({
      where: { barcode: input.barcode },
    });
    if (existing && existing.id !== id) {
      throw new Error(`Barcode '${input.barcode}' sudah digunakan oleh produk lain`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update data pokok produk
    await tx.produk.update({
      where: { id },
      data: {
        ...(input.nama ? { nama: input.nama } : {}),
        ...(input.kategoriId !== undefined ? { kategoriId: input.kategoriId } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode ? input.barcode.trim() : null } : {}),
        ...(input.satuanDasar ? { satuanDasar: input.satuanDasar } : {}),
        ...(input.stokMinimum !== undefined ? { stokMinimum: new Prisma.Decimal(input.stokMinimum) } : {}),
        ...(input.stokKosong !== undefined ? { stokKosong: new Prisma.Decimal(input.stokKosong) } : {}),
        ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
      },
    });

    // 2. Update satuan & harga jika disertakan
    if (input.satuanList && input.satuanList.length > 0) {
      // Hapus satuan lama lalu ganti dengan yang baru
      await tx.satuanProduk.deleteMany({ where: { produkId: id } });

      const hasDefault = input.satuanList.some((s) => s.isDefault);
      await tx.satuanProduk.createMany({
        data: input.satuanList.map((s, idx) => ({
          produkId: id,
          namaSatuan: s.namaSatuan,
          faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
          hargaJual: s.hargaJual,
          hargaBeli: s.hargaBeli,
          isDefault: hasDefault ? !!s.isDefault : idx === 0,
        })),
      });
    }

    return tx.produk.findUnique({
      where: { id },
      include: {
        kategori: true,
        satuanProduk: {
          orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
        },
      },
    });
  });

  // Catat riwayat perubahan harga ke log (User Story B5)
  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UBAH_PRODUK",
    entitas: "Produk",
    entitasId: id,
    sebelumJson: {
      nama: sebelum.nama,
      barcode: sebelum.barcode,
      satuanList: sebelum.satuanProduk.map((s) => ({
        satuan: s.namaSatuan,
        jual: s.hargaJual,
        beli: s.hargaBeli,
      })),
    },
    sesudahJson: {
      nama: updated?.nama,
      barcode: updated?.barcode,
      satuanList: updated?.satuanProduk.map((s) => ({
        satuan: s.namaSatuan,
        jual: s.hargaJual,
        beli: s.hargaBeli,
      })),
    },
    ip,
  });

  return updated;
}

export interface BulkRaisePriceInput {
  scope: "SINGLE" | "CATEGORY" | "ALL";
  produkId?: string;
  kategoriId?: string;
  mode: "FIXED" | "PERCENT";
  amount: number;
  roundTo?: 0 | 100 | 500;
  includeHargaBeli?: boolean;
  role?: string;
}

export function calculateRaisedPrice(
  currentPrice: number,
  faktorKeDasar: number,
  mode: "FIXED" | "PERCENT",
  amount: number,
  roundTo: 0 | 100 | 500 = 0
): number {
  let next =
    mode === "FIXED"
      ? currentPrice + Math.round(amount * faktorKeDasar)
      : Math.round(currentPrice * (1 + amount / 100));

  if (roundTo > 0) {
    next = Math.ceil(next / roundTo) * roundTo;
  }
  return Math.max(0, next);
}

export async function bulkRaisePrices(
  input: BulkRaisePriceInput,
  userId: string,
  ip?: string
) {
  const where: Prisma.ProdukWhereInput = { aktif: true };
  if (input.scope === "SINGLE") {
    if (!input.produkId) throw new Error("Pilih produk terlebih dahulu");
    where.id = input.produkId;
  } else if (input.scope === "CATEGORY") {
    if (!input.kategoriId) throw new Error("Pilih kategori terlebih dahulu");
    where.kategoriId = input.kategoriId;
  }

  const products = await prisma.produk.findMany({
    where,
    include: { satuanProduk: true },
  });

  if (products.length === 0) {
    throw new Error("Tidak ada produk yang cocok untuk dinaikkan harganya");
  }

  const roundTo = input.roundTo ?? 0;
  let updatedUnits = 0;

  await prisma.$transaction(async (tx) => {
    for (const p of products) {
      for (const s of p.satuanProduk) {
        const faktor = Number(s.faktorKeDasar) || 1;
        const newJual = calculateRaisedPrice(
          s.hargaJual,
          faktor,
          input.mode,
          input.amount,
          roundTo
        );
        const newBeli = input.includeHargaBeli
          ? calculateRaisedPrice(
              s.hargaBeli,
              faktor,
              input.mode,
              input.amount,
              roundTo
            )
          : s.hargaBeli;

        await tx.satuanProduk.update({
          where: { id: s.id },
          data: {
            hargaJual: newJual,
            ...(input.includeHargaBeli ? { hargaBeli: newBeli } : {}),
          },
        });
        updatedUnits += 1;
      }
    }
  });

  await logActivity({
    userId,
    role: input.role || "OWNER",
    aksi: "HARGA_NAIK",
    entitas: "Produk",
    entitasId: input.produkId || input.kategoriId || "ALL",
    sesudahJson: {
      scope: input.scope,
      mode: input.mode,
      amount: input.amount,
      roundTo,
      includeHargaBeli: !!input.includeHargaBeli,
      produkTerdampak: products.length,
      satuanDiperbarui: updatedUnits,
      produkIds: products.map((p) => p.id),
    },
    ip,
  });

  return {
    produkCount: products.length,
    unitCount: updatedUnits,
  };
}

export async function deleteProduct(id: string, userId: string, ip?: string) {
  // Soft delete: status aktif = false
  const updated = await prisma.produk.update({
    where: { id },
    data: { aktif: false },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "NONAKTIFKAN_PRODUK",
    entitas: "Produk",
    entitasId: id,
    ip,
  });

  return updated;
}

// 3. User Story B3: Cek Harga (Read-only untuk Staff dan Owner)
export async function checkPrice(query: string) {
  const q = query.trim();
  if (!q) return [];

  // Cari berdasarkan barcode persis atau nama produk
  const products = await prisma.produk.findMany({
    where: {
      aktif: true,
      OR: [
        { barcode: q },
        { nama: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      kategori: true,
      satuanProduk: {
        orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
      },
    },
    take: 20,
  });

  // Hitung status warna stok (User Story E3):
  // Merah: stok <= 0
  // Kuning: stok <= stokMinimum
  // Hijau: stok > stokMinimum
  return products.map((p) => {
    const stok = Number(p.stokCache);
    const min = Number(p.stokMinimum);
    let statusStok: "HABIS" | "MENIPIS" | "AMAN";
    let warnaStatus: "red" | "yellow" | "green";

    if (stok <= 0) {
      statusStok = "HABIS";
      warnaStatus = "red";
    } else if (stok <= min) {
      statusStok = "MENIPIS";
      warnaStatus = "yellow";
    } else {
      statusStok = "AMAN";
      warnaStatus = "green";
    }

    return {
      id: p.id,
      nama: p.nama,
      barcode: p.barcode,
      kategori: p.kategori?.nama || "Tanpa Kategori",
      satuanDasar: p.satuanDasar,
      stokSaatIni: stok,
      stokMinimum: min,
      statusStok,
      warnaStatus,
      satuanList: p.satuanProduk.map((s) => ({
        id: s.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli,
        isDefault: s.isDefault,
      })),
    };
  });
}

