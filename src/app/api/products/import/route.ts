import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { logActivity } from "@/services/activity-log.service";

const importSatuanSchema = z.object({
  namaSatuan: z.string().trim().min(1, "Nama satuan wajib diisi"),
  faktorKeDasar: z.number().positive("Isi/faktor harus lebih dari 0").default(1),
  hargaBeli: z.number().int().min(0).default(0),
  hargaJual: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  isDefault: z.boolean().optional(),
});

const importItemSchema = z.object({
  nama: z.string().trim().min(1, "Nama produk wajib diisi"),
  kategori: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  satuanDasar: z.string().trim().min(1).default("pcs"),
  stok: z.number().min(0).default(0),
  stokMinimum: z.number().min(0).default(0),
  satuanList: z.array(importSatuanSchema).min(1, "Minimal 1 satuan wajib diisi"),
});

const importPayloadSchema = z.object({
  mode: z.enum(["skip", "update"]).default("skip"),
  items: z.array(importItemSchema).min(1, "Minimal 1 produk untuk diimport").max(1000, "Maksimal 1000 produk per import"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "kasir:kasbon", "piutang:view"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = importPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Format data import tidak valid" },
        { status: 400 }
      );
    }

    const { mode, items } = parsed.data;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;

    // Cache kategori yang sudah ada (case-insensitive map)
    const existingCategories = await prisma.kategori.findMany();
    const categoryMap = new Map<string, string>();
    for (const c of existingCategories) {
      categoryMap.set(c.nama.trim().toLowerCase(), c.id);
    }

    const getOrCreateCategoryId = async (kategoriNama?: string | null): Promise<string | null> => {
      const clean = kategoriNama?.trim();
      if (!clean) return null;
      const key = clean.toLowerCase();
      const cached = categoryMap.get(key);
      if (cached) return cached;

      const created = await prisma.kategori.create({
        data: { nama: clean },
      });
      categoryMap.set(key, created.id);
      return created.id;
    };

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: { index: number; nama: string; reason: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const cleanBarcode = item.barcode?.trim() || null;

        // Cari produk existing berdasarkan barcode atau nama (case-insensitive)
        let existing = cleanBarcode
          ? await prisma.produk.findUnique({ where: { barcode: cleanBarcode } })
          : null;

        if (!existing) {
          existing = await prisma.produk.findFirst({
            where: { nama: { equals: item.nama, mode: "insensitive" } },
          });
        }

        if (existing) {
          if (mode === "skip") {
            skippedCount++;
            continue;
          }

          // Mode update: cek konflik barcode dengan produk lain
          if (cleanBarcode && cleanBarcode !== existing.barcode) {
            const barcodeConflict = await prisma.produk.findUnique({
              where: { barcode: cleanBarcode },
            });
            if (barcodeConflict && barcodeConflict.id !== existing.id) {
              errors.push({
                index: i + 1,
                nama: item.nama,
                reason: `Barcode '${cleanBarcode}' sudah dipakai produk lain (${barcodeConflict.nama})`,
              });
              continue;
            }
          }

          const kategoriId = await getOrCreateCategoryId(item.kategori);
          const hasDefault = item.satuanList.some((s) => s.isDefault);

          await prisma.$transaction(async (tx) => {
            await tx.produk.update({
              where: { id: existing.id },
              data: {
                nama: item.nama,
                kategoriId: kategoriId ?? existing.kategoriId,
                barcode: cleanBarcode ?? existing.barcode,
                satuanDasar: item.satuanDasar,
                stokMinimum: new Prisma.Decimal(item.stokMinimum),
                aktif: true,
              },
            });

            // Perbarui atau tambah satuan berdasarkan namaSatuan
            for (let idx = 0; idx < item.satuanList.length; idx++) {
              const u = item.satuanList[idx];
              const isDef = hasDefault ? !!u.isDefault : idx === 0;
              await tx.satuanProduk.upsert({
                where: {
                  produkId_namaSatuan: {
                    produkId: existing.id,
                    namaSatuan: u.namaSatuan,
                  },
                },
                update: {
                  faktorKeDasar: new Prisma.Decimal(u.faktorKeDasar),
                  hargaBeli: u.hargaBeli,
                  hargaJual: u.hargaJual,
                  isDefault: isDef,
                },
                create: {
                  produkId: existing.id,
                  namaSatuan: u.namaSatuan,
                  faktorKeDasar: new Prisma.Decimal(u.faktorKeDasar),
                  hargaBeli: u.hargaBeli,
                  hargaJual: u.hargaJual,
                  isDefault: isDef,
                },
              });
            }
          });

          updatedCount++;
          continue;
        }

        // Produk baru
        const kategoriId = await getOrCreateCategoryId(item.kategori);
        const hasDefault = item.satuanList.some((s) => s.isDefault);
        const unitsToCreate = item.satuanList.map((u, idx) => ({
          namaSatuan: u.namaSatuan,
          faktorKeDasar: new Prisma.Decimal(u.faktorKeDasar),
          hargaBeli: u.hargaBeli,
          hargaJual: u.hargaJual,
          isDefault: hasDefault ? !!u.isDefault : idx === 0,
        }));

        await prisma.$transaction(async (tx) => {
          const created = await tx.produk.create({
            data: {
              nama: item.nama,
              kategoriId,
              barcode: cleanBarcode,
              satuanDasar: item.satuanDasar,
              stokMinimum: new Prisma.Decimal(item.stokMinimum),
              stokCache: new Prisma.Decimal(item.stok),
              satuanProduk: {
                create: unitsToCreate,
              },
            },
          });

          if (item.stok > 0) {
            await tx.stokMutasi.create({
              data: {
                produkId: created.id,
                tipe: "MASUK",
                qtyDasar: new Prisma.Decimal(item.stok),
                refTipe: "IMPORT",
                refId: created.id,
                userId: session.userId,
                catatan: "Stok awal dari import data produk",
              },
            });
          }
        });

        createdCount++;
      } catch (err: any) {
        errors.push({
          index: i + 1,
          nama: item.nama,
          reason: err?.message || "Gagal menyimpan produk",
        });
      }
    }

    await logActivity({
      userId: session.userId,
      role: session.role,
      aksi: "IMPORT_PRODUK",
      entitas: "Produk",
      entitasId: null,
      sesudahJson: {
        mode,
        totalDikirim: items.length,
        ditambahkan: createdCount,
        diperbarui: updatedCount,
        dilewati: skippedCount,
        gagal: errors.length,
      },
      ip,
    });

    return NextResponse.json({
      message: "Proses import selesai",
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses import produk" },
      { status: 500 }
    );
  }
}
