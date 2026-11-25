"use client";

import { useEffect, useState, Suspense } from "react";
import { DetailPageSkeleton } from "@/components/shared/Skeleton";
import { useSearchParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Calendar,
  CalendarDays,
  RefreshCw,
  ArrowUpRight,
  Banknote,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatTanggal(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBulan(key: string) {
  // key = "2024-11"
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

// ─── Tab: Laporan Pendapatan ────────────────────────────────────────────────
function TabPendapatan() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preset, setPreset] = useState<"hari" | "minggu" | "bulan" | "custom">("bulan");
  const [view, setView] = useState<"harian" | "bulanan">("harian");
  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPageSize, setRekapPageSize] = useState(10);

  const applyPreset = (p: "hari" | "minggu" | "bulan" | "custom") => {
    setPreset(p);
    setRekapPage(1);
    const now = new Date();
    if (p === "hari") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (p === "minggu") {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((day + 6) % 7));
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (p === "bulan") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      const d = await res.json();
      if (res.ok) setData(d.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyPreset("bulan");
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Hitung rekap harian dari transaksi
  const rekapHarian: { tanggal: string; total: number; count: number }[] = [];
  if (data?.transactions) {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of data.transactions) {
      const tgl = new Date(t.dibuatPada).toISOString().split("T")[0];
      const existing = map.get(tgl) || { total: 0, count: 0 };
      existing.total += t.total;
      existing.count += 1;
      map.set(tgl, existing);
    }
    map.forEach((val, key) =>
      rekapHarian.push({ tanggal: key, ...val })
    );
    rekapHarian.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }

  // Rekap bulanan
  const rekapBulanan: { bulan: string; total: number; count: number }[] = [];
  if (data?.transactions) {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of data.transactions) {
      const d = new Date(t.dibuatPada);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = map.get(key) || { total: 0, count: 0 };
      existing.total += t.total;
      existing.count += 1;
      map.set(key, existing);
    }
    map.forEach((val, key) =>
      rekapBulanan.push({ bulan: key, ...val })
    );
    rekapBulanan.sort((a, b) => b.bulan.localeCompare(a.bulan));
  }

  const pendapatanHariIni = rekapHarian[0]?.tanggal === new Date().toISOString().split("T")[0]
    ? rekapHarian[0]?.total ?? 0
    : 0;
  const pendapatanBulanIni = rekapBulanan[0]?.total ?? 0;
  const rataRataHarian =
    rekapHarian.length > 0
      ? Math.round((data?.totalOmzet ?? 0) / rekapHarian.length)
      : 0;

  return (
    <div className="space-y-4">
      {/* Header Content Flat */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Laporan Pendapatan
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Rekap pendapatan kotor harian hingga bulanan, total omzet, serta analisis metode pembayaran.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 self-start sm:self-auto cursor-pointer"
          title="Muat ulang"
          aria-label="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Filter Garis Bawah */}
      <div className="pt-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 flex-wrap text-xs">
          {(["hari", "minggu", "bulan", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`pb-2.5 -mb-[11px] border-b-2 transition-colors capitalize cursor-pointer ${
                preset === p
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              {p === "hari" ? "Hari ini" : p === "minggu" ? "Minggu ini" : p === "bulan" ? "Bulan ini" : "Kustom"}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-slate-900"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-slate-900"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-4">
          <DetailPageSkeleton />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Gagal memuat data
        </div>
      ) : (
        <>
          {/* KPI 4 Kolom Flat */}
          <div className="!mt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-zinc-800 border-b border-slate-200 dark:border-zinc-800">
            {[
              {
                label: "Pendapatan hari ini",
                value: formatRupiah(pendapatanHariIni),
                color: "text-slate-900 dark:text-zinc-100",
              },
              {
                label: "Pendapatan bulan ini",
                value: formatRupiah(pendapatanBulanIni),
                color: "text-emerald-700 dark:text-emerald-500",
              },
              {
                label: "Total periode",
                value: formatRupiah(data.totalOmzet),
                color: "text-rose-600 dark:text-rose-500",
              },
              {
                label: "Rata-rata / hari",
                value: formatRupiah(rataRataHarian),
                color: "text-slate-900 dark:text-zinc-100",
              },
            ].map((kpi, idx) => (
              <div
                key={kpi.label}
                className={`py-5 ${idx === 0 ? "sm:pr-6" : idx === 3 ? "sm:pl-6" : "sm:px-6"}`}
              >
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                  {kpi.label}
                </span>
                <p className={`text-2xl font-bold ${kpi.color} mt-1 tabular-nums`}>{kpi.value}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {data.totalTransaksi} transaksi selesai
                </p>
              </div>
            ))}
          </div>

          {/* Breakdown Metode */}
          <div className="py-4 border-b border-slate-200 dark:border-zinc-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 mb-3">
              Pendapatan per metode pembayaran
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-zinc-800">
              {Object.entries(data.perMetode || {}).map(([metode, val]: any, idx: number) => (
                <div
                  key={metode}
                  className={`flex items-center justify-between py-3 ${
                    idx === 0 ? "sm:pr-6" : idx === 2 ? "sm:pl-6" : "sm:px-6"
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      {metode}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-zinc-100 tabular-nums mt-0.5">
                      {formatRupiah(val.total)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {val.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabel Rincian Minimalist */}
          <div className="pt-2">
            <div className="pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Rincian pendapatan</h4>
              <div className="flex gap-4 text-xs">
                <button
                  onClick={() => {
                    setView("harian");
                    setRekapPage(1);
                  }}
                  className={`transition-colors cursor-pointer ${
                    view === "harian"
                      ? "font-semibold text-slate-900 dark:text-white underline underline-offset-4"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Per hari
                </button>
                <button
                  onClick={() => {
                    setView("bulanan");
                    setRekapPage(1);
                  }}
                  className={`transition-colors cursor-pointer ${
                    view === "bulanan"
                      ? "font-semibold text-slate-900 dark:text-white underline underline-offset-4"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Per bulan
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600 dark:text-zinc-300">
                <thead className="border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-3 pr-4 text-left">
                      {view === "harian" ? "Tanggal" : "Bulan"}
                    </th>
                    <th className="py-3 px-4 text-center">Jumlah transaksi</th>
                    <th className="py-3 pl-4 text-right">Pendapatan kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {(view === "harian" ? rekapHarian : rekapBulanan).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-8 text-slate-400 text-xs"
                      >
                        Tidak ada data pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    (view === "harian" ? rekapHarian : rekapBulanan)
                      .slice((rekapPage - 1) * rekapPageSize, rekapPage * rekapPageSize)
                      .map((row: any) => (
                      <tr
                        key={view === "harian" ? row.tanggal : row.bulan}
                        className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150"
                      >
                        <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-zinc-100">
                          {view === "harian"
                            ? formatTanggal(row.tanggal)
                            : formatBulan(row.bulan)}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500 dark:text-zinc-400">
                          {row.count} transaksi
                        </td>
                        <td className="py-3.5 pl-4 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                          {formatRupiah(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(view === "harian" ? rekapHarian : rekapBulanan).length > 0 && (
                  <tfoot className="border-t border-slate-200 dark:border-zinc-800">
                    <tr>
                      <td className="py-3.5 pr-4 text-xs font-semibold text-slate-600 dark:text-zinc-300">
                        Total periode
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-700 dark:text-zinc-200">
                        {data.totalTransaksi}x
                      </td>
                      <td className="py-3.5 pl-4 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                        {formatRupiah(data.totalOmzet)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {(view === "harian" ? rekapHarian : rekapBulanan).length > 0 && (
              <div className="pt-3">
                <Pagination
                  currentPage={rekapPage}
                  totalItems={(view === "harian" ? rekapHarian : rekapBulanan).length}
                  pageSize={rekapPageSize}
                  onPageChange={setRekapPage}
                  onPageSizeChange={setRekapPageSize}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Laporan Piutang ───────────────────────────────────────────────────
function TabPiutang() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"saldo" | "mutasi">("saldo");
  const [saldoPage, setSaldoPage] = useState(1);
  const [saldoPageSize, setSaldoPageSize] = useState(10);
  const [mutasiPage, setMutasiPage] = useState(1);
  const [mutasiPageSize, setMutasiPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/debts");
      const d = await res.json();
      if (res.ok) setData(d.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const members: any[] = data?.members ?? [];
  const totalPiutang = data?.totalPiutang ?? 0;
  const totalMember = data?.totalMemberUtang ?? 0;

  return (
    <div className="space-y-4">
      {/* Header Content Flat */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Laporan Piutang
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Laporan utang member kasbon, saldo belum lunas, status jatuh tempo, dan riwayat mutasi pembayaran.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 self-start sm:self-auto cursor-pointer"
          title="Muat ulang"
          aria-label="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>
      {loading ? (
        <div className="py-4">
          <DetailPageSkeleton />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Gagal memuat data
        </div>
      ) : (
        <>
          {/* KPI Summary 3 Kolom Flat */}
          <div className="!mt-0 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-zinc-800 border-b border-slate-200 dark:border-zinc-800">
            <div className="py-5 sm:pr-6">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                Total piutang aktif
              </span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1 tabular-nums">
                {formatRupiah(totalPiutang)}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{totalMember} member aktif berutang</p>
            </div>

            <div className="py-5 sm:px-6">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                Utang lama / overdue
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
                {members.filter((m) => m.isOverdue).length}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">member melewati batas waktu</p>
            </div>

            <div className="py-5 sm:pl-6">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                Rata-rata per member
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
                {totalMember > 0 ? formatRupiah(Math.round(totalPiutang / totalMember)) : "Rp 0"}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">rata-rata saldo utang</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="pt-2">
            <div className="pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Laporan piutang member</h4>
              <div className="flex gap-4 text-xs">
                <button
                  onClick={() => setViewMode("saldo")}
                  className={`transition-colors cursor-pointer ${
                    viewMode === "saldo"
                      ? "font-semibold text-slate-900 dark:text-white underline underline-offset-4"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Daftar saldo
                </button>
                <button
                  onClick={() => setViewMode("mutasi")}
                  className={`transition-colors cursor-pointer ${
                    viewMode === "mutasi"
                      ? "font-semibold text-slate-900 dark:text-white underline underline-offset-4"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Riwayat kasbon
                </button>
              </div>
            </div>

            {viewMode === "saldo" ? (
              <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-600 dark:text-zinc-300">
                  <thead className="border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="py-3 pr-4 text-left">Nama Pelanggan</th>
                      <th className="py-3 px-4 text-left">No. HP</th>
                      <th className="py-3 px-4 text-center">Umur utang</th>
                      <th className="py-3 px-4 text-right">Saldo utang</th>
                      <th className="py-3 pl-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                          Tidak ada piutang aktif.
                        </td>
                      </tr>
                    ) : (
                      members
                        .slice((saldoPage - 1) * saldoPageSize, saldoPage * saldoPageSize)
                        .map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                          <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-zinc-100">{m.nama}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                            {m.telepon || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-xs font-medium ${
                                m.isOverdue
                                  ? "text-rose-600 font-semibold"
                                  : "text-slate-500 dark:text-zinc-400"
                              }`}
                            >
                              {m.daysOld ?? 0} hari
                              {m.isOverdue ? " ⚠️" : ""}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-rose-600 tabular-nums">
                            {formatRupiah(m.saldoUtangCache)}
                          </td>
                          <td className="py-3.5 pl-4 text-center">
                            {m.saldoUtangCache > 0 ? (
                              <span className="text-xs font-semibold text-rose-600">
                                Belum Lunas
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600">
                                Lunas
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {members.length > 0 && (
                    <tfoot className="border-t border-slate-200 dark:border-zinc-800">
                      <tr>
                        <td
                          colSpan={3}
                          className="py-3.5 pr-4 text-xs font-semibold text-slate-600 dark:text-zinc-300"
                        >
                          Total piutang
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 tabular-nums">
                          {formatRupiah(totalPiutang)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {members.length > 0 && (
                <div className="pt-3">
                  <Pagination
                    currentPage={saldoPage}
                    totalItems={members.length}
                    pageSize={saldoPageSize}
                    onPageChange={setSaldoPage}
                    onPageSizeChange={setSaldoPageSize}
                  />
                </div>
              )}
              </>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-600 dark:text-zinc-300">
                  <thead className="border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="py-3 pr-4 text-left">Tanggal</th>
                      <th className="py-3 px-4 text-left">Pelanggan</th>
                      <th className="py-3 px-4 text-left">Tipe</th>
                      <th className="py-3 px-4 text-right">Jumlah</th>
                      <th className="py-3 pl-4 text-left">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans text-xs">
                    {(data?.riwayatMutasi ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          Belum ada riwayat kasbon.
                        </td>
                      </tr>
                    ) : (
                      (data.riwayatMutasi as any[])
                        .slice((mutasiPage - 1) * mutasiPageSize, mutasiPage * mutasiPageSize)
                        .map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(r.dibuatPada).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {r.member?.nama ?? "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                r.tipe === "KASBON" || r.tipe === "SALDO_AWAL"
                                  ? "bg-rose-50 text-rose-700"
                                  : r.tipe === "PEMBAYARAN"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {r.tipe}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-black ${
                              r.tipe === "PEMBAYARAN"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {r.tipe === "PEMBAYARAN" ? "-" : "+"}
                            {formatRupiah(r.jumlah)}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {r.catatan ? String(r.catatan).split("|| JSON:")[0].trim() : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {(data?.riwayatMutasi ?? []).length > 0 && (
                <div className="pt-3">
                  <Pagination
                    currentPage={mutasiPage}
                    totalItems={(data?.riwayatMutasi ?? []).length}
                    pageSize={mutasiPageSize}
                    onPageChange={setMutasiPage}
                    onPageSizeChange={setMutasiPageSize}
                  />
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
function LaporanContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "sales";

  return (
    <div className="space-y-6 w-full pb-12 select-none">
      {tab === "debts" ? <TabPiutang /> : <TabPendapatan />}
    </div>
  );
}

export default function LaporanOwnerPage() {
  return (
    <Suspense
      fallback={<DetailPageSkeleton />}
    >
      <LaporanContent />
    </Suspense>
  );
}
