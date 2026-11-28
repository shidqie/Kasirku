import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { Prisma } from "@prisma/client";
import { isRefillProduct } from "@/lib/refill";
import { getCategoryPrefix } from "@/lib/codification";
import { getSettings } from "./settings.service";
import { recordPriceChanges } from "./price-history.service";
import { detectBrandFromName, resolveProductBrand } from "@/lib/brand-detector";

export async function generateUniqueSku(
  tx: Prisma.TransactionClient,
  kategoriId?: string | null,
  categoryNameHint?: string | null
): Promise<string> {
  let categoryName = categoryNameHint ?? null;
  if (!categoryName && kategoriId) {
    const cat = await tx.kategori.findUnique({
      where: { id: kategoriId },
      select: { nama: true },
    });
    categoryName = cat?.nama ?? null;
  }

  const prefix = getCategoryPrefix(categoryName);
  const base = `PRD-${prefix}-`;
  const existing = await tx.produk.findMany({
    where: { sku: { startsWith: base } },
    select: { sku: true },
  });

  const used = new Set<string>();
  let maxSeq = 0;
  for (const row of existing) {
    if (!row.sku) continue;
    used.add(row.sku.toUpperCase());
    const match = /^PRD-[A-Z0-9]{3}-(\d+)$/i.exec(row.sku);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }

  let seq = maxSeq + 1;
  let candidate = `${base}${String(seq).padStart(3, "0")}`;
  while (used.has(candidate.toUpperCase())) {
    seq++;
    candidate = `${base}${String(seq).padStart(3, "0")}`;
  }
  return candidate;
}

export interface CreateProductInput {
  sku?: string | null;
  nama: string;
  merek?: string | null;
  kategoriId?: string | null;
  groupId?: string | null;
  variantName?: string | null;
  barcode?: string | null;
  satuanDasar: string;
  stokMinimum: number;
  stokKosong?: number;
  isRefill?: boolean;
  satuanList: {
    namaSatuan: string;
    faktorKeDasar: number;
    hargaJual: number;
    hargaBeli?: number;
    isDefault?: boolean;
  }[];
}

export interface UpdateProductInput {
  sku?: string | null;
  nama?: string;
  merek?: string | null;
  kategoriId?: string | null;
  groupId?: string | null;
  variantName?: string | null;
  barcode?: string | null;
  satuanDasar?: string;
  stokMinimum?: number;
  stokKosong?: number;
  isRefill?: boolean;
  aktif?: boolean;
  satuanList?: {
    id?: string;
    namaSatuan: string;
    faktorKeDasar: number;
    hargaJual: number;
    hargaBeli?: number;
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
      { merek: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { barcodes: { some: { code: { contains: q, mode: "insensitive" } } } },
      { variantName: { contains: q, mode: "insensitive" } },
      { group: { nama: { contains: q, mode: "insensitive" } } },
      { group: { brand: { contains: q, mode: "insensitive" } } },
    ];
  }

