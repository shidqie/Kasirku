/**
 * Utilitas kodifikasi ID standar untuk Produk, Pelanggan (Member), dan Nota Bon Manual.
 */

export function getCategoryPrefix(categoryName?: string | null): string {
  const cleaned = String(categoryName || "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();

  if (!cleaned) return "UMM";

  const letters = cleaned.replace(/\s+/g, "");
  if (letters.length >= 3) {
    return letters.slice(0, 3);
  }
  return letters.padEnd(3, "X");
}

export function formatProductCode(
  categoryName?: string | null,
  sequenceNumber = 1
): string {
  const prefix = getCategoryPrefix(categoryName);
  const seq = Math.max(1, Math.floor(sequenceNumber));
  return `PRD-${prefix}-${String(seq).padStart(3, "0")}`;
}

export function formatMemberCode(sequenceNumber = 1): string {
  const seq = Math.max(1, Math.floor(sequenceNumber));
  return `MBR-${String(seq).padStart(4, "0")}`;
}

export function formatBonCode(
  dateInput: Date | string,
  sequenceNumber = 1
): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const day = String(validDate.getDate()).padStart(2, "0");
  const seq = Math.max(1, Math.floor(sequenceNumber));
  return `BON-${year}${month}${day}-${String(seq).padStart(3, "0")}`;
}
