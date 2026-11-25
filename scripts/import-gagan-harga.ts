/**
 * Impor daftar harga Toko Gagan 2 ke master data produk.
 *
 * Sumber: Daftar_Harga_Toko_Gagan_2_Rapi.xlsx
 * Data hasil pemetaan: scripts/data/gagan-harga.json
 *
 * Jalankan: npx tsx scripts/import-gagan-harga.ts
 *
 * Catatan:
 * - Harga beli tidak tersedia di daftar harga, diisi 0.
 * - Stok awal 0 (silakan isi lewat menu Stok / Barang Masuk / Opname).
 * - Produk "Beras" yang sudah ada digabung (stok lama dipertahankan).
 * - Aman dijalankan ulang: produk dengan nama + kategori yang sama akan dilewati.
 */
import { PrismaClient, Prisma, Role } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface SatuanItem {
  namaSatuan: string;
  faktorKeDasar: number;
  hargaJual: number;
  hargaBeli: number;
  isDefault: boolean;
}

interface ProdukItem {
  nama: string;
  kategori: string;
  satuanDasar: string;
  stokMinimum: number;
  satuan: SatuanItem[];
}

const DATA_FILE = path.join(
  process.cwd(),
  "scripts",
  "data",
  "gagan-harga.json"
);

async function main() {
  const items: ProdukItem[] = JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );

  const owner = await prisma.user.findFirst({ where: { role: Role.OWNER } });
  if (!owner) {
    throw new Error("Akun OWNER tidak ditemukan. Jalankan seed terlebih dahulu.");
  }

  const kategoriNames = Array.from(new Set(items.map((i) => i.kategori)));
  const kategoriMap = new Map<string, string>();

  for (const nama of kategoriNames) {
    const kategori = await prisma.kategori.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    kategoriMap.set(nama, kategori.id);
  }
  console.log(`✅ ${kategoriNames.length} kategori siap.`);

  let created = 0;
  let merged = 0;
  let skipped = 0;
  const errors: { nama: string; reason: string }[] = [];

  for (const item of items) {
    const kategoriId = kategoriMap.get(item.kategori);
    if (!kategoriId) {
      errors.push({ nama: item.nama, reason: "Kategori tidak ditemukan" });
      continue;
    }

    try {
      // Gabungkan dengan produk Beras yang sudah ada agar stok lama tidak hilang.
      if (item.nama === "Beras") {
        const existing = await prisma.produk.findFirst({
          where: { nama: "Beras" },
          include: { satuanProduk: true },
        });

        if (existing) {
          await prisma.$transaction(async (tx) => {
            await tx.produk.update({
              where: { id: existing.id },
              data: { kategoriId, satuanDasar: item.satuanDasar },
            });

            for (const unit of item.satuan) {
              const found = existing.satuanProduk.find(
                (s) => s.namaSatuan === unit.namaSatuan
              );
              if (found) {
                await tx.satuanProduk.update({
                  where: { id: found.id },
                  data: {
                    faktorKeDasar: new Prisma.Decimal(unit.faktorKeDasar),
                    hargaJual: unit.hargaJual,
                    isDefault: unit.isDefault,
                  },
                });
              } else {
                await tx.satuanProduk.create({
                  data: {
                    produkId: existing.id,
                    namaSatuan: unit.namaSatuan,
                    faktorKeDasar: new Prisma.Decimal(unit.faktorKeDasar),
                    hargaJual: unit.hargaJual,
                    hargaBeli: unit.hargaBeli,
                    isDefault: unit.isDefault,
                  },
                });
              }
            }
          });
          merged++;
          continue;
        }
      }

      const duplicate = await prisma.produk.findFirst({
        where: { nama: item.nama, kategoriId },
        select: { id: true },
      });
      if (duplicate) {
        skipped++;
        continue;
      }

      await prisma.produk.create({
        data: {
          nama: item.nama,
          kategoriId,
          satuanDasar: item.satuanDasar,
          stokMinimum: new Prisma.Decimal(item.stokMinimum ?? 0),
          stokCache: new Prisma.Decimal(0),
          satuanProduk: {
            create: item.satuan.map((unit) => ({
              namaSatuan: unit.namaSatuan,
              faktorKeDasar: new Prisma.Decimal(unit.faktorKeDasar),
              hargaJual: unit.hargaJual,
              hargaBeli: unit.hargaBeli,
              isDefault: unit.isDefault,
            })),
          },
        },
      });
      created++;
    } catch (err: any) {
      errors.push({
        nama: item.nama,
        reason: err?.message || "Gagal menyimpan produk",
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: owner.id,
      role: owner.role,
      aksi: "IMPORT_PRODUK",
      entitas: "PRODUK",
      sesudahJson: {
        sumber: "Daftar_Harga_Toko_Gagan_2_Rapi.xlsx",
        total: items.length,
        dibuat: created,
        digabung: merged,
        dilewati: skipped,
        gagal: errors.length,
      },
    },
  });

  console.log("────────────────────────────────────────────");
  console.log(`Total baris      : ${items.length}`);
  console.log(`Produk baru      : ${created}`);
  console.log(`Digabung (Beras) : ${merged}`);
  console.log(`Dilewati (sudah) : ${skipped}`);
  console.log(`Gagal            : ${errors.length}`);
  if (errors.length) {
    for (const e of errors.slice(0, 20)) {
      console.log(`  ✗ ${e.nama}: ${e.reason}`);
    }
  }
  console.log("────────────────────────────────────────────");

  if (errors.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
