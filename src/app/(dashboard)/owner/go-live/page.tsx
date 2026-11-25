"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Database,
} from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  actionUrl?: string;
}

interface GoLiveStatus {
  isReady: boolean;
  score: number;
  totalChecks: number;
  checks: CheckItem[];
}

export default function GoLiveChecklistPage() {
  const [data, setData] = useState<GoLiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/go-live-status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunBackup = async () => {
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      // Panggil refresh setelah jeda simulasi atau info
      setTimeout(() => {
        setBackupMsg("Skrip backup tersedia di './scripts/backup-db.sh' dan 'npm run backup'.");
        setBackupLoading(false);
        fetchStatus();
      }, 600);
    } catch {
      setBackupLoading(false);
    }
  };

  const percentage = data ? Math.round((data.score / data.totalChecks) * 100) : 0;

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Checklist Kesiapan Go-Live Toko
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Verifikasi kelengkapan konfigurasi master data dan sistem sebelum toko beroperasi penuh (Bagian 9 MVP).
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          title="Muat ulang"
          aria-label="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{percentage}%</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  data?.isReady
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {data?.isReady ? "Siap Go-Live Penuh" : "Perlu Tindakan Lanjutan"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data?.score || 0} dari {data?.totalChecks || 8} kriteria kesiapan operasional terpenuhi
            </p>
          </div>
          {data?.isReady && (
            <div className="text-sm text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-200 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              Sistem toko sembako siap digunakan secara live!
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentage === 100 ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {data?.checks.map((item, index) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition flex items-start sm:items-center justify-between gap-4 ${
              item.completed
                ? "bg-white border-slate-200"
                : "bg-amber-50/40 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans font-bold text-slate-400">
                    #{index + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {item.label}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {item.actionUrl && (
                <Link
                  href={item.actionUrl}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    item.completed
                      ? "text-slate-600 bg-slate-100 hover:bg-slate-200"
                      : "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                  }`}
                >
                  {item.completed ? "Buka Pengaturan" : "Konfigurasi Sekarang"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Database Backup Section */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold">Operasional Backup Database Harian</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Sesuai prinsip 5.6 dan 5.7, data toko wajib dibackup secara berkala. Skrip otomatis telah
              disiapkan di folder <code className="bg-slate-800 text-blue-300 px-1 py-0.5 rounded">./scripts/backup-db.sh</code> dan perintah npm <code className="bg-slate-800 text-blue-300 px-1 py-0.5 rounded">npm run backup</code>.
            </p>
          </div>
          <button
            onClick={handleRunBackup}
            disabled={backupLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition shrink-0 flex items-center gap-2 shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${backupLoading ? "animate-spin" : ""}`} />
            Cek Skrip Backup
          </button>
        </div>

        {backupMsg && (
          <div className="text-xs bg-slate-800/80 border border-slate-700 p-3 rounded-lg text-emerald-400">
            {backupMsg}
          </div>
        )}
      </div>
    </div>
  );
}

