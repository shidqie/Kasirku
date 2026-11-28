"use client";

import { useEffect, useState } from "react";
import { X, Printer, Ban, ExternalLink, FileImage, Loader2 } from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { BuktiTransaksiUploader } from "@/components/shared/BuktiTransaksiUploader";

export interface TransactionDetailData {
  id: string;
  nomorStruk: string;
  total: number;
  subtotal: number;
  diskon: number;
  pembulatan: number;
  status: "SELESAI" | "BATAL";
  alasanBatal: string | null;
  dibuatPada: string;
  dibatalkanPada: string | null;
  kasir: { nama: string; username: string };
  dibatalkanOleh: { nama: string } | null;
  member: { nama: string; telepon: string | null } | null;
  pembayaran: { metode: string; jumlah: number; uangDiterima?: number; kembalian?: number }[];
  items: any[];
  buktiKey?: string | null;
}

interface TransactionDetailDrawerProps {
  trx: TransactionDetailData | null;
  onClose: () => void;
  onPrintStruk: (trx: TransactionDetailData) => void;
  onVoid: (trx: TransactionDetailData) => void;
  onBuktiUploaded?: (trxId: string, key: string) => void;
}

export function formatHariTanggal(dateStr: string) {
  return new Date(dateStr).toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionDetailDrawer({
  trx,
  onClose,
  onPrintStruk,
  onVoid,
  onBuktiUploaded,
}: TransactionDetailDrawerProps) {
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [loadingBukti, setLoadingBukti] = useState(false);

  useEffect(() => {
    if (!trx?.buktiKey) {
      setBuktiUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingBukti(true);
    fetch(`/api/uploads/bukti-transaksi?key=${encodeURIComponent(trx.buktiKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setBuktiUrl(data?.url || null);
      })
      .catch(() => {
        if (!cancelled) setBuktiUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBukti(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trx?.id, trx?.buktiKey]);

  if (!trx) return null;

  const isBatal = trx.status === "BATAL";
  const bayar = trx.pembayaran?.[0];
  const metode = bayar?.metode || "TUNAI";
  const isPdf = trx.buktiKey?.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px] drawer-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Minimalist */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400">
                DETAIL TRANSAKSI
              </span>
              {isBatal ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  Batal (Void)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Selesai
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100 mt-1">
              {trx.nomorStruk}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
          {/* Info Ringkas */}
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Hari / Tanggal</span>
              <span className="font-medium text-slate-900 dark:text-zinc-100 text-right">
                {formatHariTanggal(trx.dibuatPada)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Pelanggan</span>
              <span className="font-medium text-slate-900 dark:text-zinc-100 text-right">
                {trx.member?.nama || "Umum"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Kasir</span>
              <span className="font-medium text-slate-900 dark:text-zinc-100 text-right">
                {trx.kasir?.nama || "Kasir"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Metode Pembayaran</span>
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase text-right">
                {metode}
              </span>
            </div>
            {metode === "TUNAI" && bayar?.uangDiterima !== undefined && (
              <>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400">Uang Diterima</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-100 tabular-nums">
                    {formatRupiah(bayar.uangDiterima)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400">Kembalian</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-100 tabular-nums">
                    {formatRupiah(bayar.kembalian || 0)}
                  </span>
                </div>
              </>
            )}
            {isBatal && (
              <div className="py-2.5 space-y-1">
                <span className="text-rose-500 font-semibold block">Alasan Pembatalan</span>
                <p className="text-slate-700 dark:text-zinc-300">
                  {trx.alasanBatal || "-"}
                  {trx.dibatalkanOleh?.nama ? ` (oleh ${trx.dibatalkanOleh.nama})` : ""}
                </p>
              </div>
            )}
          </div>

          {/* Daftar Item */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Rincian Barang ({trx.items?.length || 0})
            </h4>
            {trx.items && trx.items.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 border-t border-b border-slate-100 dark:border-zinc-800">
                {trx.items.map((it: any, idx: number) => (
                  <div key={it.id || idx} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-zinc-100">
                        {it.namaSnapshot || it.nama || "Produk"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {formatDecimal(Number(it.qty || 0))} {it.satuanSnapshot || it.satuan || ""} ×{" "}
                        {formatRupiah(Number(it.hargaJualSnapshot ?? it.harga ?? 0))}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">
                      {formatRupiah(Number(it.subtotal || 0))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic py-2">Transaksi Quick QRIS (tanpa rincian item)</p>
            )}

            {/* Total Breakdown */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatRupiah(trx.subtotal)}</span>
              </div>
              {trx.diskon > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span className="tabular-nums">-{formatRupiah(trx.diskon)}</span>
                </div>
              )}
              {trx.pembulatan !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pembulatan</span>
                  <span className="tabular-nums">{formatRupiah(trx.pembulatan)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-900 dark:text-zinc-100">
                <span>Total</span>
                <span className="tabular-nums">{formatRupiah(trx.total)}</span>
              </div>
            </div>
          </div>

          {/* Bukti Pembayaran */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Bukti Pembayaran
            </h4>
            {trx.buktiKey ? (
              <div className="space-y-3">
                {loadingBukti ? (
                  <div className="h-36 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat bukti pembayaran...</span>
                  </div>
                ) : buktiUrl ? (
                  isPdf ? (
                    <a
                      href={buktiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="font-semibold text-blue-600 flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        Lihat Bukti PDF
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  ) : (
                    <a
                      href={buktiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50 dark:bg-zinc-950 group relative"
                      title="Klik untuk memperbesar"
                    >
                      <img
                        src={buktiUrl}
                        alt="Bukti Pembayaran"
                        className="w-full max-h-64 object-contain mx-auto"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3" />
                        Buka penuh
                      </span>
                    </a>
                  )
                ) : (
                  <p className="text-slate-400 italic">Bukti tersimpan ({trx.buktiKey})</p>
                )}

                <BuktiTransaksiUploader
                  transaksiId={trx.id}
                  source="riwayat"
                  initialKey={trx.buktiKey}
                  compact
                  onUploaded={(res) => {
                    setBuktiUrl(res.url);
                    onBuktiUploaded?.(trx.id, res.key);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-400 text-[11px]">
                  Belum ada bukti pembayaran yang diunggah.
                </p>
                <BuktiTransaksiUploader
                  transaksiId={trx.id}
                  source="riwayat"
                  compact
                  onUploaded={(res) => {
                    setBuktiUrl(res.url);
                    onBuktiUploaded?.(trx.id, res.key);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2.5 shrink-0 bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => onPrintStruk(trx)}
            className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Struk</span>
          </button>
          {!isBatal && (
            <button
              type="button"
              onClick={() => onVoid(trx)}
              className="h-10 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
