import { PrismaClient } from "@prisma/client";
import { detectBrandFromName } from "../src/lib/brand-detector";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.produk.findMany({
    where: { aktif: true },
    select: {
      id: true,
      nama: true,
      merek: true,
      group: { select: { brand: true } },
    },
    orderBy: { nama: "asc" },
  });

  let updatedCount = 0;
  let skippedExisting = 0;
  let unbrandedCount = 0;
  const brandStats = new Map<string, number>();

  for (const p of products) {
    if (p.merek && p.merek.trim()) {
      skippedExisting++;
      continue;
    }

    const detected = detectBrandFromName(p.nama, p.group?.brand);
    if (!detected) {
      unbrandedCount++;
      continue;
    }

    await prisma.produk.update({
      where: { id: p.id },
      data: { merek: detected },
    });
    updatedCount++;
    brandStats.set(detected, (brandStats.get(detected) || 0) + 1);
  }

  console.log(`Total produk aktif: ${products.length}`);
  console.log(`Sudah punya merek: ${skippedExisting}`);
  console.log(`Merek berhasil diisi otomatis: ${updatedCount}`);
  console.log(`Tanpa merek (curah/generik): ${unbrandedCount}`);
  console.log(`Total merek unik terdeteksi: ${brandStats.size}`);
  const topBrands = Array.from(brandStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  console.log("Top 20 merek:", topBrands);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
