"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw, Volume2, AlertCircle } from "lucide-react";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-viewport";

  // Audio beep saat barcode berhasil terbaca
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
          html5QrCodeRef.current = null;
        });
      }
      return;
    }

    setIsInitializing(true);
    setErrorMessage(null);
    setLastScanned(null);

    const formatsToSupport = [
      Html5QrcodeSupportedFormats.EAN_13, // Standar utama produk Indonesia (899...)
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.QR_CODE,
    ];

    const scanner = new Html5Qrcode(containerId, {
      formatsToSupport,
      verbose: false,
    });
    html5QrCodeRef.current = scanner;

    const config = {
      fps: 20,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        // Kotak scan presisi 280x120 atau disesuaikan dengan viewport
        const width = Math.min(viewfinderWidth * 0.85, 320);
        const height = Math.min(viewfinderHeight * 0.5, 140);
        return {
          width: Math.floor(width),
          height: Math.floor(height),
        };
      },
    };

    scanner
      .start(
        { facingMode: "environment" }, // Kamera belakang HP/laptop/webcam
        config,
        (decodedText: string) => {
          playBeep();
          setLastScanned(decodedText);
          // Hentikan camera scanner terlebih dahulu sebelum callback menutup modal
          if (scanner.isScanning) {
            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                scanner.clear();
                html5QrCodeRef.current = null;
                onScanSuccess(decodedText);
              });
          } else {
            onScanSuccess(decodedText);
          }
        },
        () => {
          // Frame tidak membaca barcode, lanjutkan scanning
        }
      )
      .then(() => {
        setIsInitializing(false);
      })
      .catch((err: any) => {
        setIsInitializing(false);
        setErrorMessage(
          err?.message || "Tidak dapat mengakses kamera. Pastikan izin kamera aktif."
        );
      });

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-zinc-800 flex flex-col">
        {/* Header Modal */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-800 dark:text-primary-200 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                Scanner Barcode Produk
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Dukung EAN-13 (899...) sembako, makanan, minuman & QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Kamera Responsive */}
        <div className="relative bg-black w-full min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden [&_#qr-shaded-region]:hidden">
          <div
            id={containerId}
            className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Overlay Box Scanner yang Pas, Presisi & Elegan */}
          {!errorMessage && !isInitializing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Scan box frame */}
              <div className="w-[85%] max-w-[320px] h-[130px] relative rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.35)] overflow-hidden">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg" />

                {/* Laser Barcode Animation */}
                <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {isInitializing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              <span>Menyiapkan kamera scanner...</span>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-4 p-4 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              <p className="font-semibold">Kamera Tidak Tersedia</p>
              <p className="text-[11px] text-rose-300">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer Info & Last Scanned */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-850 border-t border-slate-100 dark:border-zinc-800 space-y-2">
          {lastScanned ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-mono font-bold">{lastScanned}</span>
              </div>
              <span className="text-[10px] font-semibold">Tercatat!</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 text-center leading-relaxed">
              Arahkan kamera ke barcode kemasan produk sembako Indonesia. Kamera akan otomatis mendeteksi dan memasukkan ke keranjang belanja.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 font-bold text-xs text-slate-800 dark:text-zinc-100 transition-colors"
            >
              Tutup Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

