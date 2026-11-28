"use client";

import { useState } from "react";
import { X, Camera, Volume2 } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-[#F0090F] dark:bg-red-950/40 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                Scan Barcode Produk
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Arahkan kamera ke barcode kemasan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Cepat */}
        <div className="p-4 space-y-3">
          <BarcodeScanner
            autoStart
            continuous
            cooldownMs={1500}
            onScan={(code) => {
              setLastScanned(code);
              onScanSuccess(code);
            }}
          />

          {lastScanned && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                Terdeteksi: <strong className="font-mono">{lastScanned}</strong>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                Berhasil
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">
              Mendukung QR Code, Data Matrix, PDF417, EAN-13, EAN-8, UPC &amp; Code-128.
            </p>
            <button
              onClick={onClose}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
