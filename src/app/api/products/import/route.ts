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
  hargaBeli: z.number().int().min(0, "Harga beli tidak boleh negatif").default(0),
  hargaJual: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  isDefault: z.boolean().optional(),
});

const importItemSchema = z.object({
  nama: z.string().trim().min(1, "Nama produk wajib diisi"),
  groupName: z.string().trim().optional().nullable(),
  variantName: z.string().trim().optional().nullable(),
  kategori: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  satuanDasar: z.string().trim().min(1).default("pcs"),
  stok: z.number().min(0, "Stok tidak boleh negatif").default(0),
  stokMinimum: z.number().min(0, "Stok minimum tidak boleh negatif").default(0),
  satuanList: z.array(importSatuanSchema).min(1, "Minimal 1 satuan wajib diisi"),
});

const importPayloadSchema = z.object({
  mode: z.enum(["skip", "update"]).default("skip"),
  allowCreateCategory: z.boolean().default(true),
  items: z
    .array(importItemSchema)
    .min(1, "Minimal 1 produk untuk diimport")
    .max(1000, "Maksimal 1000 produk per import"),
});

export interface ImportReportEntry {
  no: number;
  nama: string;
  barcode: string;
  kategori: string;
  status: "DITAMBAHKAN" | "DIPERBARUI" | "DUPLIKAT" | "GAGAL";
  keterangan: string;
}

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

    const { mode, allowCreateCategory, items } = parsed.data;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;

    // Deteksi duplikasi barcode di dalam file yang sama
    const seenBarcodes = new Map<string, string>();
    for (const item of items) {
      const bc = item.barcode?.trim();
      if (bc) {
        const prevOwner = seenBarcodes.get(bc);
        if (prevOwner && prevOwner.toLowerCase() !== item.nama.toLowerCase()) {
          return NextResponse.json(
            {
              error: `Barcode '${bc}' ganda di dalam file (dipakai oleh '${prevOwner}' dan '${item.nama}'). Perbaiki file CSV terlebih dahulu.`,
            },
            { status: 400 }
          );
        }
        seenBarcodes.set(bc, item.nama);
      }
    }

    // Jalankan seluruh import dalam 1 transaksi atomik agar konsisten (all-or-nothing)
    const outcome = await prisma.$transaction(
      async (tx) => {
        const existingCategories = await tx.kategori.findMany();
        const categoryMap = new Map<string, string>();
        for (const c of existingCategories) {
          categoryMap.set(c.nama.trim().toLowerCase(), c.id);
        }

        const existingGroups = await tx.productGroup.findMany();
        const groupMap = new Map<string, string>();
        for (const g of existingGroups) {
          groupMap.set(g.nama.trim().toLowerCase(), g.id);
        }

        const resolveGroupId = async (
          groupName?: string | null,
          kategoriId?: string | null
        ): Promise<string | null> => {
          const clean = groupName?.trim();
          if (!clean) return null;
          const key = clean.toLowerCase();
          const found = groupMap.get(key);
          if (found) return found;
          const created = await tx.productGroup.create({
            data: {
              nama: clean,
              kategoriId: kategoriId || null,
            },
          });
          groupMap.set(key, created.id);
          return created.id;
        };

        const resolveCategoryId = async (
          kategoriNama?: string | null
        ): Promise<{ id: string | null; missingError?: string }> => {
          const clean = kategoriNama?.trim();
          if (!clean) return { id: null };
          const key = clean.toLowerCase();
          const cached = categoryMap.get(key);
          if (cached) return { id: cached };

          if (!allowCreateCategory) {
            return {
              id: null,
              missingError: `Kategori '${clean}' belum terdaftar dan pembuatan kategori baru tidak disetujui`,
            };
          }

          const created = await tx.kategori.create({
            data: { nama: clean },
          });
          categoryMap.set(key, created.id);
          return { id: created.id };
        };

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors: { index: number; nama: string; reason: string }[] = [];
        const duplicates: { index: number; nama: string; barcode: string }[] = [];
        const reportEntries: ImportReportEntry[] = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const cleanBarcode = item.barcode?.trim() || null;

          // Identifikasi utama berdasarkan barcode, lalu nama (case-insensitive) jika tanpa barcode
          let existing = cleanBarcode
            ? await tx.produk.findUnique({ where: { barcode: cleanBarcode } })
            : null;

          if (!existing) {
            existing = await tx.produk.findFirst({
              where: { nama: { equals: item.nama, mode: "insensitive" } },
            });
          }

          if (existing) {
            if (mode === "skip") {
              skippedCount++;
              duplicates.push({
                index: i + 1,
                nama: item.nama,
                barcode: cleanBarcode || "-",
              });
              reportEntries.push({
                no: i + 1,
                nama: item.nama,
                barcode: cleanBarcode || "",
                kategori: item.kategori || "",
                status: "DUPLIKAT",
                keterangan: "Produk sudah terdaftar (dilewati)",
              });
              continue;
            }

            // Mode update: cek konflik barcode dengan produk lain
            if (cleanBarcode && cleanBarcode !== existing.barcode) {
              const barcodeConflict = await tx.produk.findUnique({
                where: { barcode: cleanBarcode },
              });
              if (barcodeConflict && barcodeConflict.id !== existing.id) {
                const reason = `Barcode '${cleanBarcode}' sudah dipakai produk lain (${barcodeConflict.nama})`;
                errors.push({ index: i + 1, nama: item.nama, reason });
                reportEntries.push({
                  no: i + 1,
                  nama: item.nama,
                  barcode: cleanBarcode || "",
                  kategori: item.kategori || "",
                  status: "GAGAL",
                  keterangan: reason,
                });
                continue;
              }
            }

            const catResolved = await resolveCategoryId(item.kategori);
            if (catResolved.missingError) {
              errors.push({ index: i + 1, nama: item.nama, reason: catResolved.missingError });
              reportEntries.push({
                no: i + 1,
                nama: item.nama,
                barcode: cleanBarcode || "",
                kategori: item.kategori || "",
                status: "GAGAL",
                keterangan: catResolved.missingError,
              });
              continue;
            }

            const hasDefault = item.satuanList.some((s) => s.isDefault);
            const resolvedGroupId = await resolveGroupId(
              item.groupName,
              catResolved.id ?? existing.kategoriId
            );

            // Jangan mengubah ID produk dan jangan mengubah stok berjalan (stokCache)
            await tx.produk.update({
              where: { id: existing.id },
              data: {
                nama: item.nama,
                kategoriId: catResolved.id ?? existing.kategoriId,
                ...(resolvedGroupId ? { groupId: resolvedGroupId } : {}),
                ...(item.variantName ? { variantName: item.variantName.trim() } : {}),
                barcode: cleanBarcode ?? existing.barcode,
                satuanDasar: item.satuanDasar,
                stokMinimum: new Prisma.Decimal(item.stokMinimum),
                aktif: true,
              },
            });

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

            updatedCount++;
            reportEntries.push({
              no: i + 1,
              nama: item.nama,
              barcode: cleanBarcode || existing.barcode || "",
              kategori: item.kategori || "",
              status: "DIPERBARUI",
              keterangan: "Data & harga diperbarui (stok berjalan tetap)",
            });
            continue;
          }

          // Produk baru
          const catResolved = await resolveCategoryId(item.kategori);
          if (catResolved.missingError) {
            errors.push({ index: i + 1, nama: item.nama, reason: catResolved.missingError });
            reportEntries.push({
              no: i + 1,
              nama: item.nama,
              barcode: cleanBarcode || "",
              kategori: item.kategori || "",
              status: "GAGAL",
              keterangan: catResolved.missingError,
            });
            continue;
          }

          const hasDefault = item.satuanList.some((s) => s.isDefault);
          const unitsToCreate = item.satuanList.map((u, idx) => ({
            namaSatuan: u.namaSatuan,
            faktorKeDasar: new Prisma.Decimal(u.faktorKeDasar),
            hargaBeli: u.hargaBeli,
            hargaJual: u.hargaJual,
            isDefault: hasDefault ? !!u.isDefault : idx === 0,
          }));

          const resolvedGroupId = await resolveGroupId(item.groupName, catResolved.id);
          const created = await tx.produk.create({
            data: {
              nama: item.nama,
              kategoriId: catResolved.id,
              groupId: resolvedGroupId,
              variantName: item.variantName ? item.variantName.trim() : null,
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

          createdCount++;
          reportEntries.push({
            no: i + 1,
            nama: item.nama,
            barcode: cleanBarcode || "",
            kategori: item.kategori || "",
            status: "DITAMBAHKAN",
            keterangan: "Produk baru berhasil ditambahkan",
          });
        }

        return {
          totalProcessed: items.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors,
          duplicates,
          reportEntries,
        };
      },
      { timeout: 30000 }
    );

    await logActivity({
      userId: session.userId,
      role: session.role,
      aksi: "IMPORT_PRODUK",
      entitas: "Produk",
      entitasId: null,
      sesudahJson: {
        mode: mode === "skip" ? "Import Produk Baru" : "Import & Update Produk",
        totalDikirim: outcome.totalProcessed,
        ditambahkan: outcome.created,
        diperbarui: outcome.updated,
        dilewati: outcome.skipped,
        gagal: outcome.errors.length,
      },
      ip,
    });

    return NextResponse.json({
      message: "Proses import selesai",
      ...outcome,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses import produk" },
      { status: 500 }
    );
  }
}
