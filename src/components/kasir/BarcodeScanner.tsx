"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Barcode,
  Camera,
  Flashlight,
  Keyboard,
  QrCode,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { parseScan } from "@/lib/barcode";

export type ScanMode = "1D" | "ALL";

export type BarcodeFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "qr_code"
  | "data_matrix";

export interface BarcodeScannerProps {
  /** Callback saat kode produk valid berhasil terbaca */
  onScan: (code: string, format: string) => void;
  /** Jeda anti-duplikat setelah scan valid dalam milidetik (default: 1300ms) */
  cooldownMs?: number;
  /** Otomatis menyalakan kamera saat komponen dimount (default: true) */
  autoStart?: boolean;
  /** true = terus scan (mode kasir), false = berhenti otomatis setelah 1 hasil */
  continuous?: boolean;
  /** Class tambahan untuk container terluar */
  className?: string;
}

export interface BarcodeScannerHandle {
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  toggleTorch: () => Promise<void>;
}

const SCAN_MODE_STORAGE_KEY = "kasirku_scanner_mode";

export const BarcodeScanner = forwardRef<BarcodeScannerHandle, BarcodeScannerProps>(
  function BarcodeScanner(
    {
      onScan,
      cooldownMs = 1300,
      autoStart = true,
      continuous = true,
      className = "",
    },
    ref
  ) {
    const rawId = useId();
    const containerId = `qr-reader-${rawId.replace(/:/g, "")}`;

    const scannerRef = useRef<any>(null);
    const lastHitRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
    const mountedRef = useRef<boolean>(true);
    const isRunningRef = useRef<boolean>(false);

    const [scanMode, setScanMode] = useState<ScanMode>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(SCAN_MODE_STORAGE_KEY);
        if (saved === "1D" || saved === "ALL") return saved;
      }
      return "1D";
    });
    const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "stopped" | "error">(
      "idle"
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const [torchOn, setTorchOn] = useState<boolean>(false);
    const [flashHit, setFlashHit] = useState<boolean>(false);
    const [manualCode, setManualCode] = useState<string>("");
    const [showManual, setShowManual] = useState<boolean>(false);

    const playBeep = useCallback(() => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.11);
        setTimeout(() => ctx.close().catch(() => {}), 200);
      } catch {}
    }, []);

    const triggerSuccessFeedback = useCallback(() => {
      playBeep();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(70);
        } catch {}
      }
      setFlashHit(true);
      setTimeout(() => {
        if (mountedRef.current) setFlashHit(false);
      }, 280);
    }, [playBeep]);

    const stop = useCallback(async () => {
      const instance = scannerRef.current;
      isRunningRef.current = false;
      if (instance) {
        try {
          if (instance.isScanning) {
            await instance.stop();
          }
          await instance.clear();
        } catch {}
        scannerRef.current = null;
      }
      setTorchOn(false);
      setTorchSupported(false);
      if (mountedRef.current) {
        setStatus((prev) => (prev === "error" ? "error" : "stopped"));
      }
    }, []);

    const start = useCallback(
      async (overrideDeviceId?: string, overrideMode?: ScanMode) => {
        await stop();
        if (!mountedRef.current) return;

        setErrorMessage(null);
        setStatus("starting");

        if (typeof window !== "undefined" && !window.isSecureContext) {
          setStatus("error");
          setErrorMessage("Akses kamera membutuhkan koneksi aman (HTTPS) atau localhost.");
          return;
        }

        try {
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
          const activeMode = overrideMode ?? scanMode;

          const formats1D = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ];
          const formatsAll = [
            ...formats1D,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ];

          const formatsToSupport = activeMode === "1D" ? formats1D : formatsAll;

          const availableCameras = await Html5Qrcode.getCameras().catch(() => []);
          if (mountedRef.current) {
            setCameras(availableCameras);
          }

          const html5Qr = new Html5Qrcode(containerId, {
            formatsToSupport,
            verbose: false,
          });
          scannerRef.current = html5Qr;

          const cameraConfig: string | MediaTrackConstraints =
            overrideDeviceId || selectedCameraId
              ? overrideDeviceId || selectedCameraId
              : { facingMode: "environment" };

          const qrboxSize =
            activeMode === "1D"
              ? (viewfinderWidth: number) => ({
                  width: Math.min(280, Math.floor(viewfinderWidth * 0.85)),
                  height: 110,
                })
              : (viewfinderWidth: number, viewfinderHeight: number) => {
                  const side = Math.min(230, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72));
                  return { width: side, height: side };
                };

          await html5Qr.start(
            cameraConfig,
            {
              fps: 12,
              qrbox: qrboxSize,
              aspectRatio: 4 / 3,
            },
            (decodedText: string) => {
              if (!isRunningRef.current || !mountedRef.current) return;

              const parsed = parseScan(decodedText);
              // Jika domain blokir halal / teks acak -> abaikan diam-diam
              if (parsed.type === "ignore") {
                return;
              }

              const now = Date.now();
              const isSameWithinCooldown =
                parsed.code === lastHitRef.current.code &&
                now - lastHitRef.current.time < cooldownMs;

              if (isSameWithinCooldown) return;

              lastHitRef.current = { code: parsed.code, time: now };
              triggerSuccessFeedback();
              onScan(parsed.code, parsed.source);

              if (!continuous) {
                stop();
              }
            },
            () => {
              // Abaikan error per-frame
            }
          );

          if (!mountedRef.current) {
            await stop();
            return;
          }

          isRunningRef.current = true;
          setStatus("scanning");

          // Deteksi dukungan senter (torch)
          try {
            const caps = html5Qr.getRunningTrackCameraCapabilities();
            const torchCap = caps?.torchFeature?.();
            setTorchSupported(Boolean(torchCap?.isSupported?.()));
          } catch {
            setTorchSupported(false);
          }
        } catch (err: any) {
          await stop();
          if (!mountedRef.current) return;
          setStatus("error");
          const msg = String(err?.message || err || "");
          if (msg.toLowerCase().includes("permission") || msg.includes("NotAllowedError")) {
            setErrorMessage(
              "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser Anda lalu coba lagi."
            );
          } else if (msg.includes("NotFoundError") || msg.toLowerCase().includes("no camera")) {
            setErrorMessage("Kamera tidak ditemukan. Gunakan input manual di bawah.");
          } else {
            setErrorMessage(msg || "Gagal mengakses kamera. Gunakan input manual.");
          }
        }
      },
      [containerId, continuous, cooldownMs, onScan, scanMode, selectedCameraId, stop, triggerSuccessFeedback]
    );

    const toggleTorch = useCallback(async () => {
      const instance = scannerRef.current;
      if (!instance || !torchSupported) return;
      try {
        const next = !torchOn;
        const caps = instance.getRunningTrackCameraCapabilities();
        await caps.torchFeature().apply(next);
        setTorchOn(next);
      } catch {}
    }, [torchOn, torchSupported]);

    const handleSwitchMode = async (nextMode: ScanMode) => {
      if (nextMode === scanMode) return;
      setScanMode(nextMode);
      if (typeof window !== "undefined") {
        localStorage.setItem(SCAN_MODE_STORAGE_KEY, nextMode);
      }
      if (status === "scanning" || status === "starting") {
        await start(undefined, nextMode);
      }
    };

    const handleSwitchCamera = async () => {
      if (cameras.length < 2) return;
      const idx = cameras.findIndex((c) => c.id === selectedCameraId);
      const next = cameras[(idx + 1) % cameras.length];
      if (next) {
        setSelectedCameraId(next.id);
        await start(next.id);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        start: (id?: string) => start(id),
        stop: () => {
          void stop();
        },
        toggleTorch,
      }),
      [start, stop, toggleTorch]
    );

    useEffect(() => {
      mountedRef.current = true;
      if (autoStart) {
        void start();
      }
      return () => {
        mountedRef.current = false;
        void stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = manualCode.trim();
      if (!trimmed) return;
      const parsed = parseScan(trimmed);
      const codeToUse = parsed.type === "product" ? parsed.code : trimmed;
      const sourceToUse = parsed.type === "product" ? parsed.source : "manual";
      triggerSuccessFeedback();
      onScan(codeToUse, sourceToUse);
      setManualCode("");
      if (!continuous) {
        void stop();
      }
    };

    return (
      <div className={`flex flex-col gap-3 w-full ${className}`}>
        {/* Toggle Mode: Barcode Batang Saja vs Semua Kode */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-zinc-700 p-0.5 bg-slate-50 dark:bg-zinc-800/60 text-xs w-full">
            <button
              type="button"
              onClick={() => handleSwitchMode("1D")}
              className={`flex-1 h-8 px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scanMode === "1D"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Barcode batang saja</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("ALL")}
              className={`flex-1 h-8 px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scanMode === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Semua kode</span>
            </button>
          </div>
        </div>

        {/* Viewport Kamera html5-qrcode */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <div
            id={containerId}
            className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Flash sukses */}
          {flashHit && (
            <div className="absolute inset-0 pointer-events-none border-4 border-emerald-400 bg-emerald-400/15 rounded-2xl transition-opacity" />
          )}

          {status === "starting" && (
            <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2 text-white">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs font-medium">Menyalakan kamera...</span>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 bg-zinc-950/90 p-5 flex flex-col items-center justify-center text-center gap-3 text-white">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-slate-200 max-w-xs leading-relaxed">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => start()}
                className="h-10 px-4 rounded-xl bg-white text-zinc-900 text-xs font-semibold cursor-pointer active:scale-95"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Kontrol Bawah */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="h-9 px-3 rounded-xl bg-black/65 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span className="hidden sm:inline">Ganti Kamera</span>
                </button>
              )}

              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`h-9 px-3 rounded-xl text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                    torchOn
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-black/65 hover:bg-black/80 text-white"
                  }`}
                >
                  <Flashlight className="w-4 h-4" />
                  <span>{torchOn ? "Senter Nyala" : "Senter"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="h-9 px-3 rounded-xl bg-black/65 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
                <span>Manual</span>
              </button>

              {status === "stopped" && (
                <button
                  type="button"
                  onClick={() => start()}
                  className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Mulai</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {(showManual || status === "error") && (
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik / tempel kode barcode secara manual..."
              className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900 dark:focus:border-white"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer active:scale-95"
            >
              Pakai Kode
            </button>
          </form>
        )}
      </div>
    );
  }
);
