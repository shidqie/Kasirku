"use client";

import { useEffect, useState } from "react";
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
import { formatRupiah } from "@/lib/formatters";
import { StrukModal } from "@/components/kasir/StrukModal";
import {
  TransactionDetailDrawer,
  formatHariTanggal,
} from "@/components/kasir/TransactionDetailDrawer";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";

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

interface RiwayatPesananModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RiwayatPesananModal({ isOpen, onClose }: RiwayatPesananModalProps) {
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
  const [storeInfo, setStoreInfo] = useState<any>({ namaToko: "Toko Gagan 2" });

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

  // Transition & mounting state for silky smooth animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

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
    if (isOpen) {
      setMounted(true);
      fetchData();
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [search, statusFilter]);

  // Close when user clicks any navigation item in sidebar or presses Escape
  useEffect(() => {
    const handleNav = () => {
      if (isOpen) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !voidTrx && !isStrukOpen) {
        onClose();
      }
    };

    window.addEventListener("sidebar-navigated", handleNav);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("sidebar-navigated", handleNav);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, voidTrx, isStrukOpen]);

  if (!mounted) return null;

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

  const filtered = transactions;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      className={`fixed top-16 bottom-0 right-0 left-0 lg:left-60 z-30 flex flex-col bg-white dark:bg-zinc-900 border-l border-slate-200/80 dark:border-zinc-800 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Header Drawer */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-[#F0090F] dark:bg-red-950/40 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Riwayat Penjualan
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                {transactions.length} Transaksi
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Daftar transaksi kasir, cetak ulang struk, dan pembatalan (void)
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
          <span>Tutup</span>
        </button>
      </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor transaksi atau nama pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 h-10 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="w-40">
              <Dropdown
                variant="box"
                searchable={false}
                align="right"
                ariaLabel="Filter status transaksi"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: "Semua Status" },
                  { value: "SELESAI", label: "Selesai" },
                  { value: "BATAL", label: "Batal (Void)" },
                ]}
              />
            </div>
            <button
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Muat ulang"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Tabel Riwayat Minimalist */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3 pr-4 whitespace-nowrap">No Transaksi</th>
                  <th className="py-3 px-4 whitespace-nowrap">Hari/Tanggal</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pelanggan</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kasir</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                  <th className="py-3 px-4 whitespace-nowrap">Metode Pembayaran</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status Pembayaran</th>
                  <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Memuat riwayat transaksi...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Tidak ada transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginated.map((t) => {
                    const isVoid = t.status === "BATAL";
                    const bayar = t.pembayaran[0];

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                          isVoid ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
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
                          {t.kasir.nama}
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
                          {isVoid ? (
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
                            {!isVoid && (
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
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>

        {/* Void Modal */}
        {voidTrx && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
                  <Ban className="w-4 h-4" />
                  Konfirmasi Pembatalan (Void)
                </span>
                <button
                  onClick={() => setVoidTrx(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmVoid} className="mt-3 space-y-3">
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Batalkan transaksi <strong>{voidTrx.nomorStruk}</strong> ({formatRupiah(voidTrx.total)})? Stok barang akan dikembalikan otomatis.
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Alasan Pembatalan *
                  </label>
                  <input
                    type="text"
                    required
                    value={voidAlasan}
                    onChange={(e) => setVoidAlasan(e.target.value)}
                    placeholder="Contoh: Salah input pesanan"
                    className="w-full mt-1 px-3 h-9 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>

                {!canVoidWithoutPin && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      PIN Owner (Otorisasi)
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={voidPin}
                      onChange={(e) => setVoidPin(e.target.value)}
                      placeholder="Masukkan 6 digit PIN Owner"
                      className="w-full mt-1 px-3 h-9 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-center tracking-widest"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVoidTrx(null)}
                    className="w-1/2 h-9 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold rounded-lg text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingVoid || !voidAlasan || (!canVoidWithoutPin && voidPin.length !== 6)}
                    className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
                  >
                    {submittingVoid ? "Memproses..." : "Ya, Void Transaksi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Slider Drawer */}
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

        {/* Struk Modal */}
        <StrukModal
          isOpen={isStrukOpen}
          onClose={() => setIsStrukOpen(false)}
          transaksi={selectedTrx}
          storeInfo={storeInfo}
        />
      </div>
    );
  }
