"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xl space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Terjadi Kendala Sistem</h2>
        <div className="p-3 bg-slate-50 rounded-xl text-left font-mono text-xs text-rose-600 break-words max-h-40 overflow-y-auto">
          {error?.message || "Halaman mengalami error saat memuat data."}
          {error?.digest && <div className="text-[10px] text-slate-400 mt-1">Digest: {error.digest}</div>}
        </div>
        <button
          onClick={() => reset()}
          className="h-11 px-6 bg-[#F0090F] hover:bg-[#D6080E] active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all inline-flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Muat Ulang Halaman</span>
        </button>
      </div>
    </div>
  );
}

