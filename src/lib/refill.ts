/**
 * Deteksi default apakah produk termasuk barang isi ulang (Galon)
 * yang memiliki stok terisi dan stok kosong.
 */
export function isRefillProduct(nama: string): boolean {
  if (!nama) return false;
  return /\bgalon\b/i.test(nama);
}
