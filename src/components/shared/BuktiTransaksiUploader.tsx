"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface BuktiTransaksiUploaderProps {
  transaksiId?: string;
  source?: "quick-qris" | "kasir" | "riwayat";
  initialKey?: string | null;
  onUploaded?: (result: { key: string; url: string }) => void;
  compact?: boolean;
}

export function BuktiTransaksiUploader({
  transaksiId,
  source = "kasir",
  initialKey = null,
  onUploaded,
  compact = false,
}: BuktiTransaksiUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState<string | null>(initialKey);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setUploadedKey(initialKey);
    setPreviewUrl(null);
    if (!initialKey) return;

    let cancelled = false;
    fetch(`/api/uploads/bukti-transaksi?key=${encodeURIComponent(initialKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) {
          setPreviewUrl(data.url);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialKey]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      if (transaksiId) {
        formData.append("transaksiId", transaksiId);
      }

      const res = await fetch("/api/uploads/bukti-transaksi", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengunggah bukti transaksi");
      }

      setUploadedKey(data.key);
      setPreviewUrl(data.url);
      onUploaded?.({ key: data.key, url: data.url });
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengunggah bukti transaksi");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadedKey && previewUrl ? (
        <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                Bukti transaksi tersimpan
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <span>Lihat bukti</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition-colors shrink-0 cursor-pointer"
          >
            {uploading ? "Mengunggah..." : "Ganti"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full h-10 px-3.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengunggah bukti transaksi...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload Bukti Transaksi</span>
            </>
          )}
        </button>
      )}

      {errorMsg && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
