"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Printer, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import { formatDecimal, formatRupiah, formatDateTime } from "@/lib/formatters";
import { CardListSkeleton } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";
import { DataTable, DataTableHeader, DataTableHead, DataTableBody } from "@/components/shared/DataTable";

interface LowStockItem {
  id: string;
  nama: string;
  kategori: string;
  barcode: string | null;
  satuanDasar: string;
  stokSaatIni: number;
  stokMinimum: number;
  saranBeli: number;
  status: "HABIS" | "MENIPIS";
  warna: "red" | "yellow";
  hargaBeliDefault: number;
  namaSatuanDefault: string;
}

export default function PerluBelanjaPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stock/low");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat daftar belanja");
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const totalEstimasi = items.reduce(
    (sum, item) => sum + item.saranBeli * item.hargaBeliDefault,
    0
  );

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      {/* Header (Disembunyikan saat mencetak) */}
      <div className="shrink-0 print:hidden">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Daftar Perlu Belanja
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Produk yang stok fisiknya sudah habis atau kurang dari batas stok minimum yang telah ditentukan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchLowStock}
              className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Muat ulang"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              onClick={handlePrint}
              className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all flex items-center gap-2 text-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak daftar belanja</span>
            </button>
          </div>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      </div>

      {/* Dokumen Format Cetak & Tampilan Layar */}
      <div className="flex-1 min-h-0 overflow-y-auto print:overflow-visible">
        {/* Header Khusus Print */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            Daftar Belanja Restock Sembako
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Waktu Cetak: {formatDateTime(new Date())} · Total Barang Perlu Belanja: {items.length} item
          </p>
        </div>

        {loading ? (
          <CardListSkeleton count={5} />
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm font-bold text-emerald-600">Alhamdulillah, Semua Stok Aman!</p>
            <p className="text-xs text-slate-400 mt-1">
              Tidak ada produk yang habis atau berada di bawah batas stok minimum.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable>
              <DataTableHeader className="print:bg-transparent">
                <tr>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Nama produk</DataTableHead>
                  <DataTableHead>Kategori</DataTableHead>
                  <DataTableHead align="center">Stok saat ini</DataTableHead>
                  <DataTableHead align="center">Stok min</DataTableHead>
                  <DataTableHead align="center">Saran belanja</DataTableHead>
                  <DataTableHead align="right">Est. harga beli</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                    <td className="py-3.5 pr-3">
                      {item.status === "HABIS" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          Habis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Menipis
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-zinc-100">{item.nama}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-500 dark:text-zinc-400">{item.kategori}</td>
                    <td className="py-3.5 px-3 text-center font-semibold text-rose-600 tabular-nums">
                      {formatDecimal(item.stokSaatIni)} {item.satuanDasar}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400 tabular-nums">
                      {formatDecimal(item.stokMinimum)} {item.satuanDasar}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-rose-600 tabular-nums">
                      +{formatDecimal(item.saranBeli)} {item.namaSatuanDefault}
                    </td>
                    <td className="py-3.5 pl-3 text-right font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
                      {formatRupiah(item.hargaBeliDefault)}
                    </td>
                  </tr>
                ))}
              </DataTableBody>
              <tfoot className="border-t border-slate-200 dark:border-zinc-800 font-sans text-xs">
                <tr>
                  <td colSpan={5} className="py-4 px-3 font-semibold text-slate-700 dark:text-zinc-300 text-right">
                    Total estimasi belanja:
                  </td>
                  <td colSpan={2} className="py-4 pl-3 font-bold text-right text-base text-rose-600 tabular-nums">
                    {formatRupiah(totalEstimasi)}
                  </td>
                </tr>
              </tfoot>
            </DataTable>
          </div>
        )}
      </div>
    </div>
  );
}
