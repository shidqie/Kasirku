"use client";

import { useEffect, useState } from "react";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";
import {
  Receipt,
  Search,
  RefreshCw,
  Printer,
  Ban,
  AlertCircle,
  CheckCircle,
  X,
  Lock,
} from "lucide-react";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { StrukModal } from "@/components/kasir/StrukModal";
import { Pagination } from "@/components/shared/Pagination";

interface TransactionRow {
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
}

export default function RiwayatTransaksiPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Struk Modal
  const [selectedTrx, setSelectedTrx] = useState<TransactionRow | null>(null);
  const [isStrukOpen, setIsStrukOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({ namaToko: "Toko Sembako Berkah" });

  // Void Modal
  const [voidTrx, setVoidTrx] = useState<TransactionRow | null>(null);
  const [voidAlasan, setVoidAlasan] = useState("");
  const [voidPin, setVoidPin] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const [tRes, sRes, uRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch("/api/settings"),
        fetch("/api/auth/me"),
      ]);

      const tData = await tRes.json();
      const sData = await sRes.json();
      const uData = await uRes.json();

      if (tRes.ok) setTransactions(tData.transactions || []);
      if (sRes.ok) setStoreInfo(sData.settings || {});
      if (uRes.ok) setCurrentUserRole(uData.user?.role || "STAFF");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleOpenStruk = (trx: TransactionRow) => {
    setSelectedTrx(trx);
    setIsStrukOpen(true);
  };

  const handleOpenVoidModal = (trx: TransactionRow) => {
    setVoidTrx(trx);
    setVoidAlasan("");
    setVoidPin("");
    setError(null);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTrx) return;

    setSubmittingVoid(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${voidTrx.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alasan: voidAlasan,
          pinOwner: currentUserRole === "STAFF" ? voidPin : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan transaksi");

      setSuccess(`Transaksi ${voidTrx.nomorStruk} berhasil dibatalkan (void).`);
      setVoidTrx(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingVoid(false);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* Header & Filter Fixed at Top */}
      <div className="shrink-0 space-y-4 pb-4">
        <div className="pb-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Riwayat Penjualan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 tabular-nums">
                {transactions.length} Transaksi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Daftar transaksi kasir, cetak ulang struk, dan pembatalan (void)
            </p>
          </div>
        </div>

        {/* Search & Filter Bar (Sama dengan Modal Riwayat Kasir) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor transaksi atau nama pelanggan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 h-10 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 h-10 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="SELESAI">Selesai</option>
            <option value="BATAL">Batal (Void)</option>
          </select>
          <button
            type="button"
            onClick={fetchData}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tabel Transaksi (Sama dengan Modal Riwayat Kasir) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-400">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-800 uppercase font-sans tracking-wider text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-3">No. Transaksi</th>
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-3">Kasir / Pelanggan</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loading ? (
                <TableSkeletonRows rows={6} cols={6} />
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                transactions
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t) => {
                    const bayar = t.pembayaran?.[0];
                    const isBatal = t.status === "BATAL";

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                          isBatal ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 block">
                            {t.nomorStruk}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {bayar?.metode || "TUNAI"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                          {formatDateTime(t.dibuatPada)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 dark:text-zinc-200 block">
                            {t.kasir?.nama || "Kasir"}
                          </span>
                          {t.member ? (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              {t.member.nama}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Umum</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-zinc-100 whitespace-nowrap tabular-nums">
                          {formatRupiah(t.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isBatal ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              Batal
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              Selesai
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenStruk(t)}
                              className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                              title="Cetak Ulang Struk"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Struk</span>
                            </button>
                            {!isBatal && (
                              <button
                                onClick={() => handleOpenVoidModal(t)}
                                className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                title="Batalkan Transaksi (Void)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Void</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={transactions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* MODAL VOID / PEMBATALAN TRANSAKSI (User Story C6) */}
      {voidTrx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-rose-600 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Batalkan Transaksi (Void)
              </h3>
              <button onClick={() => setVoidTrx(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Anda akan membatalkan transaksi <strong>{voidTrx.nomorStruk}</strong> ({formatRupiah(voidTrx.total)}).
              Stok barang akan otomatis dikembalikan ke gudang melalui mutasi lawan.
            </p>

            <form onSubmit={handleConfirmVoid} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Alasan Pembatalan (Wajib):
                </label>
                <textarea
                  rows={2}
                  required
                  value={voidAlasan}
                  onChange={(e) => setVoidAlasan(e.target.value)}
                  placeholder="Contoh: Pembeli keliru memilih varian barang / salah hitung"
                  className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {currentUserRole === "STAFF" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary-600" />
                    PIN Pemilik Toko (Diperlukan):
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={voidPin}
                    onChange={(e) => setVoidPin(e.target.value)}
                    placeholder="Masukkan 6 angka PIN Owner"
                    className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans tracking-widest"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTrx(null)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid || !voidAlasan.trim() || (currentUserRole === "STAFF" && voidPin.length !== 6)}
                  className="w-1/2 h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingVoid ? "Memproses..." : "Konfirmasi Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRUK MODAL */}
      <StrukModal
        isOpen={isStrukOpen}
        onClose={() => setIsStrukOpen(false)}
        transaksi={selectedTrx}
        storeInfo={storeInfo}
      />
    </div>
  );
}
