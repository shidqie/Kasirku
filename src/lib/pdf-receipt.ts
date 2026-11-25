/**
 * pdf-receipt.ts
 * Generates an exact replica of the new digital receipt layout (80mm width).
 * Rendered in-browser via jsPDF.
 */

import { formatRupiah, formatDecimal, formatMetodeBayar } from "@/lib/formatters";
import { registerPdfFont } from "@/lib/pdf-fonts";

export interface StoreInfo {
  namaToko: string;
  alamat?: string | null;
  telepon?: string | null;
  headerStruk?: string | null;
  footerStruk?: string | null;
  catatanRetur?: string | null;
  logoToko?: string | null;
}

export interface TransaksiForPDF {
  nomorStruk: string;
  dibuatPada: string | Date;
  kasir?: { nama: string } | null;
  member?: { nama: string } | null;
  items: Array<{
    id: string;
    namaSnapshot: string;
    satuanSnapshot: string;
    qty: number | string;
    hargaJualSnapshot: number;
    subtotal: number;
    catatan?: string | null;
  }>;
  subtotal: number;
  diskon: number;
  pembulatan: number;
  total: number;
  pembayaran?: Array<{
    metode: string;
    uangDiterima?: number | null;
    kembalian?: number | null;
  }> | null;
}

// ─── Colors (R, G, B) ─────────────────────────────────────────────────────────
const C_RED_TOP:    [number, number, number] = [193, 31, 31];   // #c11f1f
const C_DARK:       [number, number, number] = [15, 23, 42];    // #0f172a
const C_MUTED:      [number, number, number] = [100, 116, 139]; // #64748b
const C_BORDER:     [number, number, number] = [203, 213, 225]; // #cbd5e1
const C_GREEN_BG:   [number, number, number] = [220, 252, 231]; // #dcfce7
const C_GREEN_TEXT: [number, number, number] = [22, 163, 74];   // #16a34a
const C_TOTAL_RED:  [number, number, number] = [193, 31, 31];   // #c11f1f
const C_FOOTER_BG:  [number, number, number] = [253, 240, 240]; // #fdf0f0

// 80mm = ~226.77 pt
const PW = 80;
const ML = 5.6;     // ~16pt = 5.64mm
const MR = 5.6;
const CW = PW - ML - MR;
const XR = PW - MR;

function formatTanggalWIB(d: string | Date) {
  const date = new Date(d);
  const tglStr = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const jam = String(date.getHours()).padStart(2, "0");
  const mnt = String(date.getMinutes()).padStart(2, "0");
  return `${tglStr}, ${jam}.${mnt} WIB`;
}

