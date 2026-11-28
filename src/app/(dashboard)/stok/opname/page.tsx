"use client";

import { useEffect, useState, Suspense } from "react";
import { CardListSkeleton, DetailPageSkeleton, TableSkeletonRows } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";
import { Pagination } from "@/components/shared/Pagination";
import { NumberInput } from "@/components/shared/NumberInput";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ScanBarcode,
} from "lucide-react";
import { formatRupiah, formatDecimal, formatDateTime } from "@/lib/formatters";

interface ProductItem {
  id: string;
  nama: string;
  satuanDasar: string;
  stokCache: number;
  barcode: string | null;
}

function TabHitungFisik() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [draftItems, setDraftItems] = useState<{ [produkId: string]: number }>({});
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Barcode scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ product: ProductItem; suggested: number } | null>(null);
  const [scanInputValue, setScanInputValue] = useState<number>(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pRes = await fetch("/api/products");
      const pData = await pRes.json();

      if (pRes.ok) {
        setProducts(pData.products || []);
        const initialDraft: { [key: string]: number } = {};
        (pData.products || []).forEach((p: any) => {
          initialDraft[p.id] = Number(p.stokCache);
        });
        setDraftItems(initialDraft);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStokFisikChange = (produkId: string, val: number) => {
    setDraftItems((prev) => ({
      ...prev,
      [produkId]: val,
    }));
  };

  const handleScanResult = (code: string) => {
    setIsScannerOpen(false);
    const found = products.find((p) => p.barcode === code);
    if (!found) {
      setScanError(`Barcode "${code}" tidak ditemukan dalam daftar produk.`);
      return;
    }
    const currentDraft = draftItems[found.id] ?? Number(found.stokCache);
    setScanResult({ product: found, suggested: currentDraft });
    setScanInputValue(currentDraft);
  };

  const handleScanConfirm = () => {
    if (!scanResult) return;
    handleStokFisikChange(scanResult.product.id, scanInputValue);
    setScanResult(null);
  };

  const handleSubmitOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const items = products.map((p) => ({
      produkId: p.id,
      stokFisik: draftItems[p.id] ?? Number(p.stokCache),
    }));

    try {
      const res = await fetch("/api/opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catatan: catatan.trim() || null,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan stok opname");

      setSuccess(
        `Pengajuan stok opname no. ${data.result.opname.nomor} berhasil dikirim! Menunggu persetujuan Pemilik Toko.`
      );
      setCatatan("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Input Hitungan Fisik Stok Opname
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Hitung fisik barang di rak/gudang toko, masukkan angka riil. Sistem akan menghitung selisih dan mengirimkannya ke Pemilik Toko untuk ditinjau. Stok belum berubah sampai disetujui.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
        <PopupAlert type="error" message={scanError} onClear={() => setScanError(null)} />

        <div className="py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Formulir penghitungan fisik ({products.length} produk)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="h-8 px-3 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>Scan Barcode</span>
            </button>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="Cari nama produk..."
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
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitOpname} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = q
            ? products.filter((p) => p.nama.toLowerCase().includes(q))
            : products;
          const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

          return (
            <>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="py-3 pr-3 w-12">No</th>
                      <th className="py-3 px-3">Nama produk</th>
                      <th className="py-3 px-3">Satuan</th>
                      <th className="py-3 px-3 text-right">Stok sistem</th>
                      <th className="py-3 px-3 text-center w-44">Stok fisik nyata</th>
                      <th className="py-3 pl-3 text-center">Selisih Stok</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                      {loading ? (
                        <TableSkeletonRows rows={8} cols={6} />
                      ) : paginated.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-400">
                            Tidak ada produk yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((p, idx) => {
                          const sistem = Number(p.stokCache);
                          const fisik = draftItems[p.id] ?? sistem;
                          const selisih = fisik - sistem;
                          const rowNum = (currentPage - 1) * pageSize + idx + 1;

                          return (
                            <tr key={p.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                              <td className="py-3 pr-3 text-slate-400 tabular-nums">{rowNum}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-zinc-100">
                                {p.nama}
                              </td>
                              <td className="py-3 px-3 text-slate-500 dark:text-zinc-400">
                                {p.satuanDasar}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                                {formatDecimal(sistem)}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <NumberInput
                                    min={0}
                                    emptyFallback={0}
                                    required
                                    value={fisik}
                                    onChange={(val) => handleStokFisikChange(p.id, val)}
                                    className="w-24 px-3 h-9 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-center font-sans font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{ "--tw-ring-color": "var(--primary)" } as any}
                                  />
                                </div>
                              </td>
                              <td className="py-3 pl-3 text-center font-sans font-bold">
                                {selisih === 0 ? (
                                  <span className="text-slate-400">Cocok (0)</span>
                                ) : selisih > 0 ? (
                                  <span className="text-emerald-600">+{formatDecimal(selisih)}</span>
                                ) : (
                                  <span className="text-rose-600">{formatDecimal(selisih)}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              {filtered.length > 0 && (
                <div className="shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filtered.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          );
        })()}

        <div className="shrink-0 pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan / Periode Opname (opsional), mis: Akhir pekan rak depan"
            className="flex-1 px-3.5 h-10 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900 dark:focus:border-white"
          />

          <button
            type="submit"
            disabled={submitting || products.length === 0}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {submitting ? "Mengirim..." : "Ajukan hasil hitung fisik ke Pemilik Toko"}
          </button>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanResult}
      />

      {/* Scan Result Mini-Modal */}
      {scanResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                  <ScanBarcode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Produk Ditemukan</span>
              </div>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product info */}
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl space-y-1.5">
                <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{scanResult.product.nama}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                  <span>Satuan: <strong className="text-slate-700 dark:text-zinc-300">{scanResult.product.satuanDasar}</strong></span>
                  <span>Stok sistem: <strong className="text-slate-700 dark:text-zinc-300">{formatDecimal(scanResult.product.stokCache)}</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Stok Fisik Nyata
                </label>
                <NumberInput
                  min={0}
                  emptyFallback={0}
                  value={scanInputValue}
                  onChange={setScanInputValue}
                  className="w-full px-4 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-center font-bold text-lg text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setScanResult(null);
                    setIsScannerOpen(true);
                  }}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Scan Lagi
                </button>
                <button
                  type="button"
                  onClick={handleScanConfirm}
                  className="flex-1 h-10 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabRiwayat() {
  const [opnameList, setOpnameList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opnamePage, setOpnamePage] = useState(1);
  const [opnamePageSize, setOpnamePageSize] = useState(10);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/opname");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat riwayat opname");
      setOpnameList(data.list || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Riwayat Pengajuan Stok Opname
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Daftar seluruh pengajuan stok opname beserta status persetujuan dan pemeriksanya.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />

        <div className="py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>Riwayat pengajuan ({opnameList.length} entri)</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4">No. Opname</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Diajukan oleh</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 pl-4">Disetujui / Ditolak oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans text-xs">
              {loading ? (
                <TableSkeletonRows rows={6} cols={5} />
              ) : opnameList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Belum ada pengajuan stok opname.
                  </td>
                </tr>
              ) : (
                opnameList
                  .slice((opnamePage - 1) * opnamePageSize, opnamePage * opnamePageSize)
                  .map((op) => (
                    <tr key={op.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-3 pr-4 font-sans font-bold text-[#F0090F]">{op.nomor}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(op.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                        {op.dibuatOleh?.nama || "Staff"}
                      </td>
                      <td className="py-3 px-4">
                        {op.status === "MENUNGGU" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            Menunggu Persetujuan
                          </span>
                        )}
                        {op.status === "DISETUJUI" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Disetujui Owner
                          </span>
                        )}
                        {op.status === "DITOLAK" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-4 text-slate-600 dark:text-zinc-300">
                        {op.disetujuiOleh?.nama ? (
                          <span>
                            {op.disetujuiOleh.nama} ({formatDateTime(op.tanggalPersetujuan)})
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
      </div>

      {opnameList.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={opnamePage}
            totalItems={opnameList.length}
            pageSize={opnamePageSize}
            onPageChange={setOpnamePage}
            onPageSizeChange={setOpnamePageSize}
          />
        </div>
      )}
    </div>
  );
}

function TabPersetujuan() {
  const [opnameList, setOpnameList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [processing, setProcessing] = useState(false);
  const [itemPages, setItemPages] = useState<{ [opnameId: string]: number }>({});
  const ITEMS_PER_PAGE = 20;

  const fetchOpnames = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/opname?status=MENUNGGU");
      const data = await res.json();
      if (res.ok) setOpnameList(data.list || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpnames();
  }, []);

  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);

  const handleApprove = (opnameId: string) => {
    setApproveTargetId(opnameId);
  };

  const confirmApprove = async () => {
    if (!approveTargetId) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/opname/${approveTargetId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyetujui opname");

      setSuccess("Stok opname berhasil disetujui! Seluruh saldo stok telah diperbarui.");
      setApproveTargetId(null);
      fetchOpnames();
    } catch (err: any) {
      setError(err.message);
      setApproveTargetId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !alasanTolak.trim()) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/opname/${rejectingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: alasanTolak }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menolak opname");

      setSuccess("Pengajuan stok opname berhasil ditolak.");
      setRejectingId(null);
      setAlasanTolak("");
      fetchOpnames();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Persetujuan Stok Opname
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Tinjau selisih hitungan fisik staff beserta nilai rupiahnya. Stok hanya berubah setelah Anda menekan tombol Setujui.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOpnames}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
      {loading ? (
        <CardListSkeleton count={4} />
      ) : opnameList.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <p className="text-base font-bold text-slate-700">Tidak ada pengajuan opname yang menunggu</p>
          <p className="text-xs text-slate-400 mt-1">Semua hitungan fisik telah diproses.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {opnameList.map((op) => {
            const totalNilaiSelisih = op.items.reduce(
              (sum: number, it: any) => sum + (it.nilaiSelisih || 0),
              0
            );
            const currentItemPage = itemPages[op.id] || 1;
            const paginatedItems = op.items.slice(
              (currentItemPage - 1) * ITEMS_PER_PAGE,
              currentItemPage * ITEMS_PER_PAGE
            );

            return (
              <div
                key={op.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black font-sans text-primary-700">
                        {op.nomor}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        Menunggu Persetujuan
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Diajukan oleh: <strong>{op.dibuatOleh?.nama}</strong> · Waktu:{" "}
                      {formatDateTime(op.createdAt)}
                    </p>
                    {op.catatan && (
                      <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{op.catatan}&rdquo;</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={processing}
                      onClick={() => setRejectingId(op.id)}
                      className="h-10 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>Tolak</span>
                    </button>
                    <button
                      disabled={processing}
                      onClick={() => handleApprove(op.id)}
                      className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Setujui Opname</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 uppercase font-sans tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Nama Produk</th>
                        <th className="py-2.5 px-3 text-center">Stok Sistem</th>
                        <th className="py-2.5 px-3 text-center">Hitung Fisik Staff</th>
                        <th className="py-2.5 px-3 text-center font-bold">Selisih Kuantitas</th>
                        <th className="py-2.5 px-3 text-right">Nilai Rupiah Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {paginatedItems.map((it: any) => {
                        const selisih = Number(it.selisih);
                        return (
                          <tr key={it.id}>
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                              {it.produk?.nama}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">
                              {formatDecimal(it.stokSistem)} {it.produk?.satuanDasar}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {formatDecimal(it.stokFisik)} {it.produk?.satuanDasar}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black">
                              {selisih === 0 ? (
                                <span className="text-slate-400">0</span>
                              ) : selisih > 0 ? (
                                <span className="text-emerald-600">+{formatDecimal(selisih)}</span>
                              ) : (
                                <span className="text-rose-600">{formatDecimal(selisih)}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span
                                className={
                                  it.nilaiSelisih < 0
                                    ? "text-rose-600"
                                    : it.nilaiSelisih > 0
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                }
                              >
                                {it.nilaiSelisih !== 0 ? formatRupiah(it.nilaiSelisih) : "Rp 0"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 font-sans text-xs">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 font-bold text-right text-slate-700">
                          Total Estimasi Selisih Nilai Barang:
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm">
                          <span className={totalNilaiSelisih < 0 ? "text-rose-600" : "text-emerald-600"}>
                            {formatRupiah(totalNilaiSelisih)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {op.items.length > 0 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Pagination
                      currentPage={currentItemPage}
                      totalItems={op.items.length}
                      pageSize={ITEMS_PER_PAGE}
                      onPageChange={(page) =>
                        setItemPages((prev) => ({ ...prev, [op.id]: page }))
                      }
                    />
                    <span className="text-xs text-slate-500 tabular-nums">
                      Total <strong className="text-slate-800">{op.items.length}</strong> produk · {ITEMS_PER_PAGE}/hal
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="font-bold text-lg text-rose-600">Tolak Pengajuan Stok Opname</h3>
            <p className="text-xs text-slate-500">
              Pengajuan ini akan ditolak dan stok barang di sistem tidak akan diubah.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Alasan Penolakan (Wajib):
                </label>
                <textarea
                  rows={2}
                  required
                  value={alasanTolak}
                  onChange={(e) => setAlasanTolak(e.target.value)}
                  placeholder="Contoh: Salah rak hitung, lakukan hitung ulang"
                  className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing || !alasanTolak.trim()}
                  className="w-1/2 h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {processing ? "Menolak..." : "Tolak Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(approveTargetId)}
        title="Setujui Stok Opname?"
        description="Stok produk akan otomatis disesuaikan dengan mutasi OPNAME."
        confirmText="Ya, Setujui"
        variant="default"
        loading={processing}
        onConfirm={confirmApprove}
        onCancel={() => !processing && setApproveTargetId(null)}
      />
    </div>
  );
}

function StokOpnameContent() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "hitung";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d.user?.role || null))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      <div className="shrink-0 flex items-center gap-6 border-b border-slate-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => router.push("/stok/opname")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab !== "persetujuan" && activeTab !== "riwayat"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Hitung fisik
        </button>
        <button
          onClick={() => router.push("/stok/opname?tab=riwayat")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "riwayat"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Riwayat
        </button>
        {(userRole === "OWNER" || userRole === "KEPALA_TOKO") && (
          <button
            onClick={() => router.push("/stok/opname?tab=persetujuan")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "persetujuan"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
            }`}
          >
            Persetujuan
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-4">
        {activeTab === "persetujuan" && (userRole === "OWNER" || userRole === "KEPALA_TOKO") ? (
          <TabPersetujuan />
        ) : activeTab === "riwayat" ? (
          <TabRiwayat />
        ) : (
          <TabHitungFisik />
        )}
      </div>
    </div>
  );
}

export default function StokOpnamePage() {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <StokOpnameContent />
    </Suspense>
  );
}
