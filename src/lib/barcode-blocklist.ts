/**
 * Daftar domain QR yang diblokir agar tidak salah terbaca sebagai barcode produk
 * (misalnya QR logo Halal BPJPH / SiHalal pada kemasan).
 * Subdomain dari domain di daftar ini otomatis ikut diblokir.
 */
export const BLOCKED_QR_DOMAINS: readonly string[] = [
  "halal.go.id",
  "bpjph.halal.go.id",
  "sihalal.halal.go.id",
];

export function isBlockedQrDomain(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  if (!clean) return false;
  return BLOCKED_QR_DOMAINS.some(
    (domain) => clean === domain || clean.endsWith(`.${domain}`)
  );
}
