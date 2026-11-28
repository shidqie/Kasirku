import { isBlockedQrDomain } from "./barcode-blocklist";

export type BarcodeSource = "ean" | "gtin" | "qr" | "manual";

export type ParseScanResult =
  | { type: "product"; code: string; source: Exclude<BarcodeSource, "manual"> }
  | { type: "ignore" };

/**
 * Normalisasi GTIN-14 yang diawali angka 0 menjadi EAN-13 (13 digit) bila sesuai.
 */
export function normalizeGtin(gtin: string): string {
  const digits = gtin.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Validasi checksum standar EAN-13 (opsional).
 */
export function isValidEan13Checksum(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(code[12]);
}

/**
 * Mem-parse hasil mentah dari scanner kamera / barcode reader:
 * - Hanya angka 8..14 digit → produk
 * - Link http/https:
 *   - Domain blokir halal (halal.go.id, bpjph.halal.go.id, sihalal.halal.go.id, subdomain) → ignore
 *   - GS1 Digital Link (/01/<GTIN>) → produk
 *   - Link lain → ignore
 * - Format GS1 mentah "(01)..." atau "01..." (14 digit GTIN) → produk
 * - Selain itu → ignore (diam-diam)
 */
export function parseScan(raw: string): ParseScanResult {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { type: "ignore" };

  // 1. Angka murni 8..14 digit (EAN-8, UPC-E, UPC-A, EAN-13, GTIN-14)
  if (/^\d{8,14}$/.test(trimmed)) {
    return { type: "product", code: trimmed, source: "ean" };
  }

  // 2. Link http/https
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (isBlockedQrDomain(url.hostname)) {
        return { type: "ignore" };
      }

      // GS1 Digital Link: path mengandung /01/<GTIN>
      const gs1Match = url.pathname.match(/\/01\/(\d{8,14})(?:\/|$)/);
      if (gs1Match && gs1Match[1]) {
        return {
          type: "product",
          code: normalizeGtin(gs1Match[1]),
          source: "qr",
        };
      }

      return { type: "ignore" };
    } catch {
      return { type: "ignore" };
    }
  }

  // 3. Format GS1 mentah: "(01)xxxxxxxxxxxxxx"
  const gs1ParenMatch = trimmed.match(/^\(01\)(\d{8,14})(?:[^0-9].*)?$/);
  if (gs1ParenMatch && gs1ParenMatch[1]) {
    return {
      type: "product",
      code: normalizeGtin(gs1ParenMatch[1]),
      source: "gtin",
    };
  }

  // Format GS1 mentah tanpa kurung: "01" + 14 digit GTIN (mis. "0108996001600142")
  const gs1PlainMatch = trimmed.match(/^01(\d{14})(?:\D.*)?$/);
  if (gs1PlainMatch && gs1PlainMatch[1]) {
    return {
      type: "product",
      code: normalizeGtin(gs1PlainMatch[1]),
      source: "gtin",
    };
  }

  // 4. Teks acak / format tidak dikenal -> ignore diam-diam
  return { type: "ignore" };
}
