"use client";

import { useEffect, useRef, useState } from "react";
import {
  CloudOff,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useOffline } from "./OfflineProvider";
import { formatDateTime } from "@/lib/formatters";

export function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    pendingItems,
    syncNow,
    removePendingItem,
  } = useOffline();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const badgeTone = !isOnline
    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
    : isSyncing
    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
    : pendingCount > 0
    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-8 px-2.5 sm:px-3 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${badgeTone}`}
        title={
          isOnline
            ? pendingCount > 0
              ? `${pendingCount} data menunggu sinkronisasi`
              : "Terhubung ke server (Online)"
            : "Mode Offline — data disimpan di perangkat"
        }
      >
        {!isOnline ? (
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
        ) : isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
        ) : (
          <Wifi className="w-3.5 h-3.5 shrink-0" />
        )}

        <span className="whitespace-nowrap">
          {!isOnline
            ? "Offline"
            : isSyncing
            ? "Sync..."
            : pendingCount > 0
            ? `Antrean (${pendingCount})`
            : "Online"}
        </span>

        {!isOnline && pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                {isOnline ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{isOnline ? "Koneksi Online" : "Mode Offline Aktif"}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {isOnline
                  ? "Data otomatis tersinkron ke server."
                  : "Data disimpan di perangkat & otomatis diupload saat online."}
              </p>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
            {pendingItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-zinc-500">
                Tidak ada data offline yang menunggu diupload.
              </div>
            ) : (
              pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-2.5 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDateTime(new Date(item.createdAt))}
                    </p>
                    {item.status === "FAILED" && item.errorMessage && (
                      <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.errorMessage}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                    title="Hapus dari antrean"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {pendingItems.length > 0 && (
            <div className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 flex justify-end">
              <button
                type="button"
                disabled={!isOnline || isSyncing}
                onClick={syncNow}
                className="h-8 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                />
                <span>{isSyncing ? "Mengupload..." : "Upload Sekarang"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
