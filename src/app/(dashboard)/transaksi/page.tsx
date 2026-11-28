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
  FileText,
} from "lucide-react";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { StrukModal } from "@/components/kasir/StrukModal";
import {
  TransactionDetailDrawer,
  formatHariTanggal,
} from "@/components/kasir/TransactionDetailDrawer";
import { Pagination } from "@/components/shared/Pagination";
import { DataTable, DataTableHeader, DataTableHead, DataTableBody, DataTableEmpty } from "@/components/shared/DataTable";

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
  buktiKey?: string | null;
}

export default function RiwayatTransaksiPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Struk Modal & Detail Drawer
  const [selectedTrx, setSelectedTrx] = useState<TransactionRow | null>(null);
  const [isStrukOpen, setIsStrukOpen] = useState(false);
  const [detailTrx, setDetailTrx] = useState<TransactionRow | null>(null);
  const [storeInfo, setStoreInfo] = useState<any>({ namaToko: "Toko Sembako Berkah" });

  // Void Modal
  const [voidTrx, setVoidTrx] = useState<TransactionRow | null>(null);
  const [voidAlasan, setVoidAlasan] = useState("");
  const [voidPin, setVoidPin] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");
  const [canVoidWithoutPin, setCanVoidWithoutPin] = useState<boolean>(false);

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
      if (uRes.ok) {
        const u = uData.user;
        setCurrentUserRole(u?.role || "STAFF");
        const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
        setCanVoidWithoutPin(u?.role === "OWNER" || perms.includes("kasir:void"));
      }
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
          pinOwner: !canVoidWithoutPin ? voidPin : undefined,
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
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      {/* Header & Filter Fixed at Top */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Riwayat Penjualan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 tabular-nums">
                {transactions.length} Transaksi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Daftar transaksi kasir, cetak ulang struk, dan pembatalan (void).
            </p>
          </div>
        </div>

        {/* Filter Bar Minimalis Garis Bawah */}
        <div className="pt-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: "", label: "Semua Status" },
              { id: "SELESAI", label: "Selesai" },
              { id: "BATAL", label: "Batal (Void)" },
            ].map((tab) => (
              <button
                key={tab.id || "ALL"}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                  statusFilter === tab.id
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pb-2.5">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari no. transaksi atau pelanggan..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-6 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={fetchData}
              title="Muat ulang"
              aria-label="Muat ulang"
              className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tabel Transaksi Minimalist */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Memuat transaksi...</div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Tidak ada transaksi ditemukan.
              </div>
            ) : (
              transactions
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((t) => {
                  const bayar = t.pembayaran?.[0];
                  const isBatal = t.status === "BATAL";
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 space-y-2.5 ${
                        isBatal ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-zinc-100">
                              {t.nomorStruk}
                            </span>
                            {isBatal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                Batal
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Selesai
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{formatDateTime(t.dibuatPada)} · {bayar?.metode || "TUNAI"}</span>
                            {t.buktiKey && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                Bukti ✓
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5">
                            Kasir: <strong>{t.kasir?.nama || "Kasir"}</strong> ·{" "}
                            {t.member ? t.member.nama : "Umum"}
                          </p>
                        </div>
                        <span className="font-black text-sm text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">
                          {formatRupiah(t.total)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailTrx(t)}
                          className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => handleOpenStruk(t)}
                          className="flex-1 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Struk</span>
                        </button>
                        {!isBatal && (
                          <button
                            onClick={() => handleOpenVoidModal(t)}
                            className="h-10 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Void</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <DataTable className="hidden md:table">
            <DataTableHeader>
              <tr>
                <DataTableHead>No Transaksi</DataTableHead>
                <DataTableHead>Hari/Tanggal</DataTableHead>
                <DataTableHead>Pelanggan</DataTableHead>
                <DataTableHead>Kasir</DataTableHead>
                <DataTableHead align="right">Total</DataTableHead>
                <DataTableHead>Metode Pembayaran</DataTableHead>
                <DataTableHead align="center">Status Pembayaran</DataTableHead>
                <DataTableHead align="center">Aksi</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {loading ? (
                <TableSkeletonRows rows={6} cols={8} />
              ) : transactions.length === 0 ? (
                <DataTableEmpty colSpan={8} className="py-12">
                  Tidak ada transaksi ditemukan.
                </DataTableEmpty>
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
                        <td className="py-3.5 pr-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                            {t.nomorStruk}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                          {formatHariTanggal(t.dibuatPada)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {t.member ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {t.member.nama}
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-zinc-400">Umum</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-zinc-200">
                          {t.kasir?.nama || "Kasir"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap tabular-nums">
                          {formatRupiah(t.total)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 uppercase">
                              {bayar?.metode || "TUNAI"}
                            </span>
                            {t.buktiKey && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                Bukti ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                        <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailTrx(t)}
                              className="h-7 px-2.5 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                              title="Lihat Detail & Bukti Pembayaran"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                            <button
                              onClick={() => handleOpenStruk(t)}
                              className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold transition-colors inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                              title="Cetak Ulang Struk"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Struk</span>
                            </button>
                            {!isBatal && (
                              <button
                                onClick={() => handleOpenVoidModal(t)}
                                className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors inline-flex items-center gap-1 active:scale-95 cursor-pointer"
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
            </DataTableBody>
          </DataTable>
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

              {!canVoidWithoutPin && (
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
                  disabled={submittingVoid || !voidAlasan.trim() || (!canVoidWithoutPin && voidPin.length !== 6)}
                  className="w-1/2 h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingVoid ? "Memproses..." : "Konfirmasi Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL SLIDER DRAWER */}
      <TransactionDetailDrawer
        trx={detailTrx}
        onClose={() => setDetailTrx(null)}
        onPrintStruk={(trx) => {
          setDetailTrx(null);
          handleOpenStruk(trx);
        }}
        onVoid={(trx) => {
          setDetailTrx(null);
          handleOpenVoidModal(trx);
        }}
        onBuktiUploaded={(trxId, key) => {
          setTransactions((prev) =>
            prev.map((item) => (item.id === trxId ? { ...item, buktiKey: key } : item))
          );
          setDetailTrx((prev) => (prev && prev.id === trxId ? { ...prev, buktiKey: key } : prev));
        }}
      />

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
