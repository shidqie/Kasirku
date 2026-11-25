"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Eye, X } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";

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

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

  // Filters & Pagination
  const [filterEntitas, setFilterEntitas] = useState("");
  const [filterAksi, setFilterAksi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
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
  }, [filterEntitas, filterAksi, currentPage]);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
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

      {/* Log Table Minimalist (Scrollable Internal) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Belum ada log yang sesuai filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
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
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800 dark:text-zinc-200">
                      {log.aksi}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                      {log.entitas}
                      {log.entitasId && <span className="text-slate-400"> #{log.entitasId.slice(-6)}</span>}
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      {log.sebelumJson || log.sesudahJson ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {/* Modal Detail JSON */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                Detail Perubahan: {selectedLog.aksi} ({selectedLog.entitas})
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 text-xs font-sans">
              {selectedLog.sebelumJson && (
                <div>
                  <p className="font-bold text-rose-600 uppercase mb-1">Nilai Sebelum:</p>
                  <pre className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl overflow-x-auto text-slate-800">
                    {JSON.stringify(selectedLog.sebelumJson, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.sesudahJson && (
                <div>
                  <p className="font-bold text-emerald-600 uppercase mb-1">Nilai Sesudah:</p>
                  <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl overflow-x-auto text-slate-800">
                    {JSON.stringify(selectedLog.sesudahJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

