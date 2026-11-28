"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Eye, X } from "lucide-react";
import { formatDateTime, formatRupiah } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeletonRows } from "@/components/shared/Skeleton";

interface ActivityLogItem {
  id: string;
  userId: string | null;
  role: string | null;
  aksi: string;
  entitas: string;
  entitasId: string | null;
  sebelumJson: any;
  sesudahJson: any;
  ip: string | null;
  dibuatPada: string;
  user: {
    nama: string;
    username: string;
    role: string;
  } | null;
}

type LogKategori = "semua" | "login" | "produk" | "transaksi" | "stok" | "member" | "pengaturan";

const KATEGORI_TABS: { id: LogKategori; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "login", label: "Login" },
  { id: "produk", label: "Produk" },
  { id: "transaksi", label: "Transaksi" },
  { id: "stok", label: "Stok & Opname" },
  { id: "member", label: "Member & Kasbon" },
  { id: "pengaturan", label: "Pengaturan" },
];

const LOGIN_AKSI_SET = new Set([
  "LOGIN_BERHASIL",
  "LOGIN_GAGAL_PASSWORD",
  "LOGOUT",
  "VERIFIKASI_PIN_BERHASIL",
  "VERIFIKASI_PIN_GAGAL",
  "RESET_PASSWORD_DENGAN_PIN_OWNER",
]);

const STOK_AKSI_SET = new Set([
  "PENYESUAIAN_STOK_MANUAL",
  "REKONSILIASI_STOK_SELISIH",
]);

function getLogCategoryMeta(aksi: string, entitas: string): { label: string; className: string } {
  if (LOGIN_AKSI_SET.has(aksi)) {
    if (aksi.includes("GAGAL")) {
      return {
        label: "Login",
        className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      };
    }
    return {
      label: "Login",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    };
  }
  if (entitas === "BarangMasuk" || entitas === "StokOpname" || STOK_AKSI_SET.has(aksi)) {
    return {
      label: "Stok",
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    };
  }
  if (entitas === "Produk" || entitas === "Kategori") {
    return {
      label: "Produk",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    };
  }
  if (entitas === "Transaksi") {
    if (aksi === "VOID_TRANSAKSI") {
      return {
        label: "Transaksi",
        className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      };
    }
    return {
      label: "Transaksi",
      className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60",
    };
  }
  if (entitas === "Member" || entitas === "KasbonPembayaran" || entitas === "KasbonMutasi") {
    return {
      label: "Member",
      className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    };
  }
  return {
    label: "Pengaturan",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };
}

const FIELD_LABELS: Record<string, string> = {
  nama: "Nama",
  username: "Username",
  role: "Peran",
  barcode: "Barcode",
  kategori: "Kategori",
  kategoriId: "ID Kategori",
  satuanDasar: "Satuan Dasar",
  namaSatuan: "Satuan",
  faktorKeDasar: "Isi",
  hargaJual: "Harga Jual",
  hargaBeli: "Harga Beli",
  jual: "Harga Jual",
  beli: "Harga Beli",
  isDefault: "Default",
  satuan: "Daftar Satuan",
  satuanList: "Daftar Satuan",
  stokMinimum: "Stok Minimum",
  stokCache: "Stok",
  stok: "Stok",
  stokLama: "Stok Lama",
  stokBaru: "Stok Baru",
  aktif: "Status Aktif",
  nomor: "Nomor",
  total: "Total",
  totalLama: "Total Lama",
  totalBaru: "Total Baru",
  nominal: "Nominal",
  saldoUtang: "Saldo Utang",
  saldoUtangLama: "Saldo Utang Lama",
  saldoUtangBaru: "Saldo Utang Baru",
  catatan: "Catatan",
  catatanLama: "Catatan Lama",
  catatanBaru: "Catatan Baru",
  alasan: "Alasan",
  metode: "Metode",
  mode: "Mode",
  totalDikirim: "Total Dikirim",
  ditambahkan: "Ditambahkan",
  diperbarui: "Diperbarui",
  dilewati: "Dilewati",
  gagal: "Gagal",
  items: "Daftar Item",
  produkIds: "Produk Terkait",
};

function formatFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isCurrencyKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("harga") ||
    lower.includes("saldo") ||
    lower.includes("nominal") ||
    lower.includes("bayar") ||
    lower.includes("diskon") ||
    lower === "jual" ||
    lower === "beli" ||
    lower === "total" ||
    lower === "totallama" ||
    lower === "totalbaru"
  );
}

function formatPrimitiveValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "boolean") return val ? "Ya" : "Tidak";
  if (typeof val === "number") {
    return isCurrencyKey(key) ? formatRupiah(val) : val.toLocaleString("id-ID");
  }
  if (typeof val === "string") {
    const num = Number(val);
    if (isCurrencyKey(key) && !Number.isNaN(num) && val.trim() !== "") {
      return formatRupiah(num);
    }
    return val;
  }
  return String(val);
}

function ReadableValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">-</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">-</span>;

    if (typeof value[0] === "object" && value[0] !== null) {
      const cols = Array.from(
        new Set(value.flatMap((row) => Object.keys(row as Record<string, unknown>)))
      );
      return (
        <div className="border border-slate-200 dark:border-zinc-700 rounded-lg overflow-x-auto mt-1">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 dark:bg-zinc-800/70 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700">
              <tr>
                {cols.map((col) => (
                  <th key={col} className="py-1.5 px-2.5 font-medium whitespace-nowrap">
                    {formatFieldLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {value.map((row, idx) => (
                <tr key={idx}>
                  {cols.map((col) => (
                    <td key={col} className="py-1.5 px-2.5 text-slate-700 dark:text-zinc-200 whitespace-nowrap">
                      {formatPrimitiveValue(col, (row as Record<string, unknown>)[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px]"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-slate-400">-</span>;
    return (
      <div className="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-zinc-700">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">{formatFieldLabel(k)}</span>
            <span className="font-medium text-slate-800 dark:text-zinc-200 text-right">
              {formatPrimitiveValue(k, v)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{formatPrimitiveValue(fieldKey, value)}</span>;
}

function LogDetailsView({
  sebelum,
  sesudah,
}: {
  sebelum: Record<string, unknown> | null;
  sesudah: Record<string, unknown> | null;
}) {
  if (sebelum && sesudah) {
    const allKeys = Array.from(new Set([...Object.keys(sebelum), ...Object.keys(sesudah)]));
    return (
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-zinc-800/70 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
            <tr>
              <th className="py-2.5 px-3 font-medium">Data</th>
              <th className="py-2.5 px-3 font-medium text-rose-600 dark:text-rose-400">Sebelum</th>
              <th className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">Sesudah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {allKeys.map((key) => {
              const prevVal = sebelum[key];
              const nextVal = sesudah[key];
              const changed = JSON.stringify(prevVal) !== JSON.stringify(nextVal);
              return (
                <tr
                  key={key}
                  className={changed ? "bg-amber-50/40 dark:bg-amber-950/15" : ""}
                >
                  <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-zinc-400 align-top whitespace-nowrap">
                    {formatFieldLabel(key)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300 align-top">
                    <ReadableValue fieldKey={key} value={prevVal} />
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100 align-top">
                    <ReadableValue fieldKey={key} value={nextVal} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const single = sesudah || sebelum;
  const isBeforeOnly = Boolean(sebelum && !sesudah);
  if (!single) return null;

  const entries = Object.entries(single);
  return (
    <div className="space-y-2">
      <p
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          isBeforeOnly
            ? "text-rose-600 dark:text-rose-400"
            : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {isBeforeOnly ? "Data Sebelum Dihapus / Diubah" : "Rincian Data"}
      </p>
      <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl px-4">
        {entries.map(([key, value]) => {
          const isComplex = Array.isArray(value) || (typeof value === "object" && value !== null);
          return (
            <div
              key={key}
              className={`py-2.5 ${
                isComplex ? "space-y-1.5" : "flex items-baseline justify-between gap-4"
              }`}
            >
              <span className="text-slate-500 dark:text-zinc-400 shrink-0">
                {formatFieldLabel(key)}
              </span>
              <div
                className={`font-semibold text-slate-900 dark:text-zinc-100 ${
                  isComplex ? "" : "text-right"
                }`}
              >
                <ReadableValue fieldKey={key} value={value} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

  // Filters & Pagination
  const [kategori, setKategori] = useState<LogKategori>("semua");
  const [filterEntitas, setFilterEntitas] = useState("");
  const [filterAksi, setFilterAksi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (kategori !== "semua") params.set("kategori", kategori);
      if (filterEntitas) params.set("entitas", filterEntitas);
      if (filterAksi) params.set("aksi", filterAksi);
      params.set("limit", String(pageSize));
      params.set("offset", String((currentPage - 1) * pageSize));

      const res = await fetch(`/api/activity-log?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [kategori, filterEntitas, filterAksi, currentPage]);

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      {/* Header & Filter Fixed */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Log Aktivitas &amp; Jejak Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Catatan setiap aksi penting di sistem: siapa, apa yang diubah, waktu, nilai sebelum dan sesudah.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Tab Kategori Minimalis */}
        <div className="flex items-center gap-5 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar pt-3 text-xs">
          {KATEGORI_TABS.map((tab) => {
            const active = kategori === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setKategori(tab.id);
                  setCurrentPage(1);
                }}
                className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter Bar Minimalis */}
        <div className="py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Riwayat aktivitas ({total} entri)
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              placeholder="Cari entitas (User, Transaksi...)"
              value={filterEntitas}
              onChange={(e) => {
                setFilterEntitas(e.target.value);
                setCurrentPage(1);
              }}
              className="w-48 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
            />
            <input
              type="text"
              placeholder="Cari aksi (LOGIN, VOID...)"
              value={filterAksi}
              onChange={(e) => {
                setFilterAksi(e.target.value);
                setCurrentPage(1);
              }}
              className="w-48 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Log Table Minimalist (Scrollable Internal, Sticky Header) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Entitas</th>
                <th className="py-3 pl-4 text-center">Rincian perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans text-xs">
              {loading ? (
                <TableSkeletonRows rows={6} cols={5} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Belum ada log yang sesuai filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const catMeta = getLogCategoryMeta(log.aksi, log.entitas);
                  return (
                    <tr key={log.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatDateTime(log.dibuatPada)}
                      </td>
                      <td className="py-3.5 px-4 font-sans whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-zinc-100">{log.user.nama}</p>
                            <p className="text-[11px] text-slate-400 font-sans">@{log.user.username} ({log.role})</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sistem / Tamu</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${catMeta.className}`}>
                            {catMeta.label}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {log.aksi}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                        {log.entitas}
                        {log.entitasId && <span className="text-slate-400"> #{log.entitasId.slice(-6)}</span>}
                      </td>
                      <td className="py-3.5 pl-4 text-center">
                        {log.sebelumJson || log.sesudahJson ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Rincian</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {total > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modal Rincian Perubahan */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <p className="text-[11px] font-medium text-slate-400">
                  {formatDateTime(selectedLog.dibuatPada)} · {selectedLog.entitas}
                  {selectedLog.entitasId ? ` #${selectedLog.entitasId.slice(-6)}` : ""}
                </p>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  {selectedLog.aksi.replace(/_/g, " ")}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 text-xs font-sans">
              <LogDetailsView
                sebelum={selectedLog.sebelumJson}
                sesudah={selectedLog.sesudahJson}
              />
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