function formatTanggalShort(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function getLogoBase64(logoToko?: string | null): Promise<string | null> {
  if (logoToko) return logoToko;
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildReceiptFilename(transaksi: TransaksiForPDF, _storeInfo: StoreInfo): string {
  const d = new Date(transaksi.dibuatPada);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tgl = isNaN(d.getTime())
    ? "0000-00-00"
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const parts = String(transaksi.nomorStruk || "").split("-");
  const urutan = parts[parts.length - 1] || "001";

  return `TRANSAKSI_HARIAN_${tgl}_${urutan}.pdf`;
}

export async function generateReceiptPDF(
  transaksi: TransaksiForPDF,
  storeInfo: StoreInfo
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const logoBase64 = await getLogoBase64(storeInfo.logoToko);

  // First pass: measure height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testDoc: any = new jsPDF({ unit: "mm", format: [PW, 500], orientation: "portrait" });
  const fontFamily = await registerPdfFont(testDoc);
  const finalH = renderReceipt(testDoc, transaksi, storeInfo, logoBase64, fontFamily);

  // Second pass: render with exact height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = new jsPDF({ unit: "mm", format: [PW, Math.max(80, finalH + 4)], orientation: "portrait" });
  await registerPdfFont(doc);
  renderReceipt(doc, transaksi, storeInfo, logoBase64, fontFamily);

  doc.save(buildReceiptFilename(transaksi, storeInfo));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderReceipt(
  doc: any,
  transaksi: TransaksiForPDF,
  storeInfo: StoreInfo,
  logoBase64: string | null,
  fontFamily = "helvetica"
): number {
  let y = 0;

  const font = (size: number, bold = false) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
  };

  const color = (...rgb: [number, number, number]) => doc.setTextColor(...rgb);
  const fill = (...rgb: [number, number, number]) => doc.setFillColor(...rgb);
  const draw = (...rgb: [number, number, number]) => doc.setDrawColor(...rgb);

  const bayar = transaksi.pembayaran?.[0];
  const metode = bayar?.metode || "TUNAI";
  const isKasbon = metode === "KASBON";

  // 1. Header Toko (Logo kiri + Nama & Alamat)
  y = 7;
  let headerTextX = ML;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", ML, y, 9, 9);
      headerTextX = ML + 11.5;
    } catch {}
  }

  font(8.5, true);
  color(...C_DARK);
  doc.text(storeInfo.namaToko || "Toko Sembako", headerTextX, y + 3.6);

  font(6.0, false);
  color(...C_MUTED);
  const subInfo = [storeInfo.alamat, storeInfo.telepon].filter(Boolean).join(" · ") || "Kasirku POS";
  const maxSubW = XR - headerTextX;
  const subLines = doc.splitTextToSize(subInfo, maxSubW);
  doc.text(subLines[0] || subInfo, headerTextX, y + 7.2);
  if (storeInfo.headerStruk) {
    font(5.8, false);
    color(...C_MUTED);
    doc.text(storeInfo.headerStruk, headerTextX, y + 10.5);
    y += 16.5;
  } else {
    y += 14;
  }

  // 2. Hero: Status Pill + Total bayar
  const statusLabel = isKasbon ? "Belum lunas (Kasbon)" : "Lunas";
  const badgeW = isKasbon ? 30 : 16;
  const badgeH = 5;
  const badgeX = (PW - badgeW) / 2;
  const pillBg: [number, number, number] = isKasbon ? [253, 232, 238] : [227, 246, 238];
  const pillFg: [number, number, number] = isKasbon ? [200, 22, 64] : [10, 143, 90];
  fill(...pillBg);
  doc.roundedRect(badgeX, y, badgeW, badgeH, 2.5, 2.5, "F");

  fill(...pillFg);
  doc.circle(badgeX + 3, y + badgeH / 2, 0.75, "F");

  font(6.5, true);
  color(...pillFg);
  doc.text(statusLabel, badgeX + 5.2, y + 3.4);
  y += 9;

  font(6.5, false);
  color(...C_MUTED);
  doc.text("Total bayar", PW / 2, y, { align: "center" });
  y += 6.5;

  const formattedNum = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(transaksi.total || 0)
  );
  font(19, true);
  color(...C_DARK);
  const numW = doc.getTextWidth(formattedNum);
  font(8.5, true);
  const rpW = doc.getTextWidth("Rp ");
  const totalStartX = (PW - (rpW + numW)) / 2;

  font(8.5, true);
  color(...C_MUTED);
  doc.text("Rp ", totalStartX, y);

  font(19, true);
  color(...C_DARK);
  doc.text(formattedNum, totalStartX + rpW, y);
  y += 6;

  // 3. Dashed Separator
  draw(...C_BORDER);
  doc.setLineWidth(0.25);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(ML, y, XR, y);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
  y += 4.5;

  // 4. Metadata Rows
  const metaRows: [string, string][] = [
    ["No. transaksi", transaksi.nomorStruk],
    ["Tanggal", formatTanggalWIB(transaksi.dibuatPada)],
    ["Kasir", transaksi.kasir?.nama || "Pemilik Toko"],
    ["Pelanggan", transaksi.member?.nama || "Umum"],
  ];

  for (const [k, v] of metaRows) {
    font(6.8, false);
    color(...C_MUTED);
    doc.text(k, ML, y);

    font(6.8, true);
    color(...C_DARK);
    doc.text(v, XR, y, { align: "right" });
    y += 4.2;
  }

  // 5. Dashed Separator
  y += 1;
  draw(...C_BORDER);
  doc.setLineWidth(0.25);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(ML, y, XR, y);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
  y += 5;

  // 6. Items
  const items = transaksi.items || [];
  for (const it of items) {
    font(7.5, true);
    color(...C_DARK);
    doc.text(it.namaSnapshot, ML, y);
    doc.text(formatRupiah(it.subtotal), XR, y, { align: "right" });
    y += 3.5;

    font(6.3, false);
    color(...C_MUTED);
    const qtyText = `${formatDecimal(it.qty)} ${it.satuanSnapshot} x ${formatRupiah(it.hargaJualSnapshot)}${
      it.catatan ? ` (${it.catatan})` : ""
    }`;
    doc.text(qtyText, ML, y);
    y += 5;
  }

  // 7. Solid Divider Line
  y += 0.5;
  draw(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(ML, y, XR, y);
  y += 4;

  // 8. Summary
  const totalItemCount = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
  font(6.8, false);
  color(...C_MUTED);
  doc.text(`Subtotal · ${formatDecimal(totalItemCount)} barang`, ML, y);
  doc.text(formatRupiah(transaksi.subtotal), XR, y, { align: "right" });
  y += 4;

  if (Number(transaksi.diskon || 0) > 0) {
    doc.text("Diskon", ML, y);
    doc.text(`-${formatRupiah(transaksi.diskon)}`, XR, y, { align: "right" });
    y += 4;
  }

  if (Number(transaksi.pembulatan || 0) !== 0) {
    doc.text("Pembulatan", ML, y);
    doc.text(
      `${transaksi.pembulatan > 0 ? "+" : ""}${formatRupiah(transaksi.pembulatan)}`,
      XR,
      y,
      { align: "right" }
    );
    y += 4;
  }

  if (metode === "TUNAI") {
    const uangDiterima = bayar?.uangDiterima || transaksi.total;
    const kembalian = bayar?.kembalian ?? Math.max(0, uangDiterima - transaksi.total);

    doc.text(formatMetodeBayar(metode), ML, y);
    doc.text(formatRupiah(uangDiterima), XR, y, { align: "right" });
    y += 4.2;

    font(7.5, true);
    color(...C_DARK);
    doc.text("Kembalian", ML, y);
    doc.text(formatRupiah(kembalian), XR, y, { align: "right" });
    y += 5.5;
  } else {
    font(7.5, true);
    color(...C_DARK);
    doc.text("Metode Pembayaran", ML, y);
    doc.text(formatMetodeBayar(metode), XR, y, { align: "right" });
    y += 5.5;
  }

  // 9. Catatan Retur Box (Soft slate #f8fafc)
  const returText =
    storeInfo.catatanRetur || "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.";
  const returLines: string[] = doc.splitTextToSize(returText, CW - 8);
  const returBoxH = Math.max(9.5, returLines.length * 3.2 + 4.5);
  fill(248, 250, 252);
  doc.roundedRect(ML, y, CW, returBoxH, 2, 2, "F");

  font(6.0, false);
  color(...C_MUTED);
  returLines.forEach((line, idx) => {
    doc.text(line, PW / 2, y + 4.2 + idx * 3.2, { align: "center" });
  });
  y += returBoxH + 3.5;

  // 10. Decorative Barcode
  const barWidths = [1.0, 0.5, 1.4, 0.7, 0.5, 1.2, 0.5, 0.9, 1.4, 0.5, 1.0, 0.7, 0.5, 1.2, 0.7, 0.5, 1.4, 0.7, 1.0, 0.5, 1.2, 0.7, 0.5, 1.0];
  let bx = (PW - 40) / 2;
  fill(...C_DARK);
  for (let b = 0; b < barWidths.length; b++) {
    const w = barWidths[b];
    if (b % 2 === 0) {
      doc.rect(bx, y, w, 6, "F");
    }
    bx += w + 0.85;
  }
  y += 9.5;

  // 11. Footer
  font(7.0, true);
  color(...C_DARK);
  doc.text(storeInfo.footerStruk || "Terima kasih, selamat berbelanja kembali", PW / 2, y, {
    align: "center",
  });
  y += 4;

  font(6.0, false);
  color(...C_MUTED);
  doc.text("Struk digital · Kasirku POS", PW / 2, y, { align: "center" });
  y += 3;

  return y;
}
