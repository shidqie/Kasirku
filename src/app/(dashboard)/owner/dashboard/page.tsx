"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { formatRupiah, formatDateTime } from "@/lib/formatters";

const METODE_LABEL: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KASBON: "Kasbon",
};

export default function OwnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/dashboard");
      const d = await res.json();
      if (res.ok) setData(d.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* Header & KPI Grid Fixed at Top */}
      <div className="shrink-0">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Ringkasan toko
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Penjualan hari ini, uang masuk, utang pelanggan, dan stok yang perlu dibeli.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSummary}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 self-start cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {/* 4-Column KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-zinc-800 border-b border-slate-200 dark:border-zinc-800">
          {/* 1. Penjualan hari ini */}
          <div className="py-6 sm:pr-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Penjualan hari ini
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1.5 tabular-nums">
              {formatRupiah(data?.omzetHariIni || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {data?.transaksiHariIni || 0} transaksi hari ini
            </p>

            <div className="mt-5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Tunai</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                  {formatRupiah(data?.pendapatanPerMetode?.TUNAI || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>QRIS</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                  {formatRupiah(data?.pendapatanPerMetode?.QRIS || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Transfer bank</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                  {formatRupiah(data?.pendapatanPerMetode?.TRANSFER || 0)}
                </span>
              </div>
              {(data?.pendapatanPerMetode?.KASBON || 0) > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Kasbon</span>
                  <span className="font-medium text-rose-600 dark:text-rose-500 tabular-nums">
                    {formatRupiah(data?.pendapatanPerMetode?.KASBON || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Penjualan bulan ini */}
          <div className="py-6 sm:px-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Penjualan bulan ini
            </span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500 mt-1.5 tabular-nums">
              {formatRupiah(data?.omzetBulanIni || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {data?.transaksiBulanIni || 0} transaksi bulan ini
            </p>
          </div>

          {/* 3. Utang pelanggan */}
          <div className="py-6 sm:px-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Utang pelanggan
            </span>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1.5 tabular-nums">
              {formatRupiah(data?.totalPiutangKasbon || 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {data?.memberUtangCount || 0} pelanggan masih punya utang
            </p>
          </div>

          {/* 4. Stok barang habis */}
          <div className="py-6 sm:pl-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Stok barang habis
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1.5 tabular-nums">
              {data?.habisCount || 0}{" "}
              <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                jenis barang
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {data?.lowStockCount || 0} barang hampir habis
            </p>
          </div>
        </div>
      </div>

        {/* 2-Column Bottom Lists (Each column has fixed header & scrollable list) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 overflow-hidden">
          {/* Transaksi terkini */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Transaksi terkini
              </h3>
              <Link
                href="/transaksi"
                className="text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
              >
                Lihat semua
              </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-200/70 dark:divide-zinc-800 pr-1">
              {loading ? (
                <p className="py-6 text-center text-slate-400 text-xs">
                  Memuat data transaksi...
                </p>
              ) : (data?.recentTrx || []).length === 0 ? (
                <p className="py-6 text-center text-slate-400 text-xs">
                  Belum ada transaksi.
                </p>
              ) : (
                data.recentTrx.map((t: any) => {
                  const metodeKey = t.pembayaran?.[0]?.metode || "TUNAI";
                  const metodeLabel = METODE_LABEL[metodeKey] || metodeKey;

                  return (
                    <div
                      key={t.id}
                      className="py-3.5 px-1 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 block truncate">
                          {t.nomorStruk}
                        </span>
                        <span className="text-slate-500 dark:text-zinc-400 block text-[11px] mt-0.5 truncate">
                          Kasir: {t.kasir?.nama} · {formatDateTime(t.dibuatPada)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 block tabular-nums">
                          {formatRupiah(t.total)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                          {metodeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Penjualan produk terlaris */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Penjualan produk terlaris
              </h3>
              <Link
                href="/owner/laporan"
                className="text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
              >
                Lihat laporan
              </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-200/70 dark:divide-zinc-800 pr-1">
              {loading ? (
                <p className="py-6 text-center text-slate-400 text-xs">
                  Memuat produk terlaris...
                </p>
              ) : (data?.topProducts || []).length === 0 ? (
                <p className="py-6 text-center text-slate-400 text-xs">
                  Belum ada data penjualan produk.
                </p>
              ) : (
                data.topProducts.map((p: any) => (
                  <div
                    key={p.id || p.rank}
                    className="py-3.5 px-1 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 w-4 shrink-0 pt-0.5 tabular-nums">
                        {p.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 block truncate">
                          {p.nama}
                        </span>
                        <span className="text-slate-500 dark:text-zinc-400 block text-[11px] mt-0.5 truncate">
                          {p.kategori} · {p.totalQty.toLocaleString("id-ID")} {p.satuan} terjual
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 block tabular-nums">
                        {formatRupiah(p.totalRevenue)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5 tabular-nums">
                        {p.totalQty.toLocaleString("id-ID")} {p.satuan}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
