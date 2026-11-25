/**
 * Format mata uang Rupiah integer: contoh 12500 -> "Rp 12.500"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "Rp 0";
  }
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rp ${formatted}`;
}

/**
 * Format jumlah kuantitas desimal (maksimal 3 desimal, tanpa trailing zero berlebih)
 * contoh: 0.5 -> "0,5", 250 -> "250", 1.25 -> "1,25"
 */
export function formatDecimal(qty: number | string | null | undefined): string {
  if (qty === null || qty === undefined) return "0";
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

/**
 * Format tanggal dan jam lokal Indonesia
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(d);
}

/**
 * Format hari dan tanggal lengkap Indonesia: contoh "Sabtu, 21 Nov 2026"
 */
export function formatDayDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Parse string Rupiah/angka berpemisah titik ke number murni
 * contoh: "Rp 15.000" -> 15000, "1.500.000" -> 1500000
 */
export function parseRupiah(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const digits = String(value).replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Format angka ke string ribuan (contoh: 15000 -> "15.000")
 */
export function formatNumberThousand(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return "";
  }
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Safe UUID v4 generator for both Secure (HTTPS/localhost) and Non-Secure contexts (HTTP on Wi-Fi IP)
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const METODE_BAYAR_LABELS: Record<string, string> = {
  TUNAI: "Tunai",
  TRANSFER: "QRIS",
  QRIS: "QRIS",
  KASBON: "Kasbon",
};

/**
 * Format kode metode bayar ke label yang ramah pengguna
 */
export function formatMetodeBayar(metode?: string | null): string {
  if (!metode) return "Tunai";
  return METODE_BAYAR_LABELS[metode.toUpperCase()] || metode;
}



