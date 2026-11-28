import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logActivity } from "./activity-log.service";
import { buildVariantFullName } from "@/lib/product-grouping";
import { isRefillProduct } from "@/lib/refill";
import { generateUniqueSku } from "./product.service";
import { getSettings } from "./settings.service";

export interface VariantItemInput {
  sku?: string | null;
  variantName: string;
  barcode?: string | null;
  satuanDasar: string;
  stokMinimum: number;
  stokAwal?: number;
  isRefill?: boolean;
  satuanList: {
    namaSatuan: string;
    faktorKeDasar: number;
    hargaJual: number;
    hargaBeli?: number;
    isDefault?: boolean;
  }[];
}

export interface CreateProductGroupInput {
  nama: string;
  brand?: string | null;
  kategoriId?: string | null;
  variants: VariantItemInput[];
}

export async function getProductGroups() {
  return prisma.productGroup.findMany({
    orderBy: { nama: "asc" },
    include: {
      kategori: true,
      produk: {
        where: { aktif: true },
        orderBy: { nama: "asc" },
        include: {
          kategori: true,
          satuanProduk: {
            orderBy: [{ isDefault: "desc" }, { faktorKeDasar: "asc" }],
          },
        },
      },
    },
  });
}

async function assertUniqueBarcodes(barcodes: string[], excludeIds: string[] = []) {
  if (barcodes.length === 0) return;
  const [existing, existingExtra] = await Promise.all([
    prisma.produk.findMany({
      where: {
        barcode: { in: barcodes },
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: { id: true, nama: true, barcode: true },
    }),
    prisma.productBarcode.findMany({
      where: {
        code: { in: barcodes },
        ...(excludeIds.length > 0 ? { productId: { notIn: excludeIds } } : {}),
      },
      include: { product: { select: { nama: true } } },
    }),
  ]);
  if (existing.length > 0) {
    const first = existing[0];
    throw new Error(
      `Barcode '${first.barcode}' sudah digunakan oleh produk '${first.nama}'`
    );
  }
  if (existingExtra.length > 0) {
    const first = existingExtra[0];
    throw new Error(
      `Barcode '${first.code}' sudah digunakan oleh produk '${first.product.nama}'`
    );
  }
}

export async function createProductGroupWithVariants(
  input: CreateProductGroupInput,
  userId: string,
  ip?: string,
  options?: { allowEditHargaBeli?: boolean }
) {
  const barcodes = input.variants
    .map((v) => v.barcode?.trim())
    .filter((b): b is string => Boolean(b));
  await assertUniqueBarcodes(barcodes);

  const settings = await getSettings();
  const canEditCost = (options?.allowEditHargaBeli ?? true) && settings.aktifkanHargaBeli;

  const created = await prisma.$transaction(async (tx) => {
    const group = await tx.productGroup.create({
      data: {
        nama: input.nama.trim(),
        brand: input.brand?.trim() || null,
        kategoriId: input.kategoriId || null,
      },
    });

    const createdVariants = [];
    for (const v of input.variants) {
      const fullName = buildVariantFullName(group.nama, v.variantName);
      const hasDefault = v.satuanList.some((s) => s.isDefault);
      const stokAwal = Number(v.stokAwal ?? 0);
      const cleanBarcode = v.barcode?.trim() || null;
      const sku = v.sku?.trim() || (await generateUniqueSku(tx, input.kategoriId));

      const p = await tx.produk.create({
        data: {
          sku,
          nama: fullName,
          kategoriId: input.kategoriId || null,
          groupId: group.id,
          variantName: v.variantName.trim(),
          barcode: cleanBarcode,
          satuanDasar: v.satuanDasar.trim(),
          stokMinimum: new Prisma.Decimal(v.stokMinimum ?? 0),
          stokCache: new Prisma.Decimal(stokAwal),
          stokKosong: new Prisma.Decimal(0),
          isRefill: v.isRefill ?? isRefillProduct(fullName),
          satuanProduk: {
            create: v.satuanList.map((s, idx) => ({
              namaSatuan: s.namaSatuan,
              faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
              hargaJual: s.hargaJual,
              hargaBeli: canEditCost ? (s.hargaBeli ?? 0) : 0,
              isDefault: hasDefault ? !!s.isDefault : idx === 0,
            })),
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
          group: true,
          barcodes: { orderBy: { createdAt: "asc" } },
        },
      });

      if (stokAwal > 0) {
        await tx.stokMutasi.create({
          data: {
            produkId: p.id,
            tipe: "SALDO_AWAL",
            qtyDasar: new Prisma.Decimal(stokAwal),
            refTipe: "PRODUK_VARIAN",
            refId: group.id,
            userId,
            catatan: `Stok awal varian ${v.variantName.trim()}`,
          },
        });
      }

      createdVariants.push(p);
    }

    return { group, variants: createdVariants };
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "BUAT_GRUP_PRODUK",
    entitas: "ProductGroup",
    entitasId: created.group.id,
    sesudahJson: {
      nama: created.group.nama,
      brand: created.group.brand,
      jumlahVarian: created.variants.length,
    },
    ip,
  });

  return created;
}

export async function addVariantToGroup(
  groupId: string,
  v: VariantItemInput,
  userId: string,
  ip?: string,
  options?: { allowEditHargaBeli?: boolean }
) {
  const group = await prisma.productGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Grup produk tidak ditemukan");

  const cleanBarcode = v.barcode?.trim();
  if (cleanBarcode) {
    await assertUniqueBarcodes([cleanBarcode]);
  }

  const settings = await getSettings();
  const canEditCost = (options?.allowEditHargaBeli ?? true) && settings.aktifkanHargaBeli;

  const fullName = buildVariantFullName(group.nama, v.variantName);
  const hasDefault = v.satuanList.some((s) => s.isDefault);
  const stokAwal = Number(v.stokAwal ?? 0);

  const variant = await prisma.$transaction(async (tx) => {
    const sku = v.sku?.trim() || (await generateUniqueSku(tx, group.kategoriId));
    const p = await tx.produk.create({
      data: {
        sku,
        nama: fullName,
        kategoriId: group.kategoriId || null,
        groupId: group.id,
        variantName: v.variantName.trim(),
        barcode: cleanBarcode || null,
        satuanDasar: v.satuanDasar.trim(),
        stokMinimum: new Prisma.Decimal(v.stokMinimum ?? 0),
        stokCache: new Prisma.Decimal(stokAwal),
        stokKosong: new Prisma.Decimal(0),
        isRefill: v.isRefill ?? isRefillProduct(fullName),
        satuanProduk: {
          create: v.satuanList.map((s, idx) => ({
            namaSatuan: s.namaSatuan,
            faktorKeDasar: new Prisma.Decimal(s.faktorKeDasar),
            hargaJual: s.hargaJual,
            hargaBeli: canEditCost ? (s.hargaBeli ?? 0) : 0,
            isDefault: hasDefault ? !!s.isDefault : idx === 0,
          })),
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
        group: true,
        barcodes: { orderBy: { createdAt: "asc" } },
      },
    });

    if (stokAwal > 0) {
      await tx.stokMutasi.create({
        data: {
          produkId: p.id,
          tipe: "SALDO_AWAL",
          qtyDasar: new Prisma.Decimal(stokAwal),
          refTipe: "PRODUK_VARIAN",
          refId: group.id,
          userId,
          catatan: `Stok awal varian ${v.variantName.trim()}`,
        },
      });
    }

    return p;
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "TAMBAH_VARIAN",
    entitas: "Produk",
    entitasId: variant.id,
    sesudahJson: { groupId, nama: variant.nama, variantName: variant.variantName },
    ip,
  });

  return variant;
}

export async function updateProductGroup(
  id: string,
  input: { nama?: string; brand?: string | null; kategoriId?: string | null },
  userId: string,
  ip?: string
) {
  const existing = await prisma.productGroup.findUnique({ where: { id } });
  if (!existing) throw new Error("Grup produk tidak ditemukan");

  const updated = await prisma.productGroup.update({
    where: { id },
    data: {
      ...(input.nama !== undefined ? { nama: input.nama.trim() } : {}),
      ...(input.brand !== undefined ? { brand: input.brand?.trim() || null } : {}),
      ...(input.kategoriId !== undefined ? { kategoriId: input.kategoriId || null } : {}),
    },
    include: { kategori: true },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UBAH_GRUP_PRODUK",
    entitas: "ProductGroup",
    entitasId: id,
    sebelumJson: { nama: existing.nama, brand: existing.brand },
    sesudahJson: { nama: updated.nama, brand: updated.brand },
    ip,
  });

  return updated;
}

export async function deleteProductGroup(id: string, userId: string, ip?: string) {
  const existing = await prisma.productGroup.findUnique({ where: { id } });
  if (!existing) throw new Error("Grup produk tidak ditemukan");

  // Lepaskan produk dari grup (tidak menghapus produk)
  await prisma.$transaction(async (tx) => {
    await tx.produk.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });
    await tx.productGroup.delete({ where: { id } });
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "HAPUS_GRUP_PRODUK",
    entitas: "ProductGroup",
    entitasId: id,
    sebelumJson: { nama: existing.nama },
    ip,
  });
}

export async function moveProductToGroup(
  produkId: string,
  groupId: string | null,
  variantName?: string | null,
  userId?: string,
  ip?: string
) {
  const produk = await prisma.produk.findUnique({ where: { id: produkId } });
  if (!produk) throw new Error("Produk tidak ditemukan");

  if (groupId) {
    const group = await prisma.productGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new Error("Grup produk tujuan tidak ditemukan");
  }

  const updated = await prisma.produk.update({
    where: { id: produkId },
    data: {
      groupId,
      ...(variantName !== undefined ? { variantName: variantName?.trim() || null } : {}),
    },
    include: { group: true, kategori: true, satuanProduk: true },
  });

  if (userId) {
    await logActivity({
      userId,
      role: "OWNER",
      aksi: "PINDAH_GRUP_PRODUK",
      entitas: "Produk",
      entitasId: produkId,
      sebelumJson: { groupId: produk.groupId },
      sesudahJson: { groupId, variantName: updated.variantName },
      ip,
    });
  }

  return updated;
}

export interface SplitProductInput {
  groupName: string;
  brand?: string | null;
  kategoriId?: string | null;
  variants: {
    sku?: string | null;
    variantName: string;
    barcode?: string | null;
    stokAwal: number;
    hargaJual?: number;
    hargaBeli?: number;
  }[];
}

/**
 * Pecah produk lama yang masih digabung (mis. "Cimory Matcha / Cokelat")
 * menjadi satu ProductGroup dengan beberapa varian terpisah.
 * Produk lama dinonaktifkan secara aman (riwayat transaksi lama tetap utuh).
 */
export async function splitProductIntoVariants(
  sourceProdukId: string,
  input: SplitProductInput,
  userId: string,
  ip?: string,
  options?: { allowEditHargaBeli?: boolean }
) {
  const source = await prisma.produk.findUnique({
    where: { id: sourceProdukId },
    include: { satuanProduk: true },
  });
  if (!source) throw new Error("Produk sumber tidak ditemukan");
  if (!source.aktif) throw new Error("Produk sumber sudah tidak aktif");

  const barcodes = input.variants
    .map((v) => v.barcode?.trim())
    .filter((b): b is string => Boolean(b));
  await assertUniqueBarcodes(barcodes, [sourceProdukId]);

  const settings = await getSettings();
  const canEditCost = (options?.allowEditHargaBeli ?? true) && settings.aktifkanHargaBeli;

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.productGroup.create({
      data: {
        nama: input.groupName.trim(),
        brand: input.brand?.trim() || null,
        kategoriId: input.kategoriId !== undefined ? input.kategoriId : source.kategoriId,
      },
    });

    const sourceDefaultSatuan =
      source.satuanProduk.find((s) => s.isDefault) || source.satuanProduk[0];

    const createdVariants = [];
    for (const v of input.variants) {
      const fullName = buildVariantFullName(group.nama, v.variantName);
      const stokAwal = Number(v.stokAwal ?? 0);
      const sku = v.sku?.trim() || (await generateUniqueSku(tx, group.kategoriId));
      const cleanBarcode = v.barcode?.trim() || null;

      const unitsToCreate =
        source.satuanProduk.length > 0
          ? source.satuanProduk.map((s) => ({
              namaSatuan: s.namaSatuan,
              faktorKeDasar: s.faktorKeDasar,
              hargaJual:
                s.id === sourceDefaultSatuan?.id && typeof v.hargaJual === "number"
                  ? v.hargaJual
                  : s.hargaJual,
              hargaBeli:
                canEditCost && s.id === sourceDefaultSatuan?.id && typeof v.hargaBeli === "number"
                  ? v.hargaBeli
                  : s.hargaBeli,
              isDefault: s.isDefault,
            }))
          : [
              {
                namaSatuan: source.satuanDasar,
                faktorKeDasar: new Prisma.Decimal(1),
                hargaJual: v.hargaJual ?? 0,
                hargaBeli: canEditCost ? (v.hargaBeli ?? 0) : 0,
                isDefault: true,
              },
            ];

      const p = await tx.produk.create({
        data: {
          sku,
          nama: fullName,
          kategoriId: group.kategoriId,
          groupId: group.id,
          variantName: v.variantName.trim(),
          barcode: cleanBarcode,
          satuanDasar: source.satuanDasar,
          stokMinimum: source.stokMinimum,
          stokCache: new Prisma.Decimal(stokAwal),
          stokKosong: new Prisma.Decimal(0),
          isRefill: source.isRefill,
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
          group: true,
        },
      });

      if (stokAwal > 0) {
        await tx.stokMutasi.create({
          data: {
            produkId: p.id,
            tipe: "SALDO_AWAL",
            qtyDasar: new Prisma.Decimal(stokAwal),
            refTipe: "PECAH_PRODUK",
            refId: source.id,
            userId,
            catatan: `Pecah dari ${source.nama} → ${v.variantName.trim()}`,
          },
        });
      }

      createdVariants.push(p);
    }

    // Nonaktifkan produk lama & lepas barcode-nya jika ingin dipakai ulang oleh varian
    await tx.produk.update({
      where: { id: source.id },
      data: { aktif: false, barcode: null },
    });

    return { group, variants: createdVariants };
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "PECAH_PRODUK",
    entitas: "Produk",
    entitasId: source.id,
    sebelumJson: { nama: source.nama, stokCache: Number(source.stokCache) },
    sesudahJson: {
      groupId: result.group.id,
      groupName: result.group.nama,
      varian: result.variants.map((v) => ({
        id: v.id,
        nama: v.nama,
        stok: Number(v.stokCache),
      })),
    },
    ip,
  });

  return result;
}
