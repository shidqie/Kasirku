"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xl space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Terjadi Kesalahan Aplikasi</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error.message || "Terjadi kesalahan global pada aplikasi Kasirku POS."}
          </p>
          <button
            onClick={() => reset()}
            className="h-11 px-6 bg-[#F0090F] hover:bg-[#D6080E] active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all inline-flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </body>
    </html>
  );
}

