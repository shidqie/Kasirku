/**
 * Migrasi aman (idempotent) untuk kolom `produk.sku`, setting `aktifkan_harga_beli`,
 * dan tabel `riwayat_harga`.
 * - Tidak menghapus atau mengubah produk/transaksi/harga beli lama yang sudah ada.
 * - Mengisi SKU otomatis (`PRD-[KAT]-NNN`) hanya untuk produk yang belum memiliki SKU.
 *
 * Jalankan: npx tsx prisma/scripts/migrate-sku-and-price-history.ts
 */
import { PrismaClient } from "@prisma/client";
import { getCategoryPrefix } from "../../src/lib/codification";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.produk.findMany({
    orderBy: [{ createdAt: "asc" }, { nama: "asc" }],
    include: { kategori: { select: { nama: true } } },
  });

  const usedSkus = new Set<string>(
    products
      .map((p) => p.sku?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s))
  );

  const prefixCounters = new Map<string, number>();
  // Inisialisasi counter dari SKU berpola PRD-XXX-NNN yang sudah ada
  for (const sku of Array.from(usedSkus)) {
    const match = /^PRD-([A-Z0-9]{3})-(\d+)$/.exec(sku);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      prefixCounters.set(prefix, Math.max(prefixCounters.get(prefix) || 0, num));
    }
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const p of products) {
    if (p.sku && p.sku.trim() !== "") {
      skippedCount++;
      continue;
    }

    const prefix = getCategoryPrefix(p.kategori?.nama);
    let seq = (prefixCounters.get(prefix) || 0) + 1;
    let candidate = `PRD-${prefix}-${String(seq).padStart(3, "0")}`;
    while (usedSkus.has(candidate)) {
      seq++;
      candidate = `PRD-${prefix}-${String(seq).padStart(3, "0")}`;
    }

    prefixCounters.set(prefix, seq);
    usedSkus.add(candidate);

    await prisma.produk.update({
      where: { id: p.id },
      data: { sku: candidate },
    });
    updatedCount++;
  }

  const settings = await prisma.pengaturanToko.findUnique({ where: { id: "default" } });

  console.log("=== Migrasi SKU & Pengaturan Harga Beli Selesai ===");
  console.log(`Total produk           : ${products.length}`);
  console.log(`SKU baru ditambahkan   : ${updatedCount}`);
  console.log(`Sudah punya SKU        : ${skippedCount}`);
  console.log(`Fitur harga beli aktif : ${settings?.aktifkanHargaBeli ?? true}`);
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan migrasi SKU:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
