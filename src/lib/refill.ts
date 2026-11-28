/**
 * Deteksi apakah produk termasuk barang isi ulang (Tabung Gas / Galon Aqua)
 * yang memiliki stok terisi dan stok kosong.
 */
export function isRefillProduct(nama: string): boolean {
  if (!nama) return false;
  if (/\b(galon|gas|lpg|elpiji)\b/i.test(nama)) return true;
  if (/\baqua\b/i.test(nama) && !/\b(botol|gelas|cup|dus|ml|liter|ltr)\b/i.test(nama)) {
    return true;
  }
  return false;
}
