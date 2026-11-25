/**
 * pdf-receipt.ts
 * Generates an exact replica of the new digital receipt layout (80mm width).
 * Rendered in-browser via jsPDF.
 */

import { formatRupiah, formatDecimal } from "@/lib/formatters";

export interface StoreInfo {
  namaToko: string;
  alamat?: string | null;
  telepon?: string | null;
  footerStruk?: string | null;
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

export async function generateReceiptPDF(
  transaksi: TransaksiForPDF,
  storeInfo: StoreInfo
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  // First pass: measure height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testDoc: any = new jsPDF({ unit: "mm", format: [PW, 500], orientation: "portrait" });
  const finalH = renderReceipt(testDoc, transaksi, storeInfo);

  // Second pass: render with exact height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = new jsPDF({ unit: "mm", format: [PW, Math.max(80, finalH + 4)], orientation: "portrait" });
  renderReceipt(doc, transaksi, storeInfo);

  doc.save(`struk-${transaksi.nomorStruk}.pdf`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderReceipt(doc: any, transaksi: TransaksiForPDF, storeInfo: StoreInfo): number {
  let y = 0;

  const font = (size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
  };

  const color = (...rgb: [number, number, number]) => doc.setTextColor(...rgb);
  const fill = (...rgb: [number, number, number]) => doc.setFillColor(...rgb);
  const draw = (...rgb: [number, number, number]) => doc.setDrawColor(...rgb);

  // 1. Red top bar (1.8mm ~ 5pt)
  fill(...C_RED_TOP);
  doc.rect(0, 0, PW, 1.8, "F");
  y = 6.5;

  // 2. Store Header (Centered)
  font(11, true);
  color(...C_DARK);
  doc.text(storeInfo.namaToko.toUpperCase(), PW / 2, y, { align: "center" });

  y += 4.2;
  font(6.5, false);
  color(...C_MUTED);
  if (storeInfo.alamat) {
    doc.text(storeInfo.alamat, PW / 2, y, { align: "center" });
    y += 3.5;
  }
  if (storeInfo.telepon) {
    const telpText = storeInfo.telepon.toLowerCase().includes("telp")
      ? storeInfo.telepon
      : `Telp/WA ${storeInfo.telepon}`;
    doc.text(telpText, PW / 2, y, { align: "center" });
    y += 3.5;
  }

  // 3. Status Badge: LUNAS (Centered pill)
  y += 1.5;
  const badgeW = 16.5;
  const badgeH = 5;
  const badgeX = (PW - badgeW) / 2;
  fill(...C_GREEN_BG);
  doc.roundedRect(badgeX, y - 3.6, badgeW, badgeH, 1, 1, "F");

  font(6.5, true);
  color(...C_GREEN_TEXT);
  doc.text("LUNAS", PW / 2, y - 0.2, { align: "center" });
  y += 5.5;

  // 4. Metadata Rows (No. Transaksi, Tanggal, Kasir, Pelanggan)
  const metaRows: [string, string][] = [
    ["No. Transaksi", transaksi.nomorStruk],
    ["Tanggal", formatTanggalWIB(transaksi.dibuatPada)],
    ["Kasir", transaksi.kasir?.nama || "Pemilik Toko"],
    ["Pelanggan", transaksi.member?.nama || "Umum"],
  ];

  for (const [k, v] of metaRows) {
    font(6.5, false);
    color(...C_MUTED);
    doc.text(k, ML, y);

    font(6.5, true);
    color(...C_DARK);
    doc.text(v, XR, y, { align: "right" });
    y += 4.0;
  }

  // 5. Divider Line
  y += 1.0;
  draw(...C_BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, y, XR, y);
  y += 3.5;

  // 6. Section Label: ITEM PEMBELIAN
  font(5.8, true);
  color(...C_MUTED);
  doc.text("ITEM PEMBELIAN", ML, y);
  y += 4.0;

  // 7. Items
  const items = transaksi.items || [];
  for (const it of items) {
    // Row 1: Nama Barang (Bold, 7.5pt)
    font(7.5, true);
    color(...C_DARK);
    doc.text(it.namaSnapshot, ML, y);
    y += 3.5;

    // Row 2: Qty info (left) & Subtotal (right)
    font(6.5, false);
    color(...C_MUTED);
    const qtyText = `${formatDecimal(it.qty)} ${it.satuanSnapshot} x ${formatRupiah(it.hargaJualSnapshot)}${
      it.catatan ? `  (${it.catatan})` : ""
    }`;
    doc.text(qtyText, ML, y);

    font(6.5, true);
    color(...C_DARK);
    doc.text(formatRupiah(it.subtotal), XR, y, { align: "right" });
    y += 5.0;
  }

  // 8. Divider Line
  y += 0.5;
  draw(...C_BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, y, XR, y);
  y += 3.8;

  // 9. Summary: Jumlah item & Subtotal
  const totalItemCount = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
  font(7.0, false);
  color(...C_MUTED);
  doc.text("Jumlah item", ML, y);
  font(7.0, false);
  color(...C_DARK);
  doc.text(`${totalItemCount} barang`, XR, y, { align: "right" });
  y += 4.2;

  font(7.0, false);
  color(...C_MUTED);
  doc.text("Subtotal", ML, y);
  font(7.0, false);
  color(...C_DARK);
  doc.text(formatRupiah(transaksi.subtotal), XR, y, { align: "right" });
  y += 4.5;

  // 10. Divider Line
  draw(...C_BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, y, XR, y);
  y += 4.5;

  // 11. TOTAL BAYAR (Besar, Merah)
  font(7.5, true);
  color(...C_DARK);
  doc.text("TOTAL BAYAR", ML, y);

  font(13.5, true);
  color(...C_TOTAL_RED);
  doc.text(formatRupiah(transaksi.total), XR, y, { align: "right" });
  y += 5.5;

  // 12. Divider Line
  draw(...C_BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, y, XR, y);
  y += 4.0;

  // 13. Metode Bayar, Uang Diterima, Kembalian
  const bayar = transaksi.pembayaran?.[0];
  const metode = bayar?.metode || "TUNAI";

  font(7.0, false);
  color(...C_MUTED);
  doc.text("Metode bayar", ML, y);
  font(7.0, true);
  color(...C_DARK);
  doc.text(metode, XR, y, { align: "right" });
  y += 4.2;

  if (metode === "TUNAI") {
    const uangDiterima = bayar?.uangDiterima || transaksi.total;
    const kembalian = bayar?.kembalian ?? Math.max(0, uangDiterima - transaksi.total);

    font(7.0, false);
    color(...C_MUTED);
    doc.text("Uang diterima", ML, y);
    font(7.0, false);
    color(...C_DARK);
    doc.text(formatRupiah(uangDiterima), XR, y, { align: "right" });
    y += 4.2;

    font(7.0, false);
    color(...C_MUTED);
    doc.text("Kembalian", ML, y);
    font(7.0, true);
    color(...C_DARK);
    doc.text(formatRupiah(kembalian), XR, y, { align: "right" });
    y += 5.0;
  }

  // 14. Kebijakan Retur / Catatan Box (Toner peach #fdf0f0)
  y += 1.0;
  const boxH = 17;
  fill(...C_FOOTER_BG);
  doc.roundedRect(ML, y, CW, boxH, 1.5, 1.5, "F");

  y += 4.2;
  font(6.2, false);
  color(...C_DARK);
  doc.text(
    "Barang yang sudah dibeli dapat ditukar maks. 2 hari",
    PW / 2,
    y,
    { align: "center" }
  );
  y += 3.2;
  doc.text(
    "dengan struk ini (kecuali makanan/minuman).",
    PW / 2,
    y,
    { align: "center" }
  );
  y += 4.2;
  font(6.5, true);
  color(...C_DARK);
  doc.text(
    storeInfo.footerStruk || "Terima kasih, selamat berbelanja kembali",
    PW / 2,
    y,
    { align: "center" }
  );

  y += 8.5;

  // 15. Struk digital Footer bar
  font(5.8, false);
  color(...C_MUTED);
  doc.text(
    `Struk digital  |  Kasirku POS  |  ${formatTanggalShort(transaksi.dibuatPada)}`,
    PW / 2,
    y,
    { align: "center" }
  );

  y += 4;
  return y;
}
