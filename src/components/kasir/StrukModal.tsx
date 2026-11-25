"use client";

import { useState } from "react";
import { Printer, Share2, X, Download } from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { generateReceiptPDF } from "@/lib/pdf-receipt";

interface StrukModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: any;
  storeInfo: {
    namaToko: string;
    alamat?: string | null;
    telepon?: string | null;
    footerStruk?: string | null;
    pesanWhatsApp?: string | null;
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
    window.print();
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
      transaksi.pembayaran?.[0]?.metode || "TUNAI"
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
  const uangDiterima = bayar?.uangDiterima || transaksi.total;
  const kembalian = bayar?.kembalian ?? Math.max(0, uangDiterima - transaksi.total);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-[340px] w-full p-0 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Actions Bar (Tidak ikut tercetak) */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 print:hidden shrink-0">
          <span className="text-xs font-bold text-slate-700 font-sans">
            Preview Struk Belanja
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STRUK FISIK TAMPILAN PERSIS PDF */}
        <div className="flex-1 overflow-y-auto px-5 py-4 font-sans text-xs text-slate-900 space-y-3.5 print:p-0">
          {/* Garis Merah Top Accent */}
          <div className="h-1 bg-[#c11f1f] -mx-5 -mt-4 mb-3" />

          {/* Header Toko */}
          <div className="text-center space-y-0.5">
            <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
              {storeInfo.namaToko}
            </h2>
            {storeInfo.alamat && (
              <p className="text-[11px] text-slate-500 leading-tight">{storeInfo.alamat}</p>
            )}
            {storeInfo.telepon && (
              <p className="text-[11px] text-slate-500">
                {storeInfo.telepon.toLowerCase().includes("telp")
                  ? storeInfo.telepon
                  : `Telp/WA ${storeInfo.telepon}`}
              </p>
            )}
          </div>

          {/* Status Badge: LUNAS */}
          <div className="flex justify-center">
            <span className="px-3.5 py-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-100 rounded-full">
              LUNAS
            </span>
          </div>

          {/* Metadata Transaksi */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Transaksi</span>
              <span className="font-bold text-slate-900">{transaksi.nomorStruk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal</span>
              <span className="font-bold text-slate-900">
                {formatTanggalWIB(transaksi.dibuatPada)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir</span>
              <span className="font-bold text-slate-900">
                {transaksi.kasir?.nama || "Pemilik Toko"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pelanggan</span>
              <span className="font-bold text-slate-900">
                {transaksi.member?.nama || "Umum"}
              </span>
            </div>
          </div>

          <hr className="border-t border-slate-200" />

          {/* Section: ITEM PEMBELIAN */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block">
              ITEM PEMBELIAN
            </span>

            <div className="space-y-2">
              {items.map((it: any) => (
                <div key={it.id} className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs leading-snug">
                    {it.namaSnapshot}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>
                      {formatDecimal(it.qty)} {it.satuanSnapshot} x {formatRupiah(it.hargaJualSnapshot)}
                      {it.catatan ? ` (${it.catatan})` : ""}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-t border-slate-200" />

          {/* Jumlah Item & Subtotal */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah item</span>
              <span className="text-slate-900">{totalItemCount} barang</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900">{formatRupiah(transaksi.subtotal)}</span>
            </div>
          </div>

          <hr className="border-t border-slate-200" />

          {/* TOTAL BAYAR */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              TOTAL BAYAR
            </span>
            <span className="text-xl font-bold text-[#c11f1f]">
              {formatRupiah(transaksi.total)}
            </span>
          </div>

          <hr className="border-t border-slate-200" />

          {/* Metode Bayar, Uang Diterima, Kembalian */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Metode bayar</span>
              <span className="font-bold text-slate-900">{metode}</span>
            </div>
            {metode === "TUNAI" && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uang diterima</span>
                  <span className="text-slate-900">{formatRupiah(uangDiterima)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kembalian</span>
                  <span className="font-bold text-slate-900">{formatRupiah(kembalian)}</span>
                </div>
              </>
            )}
          </div>

          {/* Kebijakan Retur Box (Merah muda lembut) */}
          <div className="bg-[#fdf0f0] rounded-lg p-2.5 text-center space-y-1 text-[11px] text-slate-800">
            <p className="leading-tight">
              Barang yang sudah dibeli dapat ditukar maks. 2 hari dengan struk ini (kecuali makanan/minuman).
            </p>
            <p className="font-bold text-slate-900 pt-0.5">
              {storeInfo.footerStruk || "Terima kasih, selamat berbelanja kembali"}
            </p>
          </div>

          {/* Struk digital Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-1 pb-1">
            Struk digital &nbsp;|&nbsp; Kasirku POS &nbsp;|&nbsp; {formatTanggalShort(transaksi.dibuatPada)}
          </div>
        </div>

        {/* Buttons (PDF Download / Print / Share / Selesai) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-2 print:hidden shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="h-10 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{pdfLoading ? "Membuat PDF…" : "Unduh PDF"}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak (Printer)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full h-9 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold rounded-xl text-xs transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
