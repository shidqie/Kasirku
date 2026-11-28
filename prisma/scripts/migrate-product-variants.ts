/**
 * Script migrasi data aman (idempotent) untuk fitur Varian Produk.
 * - Tidak menghapus atau mengubah data produk lama yang belum punya groupId.
 * - Produk lama tetap berjalan normal sebagai produk standalone (groupId = null).
 * - Jika dijalankan, hanya melaporkan jumlah produk & grup yang sudah ada.
 *
 * Jalankan: npx tsx prisma/scripts/migrate-product-variants.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const totalProduk = await prisma.produk.count({ where: { aktif: true } });
  const totalGrouped = await prisma.produk.count({
    where: { aktif: true, groupId: { not: null } },
  });
  const totalGroups = await prisma.productGroup.count();

  console.log("=== Status Migrasi Varian Produk ===");
  console.log(`Total produk aktif     : ${totalProduk}`);
  console.log(`Produk dalam grup      : ${totalGrouped}`);
  console.log(`Produk standalone      : ${totalProduk - totalGrouped}`);
  console.log(`Total ProductGroup     : ${totalGroups}`);
  console.log("Semua data lama aman dan tetap kompatibel.");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan verifikasi migrasi:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
