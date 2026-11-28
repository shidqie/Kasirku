/**
 * Migrasi aman (idempotent): menyalin kolom `produk.barcode` yang sudah ada
 * ke tabel `product_barcode` tanpa menghapus data lama.
 *
 * Jalankan: npx tsx prisma/scripts/migrate-product-barcodes.ts
 */
import { PrismaClient } from "@prisma/client";
import { parseScan } from "../../src/lib/barcode";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.produk.findMany({
    where: { barcode: { not: null } },
    select: { id: true, nama: true, barcode: true },
  });

  let copied = 0;
  let skipped = 0;

  for (const p of products) {
    const clean = p.barcode?.trim();
    if (!clean) continue;

    const parsed = parseScan(clean);
    const source = parsed.type === "product" ? parsed.source : "manual";

    const exists = await prisma.productBarcode.findUnique({
      where: { code: clean },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.productBarcode.create({
      data: {
        productId: p.id,
        code: clean,
        source,
      },
    });
    copied++;
  }

  console.log("=== Migrasi ProductBarcode Selesai ===");
  console.log(`Disalin baru : ${copied}`);
  console.log(`Sudah ada    : ${skipped}`);
}

main()
  .catch((err) => {
    console.error("Gagal migrasi ProductBarcode:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