  const products = await prisma.produk.findMany({
    where,
    orderBy: { nama: "asc" },
    include: {
      kategori: true,
      barcodes: {
        orderBy: { createdAt: "asc" },
      },
      group: {
        include: { kategori: true },
      },
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
  const penyesuaianHargaIds = new Set<string>();
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
      const priceAdjusted = afterList.some((a, i) => {
        const prev = beforeList.find((b) => b.satuan === a.satuan) || beforeList[i];
        return typeof a.jual === "number" && typeof prev?.jual === "number" && a.jual !== prev.jual;
      });
      if (priceAdjusted) penyesuaianHargaIds.add(log.entitasId);
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
      penyesuaianHarga: penyesuaianHargaIds.has(p.id),
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

export async function createProduct(
  input: CreateProductInput,
  userId: string,
  ip?: string,
  options?: { allowEditHargaBeli?: boolean; userRole?: string }
) {
  const cleanBarcode = input.barcode?.trim() || null;
  if (cleanBarcode) {
    const [existingBarcode, existingExtra] = await Promise.all([
      prisma.produk.findUnique({ where: { barcode: cleanBarcode } }),
      prisma.productBarcode.findUnique({ where: { code: cleanBarcode } }),
    ]);
    if (existingBarcode || existingExtra) {
      throw new Error(`Barcode '${cleanBarcode}' sudah digunakan oleh produk lain`);
    }
  }

  const cleanSkuInput = input.sku?.trim() || null;
  if (cleanSkuInput) {
    const existingSku = await prisma.produk.findUnique({
      where: { sku: cleanSkuInput },
      select: { id: true, nama: true },
    });
    if (existingSku) {
      throw new Error(`SKU '${cleanSkuInput}' sudah digunakan oleh produk '${existingSku.nama}'`);
    }
  }

  const settings = await getSettings();
  const canEditCost = (options?.allowEditHargaBeli ?? true) && settings.aktifkanHargaBeli;
  const resolvedMerek = resolveProductBrand({ merek: input.merek, nama: input.nama });

  // Pastikan setidaknya satu satuan adalah default
  const hasDefault = input.satuanList.some((s) => s.isDefault);
  const unitsToCreate = input.satuanList.map((s, idx) => ({
    namaSatuan: s.namaSatuan,
    faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
    hargaJual: s.hargaJual,
    hargaBeli: canEditCost ? (s.hargaBeli ?? 0) : 0,
    isDefault: hasDefault ? !!s.isDefault : idx === 0,
  }));

  const product = await prisma.$transaction(async (tx) => {
    const finalSku = cleanSkuInput || (await generateUniqueSku(tx, input.kategoriId));
    const p = await tx.produk.create({
      data: {
        sku: finalSku,
        nama: input.nama,
        merek: resolvedMerek,
        kategoriId: input.kategoriId || null,
        groupId: input.groupId || null,
        variantName: input.variantName ? input.variantName.trim() : null,
        barcode: cleanBarcode,
        satuanDasar: input.satuanDasar,
        stokMinimum: new Prisma.Decimal(input.stokMinimum),
        stokCache: new Prisma.Decimal(0),
        stokKosong: new Prisma.Decimal(input.stokKosong ?? 0),
        isRefill: input.isRefill ?? isRefillProduct(input.nama),
        satuanProduk: {
          create: unitsToCreate,
        },
        ...(cleanBarcode
          ? {
              barcodes: {
                create: { code: cleanBarcode, source: "manual" },
              },
            }
          : {}),
      },
      include: {
        satuanProduk: true,
        kategori: true,
        barcodes: { orderBy: { createdAt: "asc" } },
      },
    });

    return p;
  }, { timeout: 15000 });

  await logActivity({
    userId,
    role: options?.userRole || "OWNER",
    aksi: "BUAT_PRODUK",
    entitas: "Produk",
    entitasId: product.id,
    sesudahJson: {
      sku: product.sku,
      nama: product.nama,
      merek: product.merek,
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
  ip?: string,
  options?: { allowEditHargaBeli?: boolean; userRole?: string }
) {
  const sebelum = await prisma.produk.findUnique({
    where: { id },
    include: { satuanProduk: true, kategori: true },
  });

  if (!sebelum) throw new Error("Produk tidak ditemukan");

  const nextBarcode =
    input.barcode !== undefined ? (input.barcode ? input.barcode.trim() : null) : undefined;
  if (nextBarcode && nextBarcode !== sebelum.barcode) {
    const [existing, existingExtra] = await Promise.all([
      prisma.produk.findUnique({ where: { barcode: nextBarcode } }),
      prisma.productBarcode.findFirst({ where: { code: nextBarcode, productId: { not: id } } }),
    ]);
    if ((existing && existing.id !== id) || existingExtra) {
      throw new Error(`Barcode '${nextBarcode}' sudah digunakan oleh produk lain`);
    }
  }

  const cleanSkuInput = input.sku !== undefined ? (input.sku?.trim() || null) : undefined;
  if (cleanSkuInput && cleanSkuInput !== sebelum.sku) {
    const existingSku = await prisma.produk.findUnique({
      where: { sku: cleanSkuInput },
      select: { id: true, nama: true },
    });
    if (existingSku && existingSku.id !== id) {
      throw new Error(`SKU '${cleanSkuInput}' sudah digunakan oleh produk '${existingSku.nama}'`);
    }
  }

  const settings = await getSettings();
  const canEditCost = (options?.allowEditHargaBeli ?? true) && settings.aktifkanHargaBeli;

  const updated = await prisma.$transaction(async (tx) => {
    const targetKategoriId =
      input.kategoriId !== undefined ? input.kategoriId : sebelum.kategoriId;
    const ensuredSku =
      cleanSkuInput !== undefined
        ? cleanSkuInput || sebelum.sku || (await generateUniqueSku(tx, targetKategoriId))
        : sebelum.sku || (await generateUniqueSku(tx, targetKategoriId));

    // 1. Update data pokok produk
    const nextMerek =
      input.merek !== undefined
        ? input.merek?.trim() || null
        : !sebelum.merek && input.nama
        ? detectBrandFromName(input.nama)
        : undefined;

    await tx.produk.update({
      where: { id },
      data: {
        sku: ensuredSku,
        ...(input.nama ? { nama: input.nama } : {}),
        ...(nextMerek !== undefined ? { merek: nextMerek } : {}),
        ...(input.kategoriId !== undefined ? { kategoriId: input.kategoriId } : {}),
        ...(input.groupId !== undefined ? { groupId: input.groupId || null } : {}),
        ...(input.variantName !== undefined ? { variantName: input.variantName ? input.variantName.trim() : null } : {}),
        ...(nextBarcode !== undefined ? { barcode: nextBarcode } : {}),
        ...(input.satuanDasar ? { satuanDasar: input.satuanDasar } : {}),
        ...(input.stokMinimum !== undefined ? { stokMinimum: new Prisma.Decimal(input.stokMinimum) } : {}),
        ...(input.stokKosong !== undefined ? { stokKosong: new Prisma.Decimal(input.stokKosong) } : {}),
        ...(input.isRefill !== undefined ? { isRefill: input.isRefill } : {}),
        ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
      },
    });

    if (nextBarcode) {
      await tx.productBarcode.upsert({
        where: { code: nextBarcode },
        update: { productId: id },
        create: { productId: id, code: nextBarcode, source: "manual" },
      });
    }

    // 2. Update satuan & harga jika disertakan (lindungi hargaBeli lama saat fitur nonaktif / tanpa izin)
    if (input.satuanList && input.satuanList.length > 0) {
      await tx.satuanProduk.deleteMany({ where: { produkId: id } });

      const hasDefault = input.satuanList.some((s) => s.isDefault);
      const defaultPrev =
        sebelum.satuanProduk.find((prev) => prev.isDefault) || sebelum.satuanProduk[0];

      const unitsToCreate = input.satuanList.map((s, idx) => {
        const matchedPrev =
          (s.id ? sebelum.satuanProduk.find((prev) => prev.id === s.id) : undefined) ||
          sebelum.satuanProduk.find(
            (prev) => prev.namaSatuan.trim().toLowerCase() === s.namaSatuan.trim().toLowerCase()
          ) ||
          (input.satuanList!.length === 1 && sebelum.satuanProduk.length === 1 ? defaultPrev : undefined);

        const preservedHargaBeli = matchedPrev?.hargaBeli ?? 0;
        const nextHargaBeli =
          canEditCost && typeof s.hargaBeli === "number" ? s.hargaBeli : preservedHargaBeli;

        return {
          produkId: id,
          namaSatuan: s.namaSatuan,
          faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
          hargaJual: s.hargaJual,
          hargaBeli: nextHargaBeli,
          isDefault: hasDefault ? !!s.isDefault : idx === 0,
        };
      });

      await tx.satuanProduk.createMany({ data: unitsToCreate });

      await recordPriceChanges({
        tx,
        produkId: id,
        namaProduk: input.nama || sebelum.nama,
        beforeUnits: sebelum.satuanProduk.map((s) => ({
          namaSatuan: s.namaSatuan,
          hargaJual: s.hargaJual,
          hargaBeli: s.hargaBeli,
        })),
        afterUnits: unitsToCreate.map((s) => ({
          namaSatuan: s.namaSatuan,
          hargaJual: s.hargaJual,
          hargaBeli: s.hargaBeli,
        })),
        userId,
        keterangan: "Edit harga produk",
      });
    }

    return tx.produk.findUnique({
      where: { id },
      include: {
        kategori: true,
        barcodes: { orderBy: { createdAt: "asc" } },
        satuanProduk: {
          orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
        },
      },
    });
  }, { timeout: 15000 });

  // Catat riwayat perubahan harga ke log
  await logActivity({
    userId,
    role: options?.userRole || "OWNER",
    aksi: "UBAH_PRODUK",
    entitas: "Produk",
    entitasId: id,
    sebelumJson: {
      sku: sebelum.sku,
      nama: sebelum.nama,
      barcode: sebelum.barcode,
      satuanList: sebelum.satuanProduk.map((s) => ({
        satuan: s.namaSatuan,
        jual: s.hargaJual,
        beli: s.hargaBeli,
      })),
    },
    sesudahJson: {
      sku: updated?.sku,
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

export async function duplicateProduct(
  sourceId: string,
  userId: string,
  ip?: string,
  userRole?: string
) {
  const source = await prisma.produk.findUnique({
    where: { id: sourceId },
    include: { satuanProduk: true, kategori: true },
  });

  if (!source) throw new Error("Produk sumber tidak ditemukan");

  const duplicated = await prisma.$transaction(async (tx) => {
    const newSku = await generateUniqueSku(tx, source.kategoriId, source.kategori?.nama);
    const hasDefault = source.satuanProduk.some((s) => s.isDefault);
    const unitsToCreate =
      source.satuanProduk.length > 0
        ? source.satuanProduk.map((s, idx) => ({
            namaSatuan: s.namaSatuan,
            faktorKeDasar: s.faktorKeDasar,
            hargaJual: s.hargaJual,
            hargaBeli: s.hargaBeli,
            isDefault: hasDefault ? s.isDefault : idx === 0,
          }))
        : [
            {
              namaSatuan: source.satuanDasar || "pcs",
              faktorKeDasar: new Prisma.Decimal(1),
              hargaJual: 0,
              hargaBeli: 0,
              isDefault: true,
            },
          ];

    return tx.produk.create({
      data: {
        sku: newSku,
        nama: `${source.nama} (Salinan)`,
        merek: source.merek,
        kategoriId: source.kategoriId,
        groupId: source.groupId,
        variantName: source.variantName,
        barcode: null,
        satuanDasar: source.satuanDasar,
        stokMinimum: source.stokMinimum,
        stokCache: new Prisma.Decimal(0),
        stokKosong: new Prisma.Decimal(0),
        isRefill: source.isRefill,
        satuanProduk: {
          create: unitsToCreate,
        },
      },
      include: {
        kategori: true,
        barcodes: { orderBy: { createdAt: "asc" } },
        satuanProduk: {
          orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
        },
      },
    });
  });

  await logActivity({
    userId,
    role: userRole || "OWNER",
    aksi: "DUPLIKAT_PRODUK",
    entitas: "Produk",
    entitasId: duplicated.id,
    sebelumJson: { sourceId: source.id, sourceSku: source.sku, sourceNama: source.nama },
    sesudahJson: { sku: duplicated.sku, nama: duplicated.nama },
    ip,
  });

  return duplicated;
}

export interface BulkRaisePriceInput {
  scope: "SINGLE" | "CATEGORY" | "ALL";
  produkId?: string;
  kategoriId?: string;
  mode: "FIXED" | "PERCENT";
  amount: number;
  roundTo?: 0 | 100 | 500;
  includeHargaBeli?: boolean;
  allowEditHargaBeli?: boolean;
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

  const settings = await getSettings();
  const canUpdateCost =
    Boolean(input.includeHargaBeli) &&
    settings.aktifkanHargaBeli &&
    input.allowEditHargaBeli !== false;

  const roundTo = input.roundTo ?? 0;
  let updatedUnits = 0;

  await prisma.$transaction(async (tx) => {
    for (const p of products) {
      const beforeUnits = p.satuanProduk.map((s) => ({
        namaSatuan: s.namaSatuan,
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli,
      }));
      const afterUnits: { namaSatuan: string; hargaJual: number; hargaBeli: number }[] = [];

      for (const s of p.satuanProduk) {
        const faktor = Number(s.faktorKeDasar) || 1;
        const newJual = calculateRaisedPrice(
          s.hargaJual,
          faktor,
          input.mode,
          input.amount,
          roundTo
        );
        const newBeli = canUpdateCost
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
            ...(canUpdateCost ? { hargaBeli: newBeli } : {}),
          },
        });
        afterUnits.push({
          namaSatuan: s.namaSatuan,
          hargaJual: newJual,
          hargaBeli: newBeli,
        });
        updatedUnits += 1;
      }

      await recordPriceChanges({
        tx,
        produkId: p.id,
        namaProduk: p.nama,
        beforeUnits,
        afterUnits,
        userId,
        keterangan: `Kenaikan harga (${input.mode === "PERCENT" ? `${input.amount}%` : `Rp ${input.amount}`})`,
      });
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

  // Cari berdasarkan SKU, barcode persis, atau nama produk
  const products = await prisma.produk.findMany({
    where: {
      aktif: true,
      OR: [
        { sku: { equals: q, mode: "insensitive" } },
        { barcode: q },
        { barcodes: { some: { code: q } } },
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
      sku: p.sku,
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

