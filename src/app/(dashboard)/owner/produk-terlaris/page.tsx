"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { RefreshCw, X, ArrowUpDown } from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { Pagination } from "@/components/shared/Pagination";
import { PopupAlert } from "@/components/shared/ToastProvider";

interface TopProductItem {
  rank: number;
  id: string;
  nama: string;
  satuan: string;
  kategoriId: string;
  kategori: string;
  stokSaatIni: number;
  jumlahTransaksi: number;
  totalQty: number;
  totalRevenue: number;
  sharePercent: number;
}

type PresetRange = "ALL" | "TODAY" | "7D" | "30D" | "CUSTOM";

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProdukTerlarisPage() {
  const [items, setItems] = useState<TopProductItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<PresetRange>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("ALL");
  const [sortBy, setSortBy] = useState<"qty" | "revenue">("qty");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchReport = useCallback(async (sDate?: string, eDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (sDate) params.set("startDate", sDate);
      if (eDate) params.set("endDate", eDate);
      const res = await fetch(`/api/reports/top-products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data produk terlaris");
      setItems(data.report?.items || []);
      setSummary(data.report?.summary || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(startDate || undefined, endDate || undefined);
  }, [fetchReport, startDate, endDate]);

  const applyPreset = (p: PresetRange) => {
    setPreset(p);
    setCurrentPage(1);
    const now = new Date();
    if (p === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (p === "TODAY") {
      const today = toInputDate(now);
      setStartDate(today);
      setEndDate(today);
    } else if (p === "7D") {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setStartDate(toInputDate(past));
      setEndDate(toInputDate(now));
    } else if (p === "30D") {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      setStartDate(toInputDate(past));
      setEndDate(toInputDate(now));
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.kategori) set.add(it.kategori);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((it) => {
      const matchSearch =
        !q ||
        it.nama.toLowerCase().includes(q) ||
        it.kategori.toLowerCase().includes(q);
      const matchKat = selectedKategori === "ALL" || it.kategori === selectedKategori;
      return matchSearch && matchKat;
    });

    const sorted = [...list].sort((a, b) =>
      sortBy === "revenue" ? b.totalRevenue - a.totalRevenue : b.totalQty - a.totalQty
    );

    return sorted.map((it, idx) => ({ ...it, displayRank: idx + 1 }));
  }, [items, search, selectedKategori, sortBy]);

  const paginated = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage, pageSize]
  );

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* Header & Filter Fixed */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Produk Terlaris
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Peringkat penjualan seluruh produk berdasarkan kuantitas terjual dan total omzet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchReport(startDate || undefined, endDate || undefined)}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />

        {/* Filter Bar Minimalis (Seragam dengan Log Kontrol) */}
        <div className="py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-slate-500 dark:text-zinc-400">
              Peringkat produk ({filteredItems.length} entri · Omzet {formatRupiah(summary?.totalRevenueAll || 0)})
            </span>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-zinc-800">
              {(
                [
                  { key: "ALL", label: "Semua" },
                  { key: "TODAY", label: "Hari ini" },
                  { key: "7D", label: "7 hari" },
                  { key: "30D", label: "30 hari" },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => applyPreset(btn.key)}
                  className={`transition-colors cursor-pointer ${
                    preset === btn.key
                      ? "font-semibold text-slate-900 dark:text-white underline underline-offset-4"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset("CUSTOM");
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset("CUSTOM");
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <div className="relative w-44">
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedKategori}
              onChange={(e) => {
                setSelectedKategori(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-slate-900 dark:focus:border-white"
            >
              <option value="ALL">Semua kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSortBy((prev) => (prev === "qty" ? "revenue" : "qty"));
                setCurrentPage(1);
              }}
              className="h-8 px-2 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortBy === "qty" ? "Qty Terjual" : "Omzet Tertinggi"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Peringkat (Scrollable Internal, Sticky Header) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
          <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="py-3 pr-3 w-12">No.</th>
              <th className="py-3 px-4">Nama produk</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4 text-right">Stok saat ini</th>
              <th className="py-3 px-4 text-right">Terjual</th>
              <th className="py-3 px-4 text-right">Omzet</th>
              <th className="py-3 pl-4 w-36 text-right">Kontribusi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans text-xs">
            {loading ? (
              <TableSkeletonRows rows={8} cols={7} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Belum ada data penjualan produk pada periode ini.
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150"
                >
                  <td className="py-3.5 pr-3 tabular-nums font-bold text-slate-500 dark:text-zinc-400">
                    {p.displayRank <= 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                          p.displayRank === 1
                            ? "bg-amber-100 text-amber-700"
                            : p.displayRank === 2
                            ? "bg-slate-200 text-slate-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {p.displayRank}
                      </span>
                    ) : (
                      <span>{p.displayRank}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 block">
                      {p.nama}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {p.jumlahTransaksi} kali transaksi
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                    {p.kategori}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-slate-600 dark:text-zinc-300">
                    {formatDecimal(p.stokSaatIni)} {p.satuan}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-zinc-100">
                    {formatDecimal(p.totalQty)} {p.satuan}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-zinc-100">
                    {formatRupiah(p.totalRevenue)}
                  </td>
                  <td className="py-3.5 pl-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(100, Math.max(2, p.sharePercent))}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums w-10 text-right">
                        {p.sharePercent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredItems.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
