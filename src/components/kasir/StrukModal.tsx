"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Printer, Share2, X, Download } from "lucide-react";
import { formatRupiah, formatDecimal, formatMetodeBayar } from "@/lib/formatters";
import { generateReceiptPDF } from "@/lib/pdf-receipt";
import { BuktiTransaksiUploader } from "@/components/shared/BuktiTransaksiUploader";

interface StrukModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: any;
  storeInfo: {
    namaToko: string;
    alamat?: string | null;
    telepon?: string | null;
    headerStruk?: string | null;
    footerStruk?: string | null;
    catatanRetur?: string | null;
    pesanWhatsApp?: string | null;
    logoToko?: string | null;
  };
}

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

export function StrukModal({ isOpen, onClose, transaksi, storeInfo }: StrukModalProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"digital" | "thermal">("digital");

  if (!isOpen || !transaksi) return null;

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generateReceiptPDF(transaksi, storeInfo);
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-receipt");
    const cleanup = () => {
      document.body.classList.remove("printing-receipt");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  const handleShareWhatsApp = () => {
    const itemsText = (transaksi.items || [])
      .map(
        (it: any) =>
          `• ${it.namaSnapshot} (${formatDecimal(it.qty)} ${it.satuanSnapshot}) = ${formatRupiah(
            it.subtotal
          )}`
      )
      .join("\n");

    const text = `*${storeInfo.namaToko.toUpperCase()}*\n${storeInfo.alamat || ""}\nTelp: ${
      storeInfo.telepon || "-"
    }\n----------------------------------\n*BUKTI PEMBAYARAN BELANJA*\nNo. Struk: ${
      transaksi.nomorStruk
    }\nWaktu: ${formatTanggalWIB(transaksi.dibuatPada)}\nKasir: ${
      transaksi.kasir?.nama || "Staff"
    }\n----------------------------------\n${itemsText}\n----------------------------------\nSubtotal: ${formatRupiah(
      transaksi.subtotal
    )}${
      transaksi.diskon > 0 ? `\nDiskon: -${formatRupiah(transaksi.diskon)}` : ""
    }${
      transaksi.pembulatan !== 0
        ? `\nPembulatan: ${transaksi.pembulatan > 0 ? "+" : ""}${formatRupiah(
            transaksi.pembulatan
          )}`
        : ""
    }\n*TOTAL BAYAR: ${formatRupiah(transaksi.total)}*\nMetode: ${
      formatMetodeBayar(transaksi.pembayaran?.[0]?.metode)
    }${
      transaksi.pembayaran?.[0]?.kembalian
        ? `\nKembalian: ${formatRupiah(transaksi.pembayaran[0].kembalian)}`
        : ""
    }\n----------------------------------\n${
      storeInfo.footerStruk || "Terima kasih, selamat berbelanja kembali"
    }`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const bayar = transaksi.pembayaran?.[0];
  const items = transaksi.items || [];
  const totalItemCount = items.reduce((sum: number, it: any) => sum + Number(it.qty || 0), 0);
  const metode = bayar?.metode || "TUNAI";
  const metodeLabel = formatMetodeBayar(metode);
  const uangDiterima = bayar?.uangDiterima || transaksi.total;
  const kembalian = bayar?.kembalian ?? Math.max(0, uangDiterima - transaksi.total);
  const isKasbon = metode === "KASBON";
  const formattedTotalNum = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(transaksi.total || 0)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="bg-slate-100 dark:bg-zinc-900 rounded-3xl max-w-[400px] w-full p-0 shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[95vh] overflow-hidden"
      >
        {/* Top Bar + Format Switcher (Tidak ikut tercetak) */}
        <div className="flex flex-col gap-2.5 px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:hidden shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-sans">
              E-Receipt
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setReceiptMode("digital")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                receiptMode === "digital"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Struk digital
            </button>
            <button
              type="button"
              onClick={() => setReceiptMode("thermal")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                receiptMode === "thermal"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Struk thermal 58 mm
            </button>
          </div>
        </div>

        {/* Receipt Stage — kertas selalu putih */}
        <div
          id="kasirku-print-receipt"
          className="flex-1 overflow-y-auto px-4 py-5 flex justify-center print:overflow-visible print:p-0 print:bg-white"
        >
          {receiptMode === "digital" ? (
            <div className="w-full max-w-[340px] bg-white text-slate-900 px-6 py-7 shadow-md rounded-2xl print:shadow-none print:rounded-none font-sans text-[13px] leading-relaxed h-fit">
              {/* Header Toko */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0 p-0.5">
                  <img
                    src={storeInfo.logoToko || "/logo.png"}
                    alt={storeInfo.namaToko}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="min-w-0">
                  <b className="block text-sm font-bold text-slate-900 tracking-tight truncate">
                    {storeInfo.namaToko}
                  </b>
                  <small className="block text-[11px] text-slate-500 truncate">
                    {[storeInfo.alamat, storeInfo.telepon].filter(Boolean).join(" · ") || "Kasirku POS"}
                  </small>
                  {storeInfo.headerStruk && (
                    <small className="block text-[10px] text-slate-400 truncate mt-0.5">
                      {storeInfo.headerStruk}
                    </small>
                  )}
                </div>
              </div>

              {/* Hero Total Bayar */}
              <div className="text-center pt-6 pb-1">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-3 ${
                    isKasbon
                      ? "bg-[#fde8ee] text-[#c81640]"
                      : "bg-[#e3f6ee] text-[#0a8f5a]"
                  }`}
                >
                  <i className="w-1.5 h-1.5 rounded-full bg-current" />
                  {isKasbon ? "Belum lunas (Kasbon)" : "Lunas"}
                </span>
                <small className="block text-xs text-slate-500">Total bayar</small>
                <strong className="block text-[38px] leading-tight font-extrabold tracking-tight text-slate-900 tabular-nums mt-0.5">
                  <em className="not-italic text-base font-bold text-slate-500 mr-1">Rp</em>
                  {formattedTotalNum}
                </strong>
              </div>

              {/* Perforated Separator */}
              <div className="relative border-t-[1.5px] border-dashed border-slate-200 my-5 -mx-6">
                <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-900 print:hidden" />
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-900 print:hidden" />
              </div>

              {/* Metadata Transaksi */}
              <dl className="grid gap-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">No. transaksi</dt>
                  <dd className="font-semibold text-slate-900 text-right">{transaksi.nomorStruk}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tanggal</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    {formatTanggalWIB(transaksi.dibuatPada)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Kasir</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    {transaksi.kasir?.nama || "Pemilik Toko"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Pelanggan</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    {transaksi.member?.nama || "Umum"}
                  </dd>
                </div>
              </dl>

              {/* Perforated Separator */}
              <div className="relative border-t-[1.5px] border-dashed border-slate-200 my-5 -mx-6">
                <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-900 print:hidden" />
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-900 print:hidden" />
              </div>

              {/* Daftar Item */}
              <ul className="grid gap-3">
                {items.map((it: any) => (
                  <li key={it.id} className="flex justify-between gap-3 items-start">
                    <div className="min-w-0">
                      <b className="block font-semibold text-slate-900 leading-snug">
                        {it.namaSnapshot}
                      </b>
                      <small className="block text-[11px] text-slate-500">
                        {formatDecimal(it.qty)} {it.satuanSnapshot} × {formatRupiah(it.hargaJualSnapshot)}
                        {it.catatan ? ` (${it.catatan})` : ""}
                      </small>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Ringkasan */}
              <div className="border-t border-slate-200 mt-4 pt-3 space-y-1 text-xs tabular-nums">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal · {formatDecimal(totalItemCount)} barang</span>
                  <span>{formatRupiah(transaksi.subtotal)}</span>
                </div>
                {Number(transaksi.diskon || 0) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Diskon</span>
                    <span>-{formatRupiah(transaksi.diskon)}</span>
                  </div>
                )}
                {Number(transaksi.pembulatan || 0) !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Pembulatan</span>
                    <span>
                      {transaksi.pembulatan > 0 ? "+" : ""}
                      {formatRupiah(transaksi.pembulatan)}
                    </span>
                  </div>
                )}
                {metode === "TUNAI" ? (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>{metodeLabel}</span>
                      <span>{formatRupiah(uangDiterima)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-0.5">
                      <span>Kembalian</span>
                      <span>{formatRupiah(kembalian)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-0.5">
                    <span>Metode Pembayaran</span>
                    <span>{metodeLabel}</span>
                  </div>
                )}
              </div>

              {/* Catatan Retur */}
              <p className="bg-slate-50 rounded-xl p-3 text-center text-[11px] text-slate-500 mt-4 leading-relaxed">
                {storeInfo.catatanRetur || "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan."}
              </p>

              {/* Barcode Dekoratif */}
              <div className="flex justify-center mt-4 mb-1.5 opacity-85" aria-hidden="true">
                <svg viewBox="0 0 120 28" className="w-44 h-7 fill-slate-900">
                  <rect x="0" y="0" width="3" height="28" />
                  <rect x="5" y="0" width="1.5" height="28" />
                  <rect x="9" y="0" width="4" height="28" />
                  <rect x="16" y="0" width="2" height="28" />
                  <rect x="20" y="0" width="1.5" height="28" />
                  <rect x="24" y="0" width="3.5" height="28" />
                  <rect x="30" y="0" width="1.5" height="28" />
                  <rect x="34" y="0" width="2.5" height="28" />
                  <rect x="39" y="0" width="4" height="28" />
                  <rect x="46" y="0" width="1.5" height="28" />
                  <rect x="50" y="0" width="3" height="28" />
                  <rect x="56" y="0" width="2" height="28" />
                  <rect x="61" y="0" width="1.5" height="28" />
                  <rect x="65" y="0" width="3.5" height="28" />
                  <rect x="71" y="0" width="2" height="28" />
                  <rect x="76" y="0" width="1.5" height="28" />
                  <rect x="80" y="0" width="4" height="28" />
                  <rect x="87" y="0" width="2" height="28" />
                  <rect x="92" y="0" width="3" height="28" />
                  <rect x="98" y="0" width="1.5" height="28" />
                  <rect x="102" y="0" width="3.5" height="28" />
                  <rect x="108" y="0" width="2" height="28" />
                  <rect x="113" y="0" width="1.5" height="28" />
                  <rect x="117" y="0" width="3" height="28" />
                </svg>
              </div>

              <div className="text-center font-bold text-xs text-slate-900 mt-2">
                {storeInfo.footerStruk || "Terima kasih, selamat berbelanja kembali"}
              </div>
              <small className="block text-center text-[11px] text-slate-400 mt-1">
                Struk digital · Kasirku POS
              </small>
            </div>
          ) : (
            /* Struk Thermal 58 mm */
            <div className="w-full max-w-[300px] bg-white text-slate-900 px-4 py-6 shadow-md rounded-xl print:shadow-none print:rounded-none font-mono text-xs leading-relaxed h-fit">
              <div className="text-center">
                <b className="font-bold text-[13px] uppercase block">{storeInfo.namaToko}</b>
                {storeInfo.alamat && <div className="text-[11px]">{storeInfo.alamat}</div>}
                {storeInfo.telepon && <div className="text-[11px]">Telp/WA {storeInfo.telepon}</div>}
              </div>

              <hr className="border-0 border-t-[1.5px] border-dashed border-slate-400 my-2.5" />

              <div className="flex justify-between gap-2 text-[11px]">
                <span>{formatTanggalShort(transaksi.dibuatPada)}</span>
                <span>#{String(transaksi.nomorStruk || "").slice(-4)}</span>
              </div>
              <div className="flex justify-between gap-2 text-[11px]">
                <span>Kasir: {transaksi.kasir?.nama || "Pemilik Toko"}</span>
                <span>{transaksi.member?.nama || "Umum"}</span>
              </div>

              <hr className="border-0 border-t-[1.5px] border-dashed border-slate-400 my-2.5" />

              <div className="space-y-1.5">
                {items.map((it: any) => (
                  <div key={it.id}>
                    <div className="font-semibold">{it.namaSnapshot}</div>
                    <div className="flex justify-between gap-2 pl-3 text-slate-500">
                      <span>
                        {formatDecimal(it.qty)} {it.satuanSnapshot} x{" "}
                        {new Intl.NumberFormat("id-ID").format(Number(it.hargaJualSnapshot || 0))}
                      </span>
                      <span className="text-slate-900 font-semibold">
                        {new Intl.NumberFormat("id-ID").format(Number(it.subtotal || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-0 border-t-[1.5px] border-dashed border-slate-400 my-2.5" />

              <div className="flex justify-between font-bold text-[13px]">
                <span>Total</span>
                <span>{formatRupiah(transaksi.total)}</span>
              </div>
              {metode === "TUNAI" ? (
                <>
                  <div className="flex justify-between">
                    <span>{metodeLabel}</span>
                    <span>{formatRupiah(uangDiterima)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembali</span>
                    <span>{formatRupiah(kembalian)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>Metode</span>
                  <span>{metodeLabel}</span>
                </div>
              )}

              <span className="block w-max mx-auto my-3 border-[1.5px] border-slate-900 px-4 py-0.5 font-bold tracking-[0.25em] text-[11px]">
                {isKasbon ? "KASBON" : "LUNAS"}
              </span>

              <hr className="border-0 border-t-[1.5px] border-dashed border-slate-400 my-2.5" />

              <div className="text-center text-[11px] space-y-1">
                <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
                <p className="font-bold pt-1">
                  {storeInfo.footerStruk || "Terima kasih"}
                </p>
                <p className="text-[10px] text-slate-500 pt-1">{transaksi.nomorStruk}</p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons (Upload Bukti / PDF Download / Print / Share / Tutup) */}
        <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2 print:hidden shrink-0">
          {transaksi?.id && !String(transaksi.id).startsWith("offline-") && (
            <BuktiTransaksiUploader
              transaksiId={transaksi.id}
              source="kasir"
              initialKey={transaksi.buktiKey ?? null}
              compact
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="h-10 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-semibold rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{pdfLoading ? "Membuat PDF…" : "Unduh PDF"}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="h-10 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-semibold rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="h-10 text-white font-bold rounded-[14px] text-xs transition-all hover:opacity-95 active:scale-95"
              style={{ background: "var(--primary)" }}
            >
              Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
