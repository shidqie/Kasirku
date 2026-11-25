/**
 * Utilitas QRIS EMVCo (Bank Indonesia Standard)
 * Mendukung validasi payload QRIS Statis, ekstraksi nama merchant,
 * dan konversi QRIS Statis -> QRIS Dinamis dengan nominal otomatis + CRC16.
 */

interface TlvEntry {
  tag: string;
  value: string;
}

export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseTlv(payload: string): TlvEntry[] {
  const entries: TlvEntry[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > payload.length) break;
    const value = payload.slice(i + 4, i + 4 + len);
    entries.push({ tag, value });
    i += 4 + len;
  }
  return entries;
}

function serializeTlv(entries: TlvEntry[]): string {
  return entries
    .map(({ tag, value }) => {
      const len = value.length.toString().padStart(2, "0");
      return `${tag}${len}${value}`;
    })
    .join("");
}

export function isValidQrisPayload(payload?: string | null): boolean {
  if (!payload) return false;
  const trimmed = payload.trim();
  if (!trimmed.startsWith("000201")) return false;
  const crcIdx = trimmed.lastIndexOf("6304");
  if (crcIdx === -1 || crcIdx + 8 !== trimmed.length) return false;
  const bodyWithoutCrcValue = trimmed.slice(0, crcIdx + 4);
  const expectedCrc = crc16ccitt(bodyWithoutCrcValue);
  const actualCrc = trimmed.slice(crcIdx + 4).toUpperCase();
  return expectedCrc === actualCrc;
}

export function extractQrisMerchantName(payload?: string | null): string | null {
  if (!payload) return null;
  const entries = parseTlv(payload.trim());
  const merchant = entries.find((e) => e.tag === "59");
  return merchant ? merchant.value.trim() : null;
}

export function convertStaticQrisToDynamic(staticPayload: string, amount: number): string {
  const trimmed = staticPayload.trim();
  const crcIdx = trimmed.lastIndexOf("6304");
  const rawBody = crcIdx !== -1 ? trimmed.slice(0, crcIdx) : trimmed;
  const entries = parseTlv(rawBody);

  const amountStr = Math.max(0, Math.round(amount)).toString();
  const updated: TlvEntry[] = [];
  let amountInserted = false;

  for (const entry of entries) {
    if (entry.tag === "01") {
      // 11 = Static, 12 = Dynamic
      updated.push({ tag: "01", value: "12" });
    } else if (entry.tag === "54") {
      // Replace existing amount
      if (!amountInserted && amount > 0) {
        updated.push({ tag: "54", value: amountStr });
        amountInserted = true;
      }
    } else if (entry.tag === "58") {
      if (!amountInserted && amount > 0) {
        updated.push({ tag: "54", value: amountStr });
        amountInserted = true;
      }
      updated.push(entry);
    } else if (entry.tag !== "63") {
      updated.push(entry);
    }
  }

  if (!amountInserted && amount > 0) {
    updated.push({ tag: "54", value: amountStr });
  }

  const bodyWithCrcTag = `${serializeTlv(updated)}6304`;
  const crc = crc16ccitt(bodyWithCrcTag);
  return `${bodyWithCrcTag}${crc}`;
}
