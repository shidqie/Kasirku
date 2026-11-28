"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
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
import { Dropdown } from "@/components/shared/Dropdown";
import { parseScan } from "@/lib/barcode";

export type ScanMode = "1D" | "ALL";

export type BarcodeFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39"
  | "code_93"
  | "codabar"
  | "itf"
  | "qr_code"
  | "data_matrix"
  | "pdf417"
  | "aztec"
  | "unknown";

export interface BarcodeScannerProps {
  /** Callback saat kode produk valid berhasil terbaca */
  onScan: (code: string, format: string) => void;
  /** Daftar format barcode yang dideteksi */
  formats?: BarcodeFormat[];
  /** @deprecated Gunakan toggle mode di UI */
  enableQr?: boolean;
  /** Jeda anti-duplikat untuk kode yang sama dalam milidetik (default: 1300ms) */
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

const FORMATS_1D: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
];

const FORMATS_ALL: BarcodeFormat[] = [
  ...FORMATS_1D,
  "qr_code",
  "data_matrix",
];

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
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const rafIdRef = useRef<number | null>(null);
    const busyRef = useRef<boolean>(false);
    const lastHitRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
    const mountedRef = useRef<boolean>(true);
    const isActiveRef = useRef<boolean>(false);

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
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const [torchOn, setTorchOn] = useState<boolean>(false);
    const [flashHit, setFlashHit] = useState<boolean>(false);
    const [manualCode, setManualCode] = useState<string>("");
    const [showManual, setShowManual] = useState<boolean>(false);
    const [engineLabel, setEngineLabel] = useState<string>("");

    const activeFormats = useMemo(
      () => (scanMode === "1D" ? FORMATS_1D : FORMATS_ALL),
      [scanMode]
    );

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

    const stop = useCallback(() => {
      isActiveRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      busyRef.current = false;
      setTorchOn(false);
      setTorchSupported(false);
      if (mountedRef.current) {
        setStatus((prev) => (prev === "error" ? "error" : "stopped"));
      }
    }, []);

    const initDetector = useCallback(async (formatsList: BarcodeFormat[]) => {
      const NativeDetector = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
      if (NativeDetector) {
        try {
          const supported: string[] = (await NativeDetector.getSupportedFormats?.()) ?? [];
          const nativeFormats =
            supported.length > 0
              ? formatsList.filter((f) => supported.includes(f))
              : formatsList;

          if (nativeFormats.length > 0) {
            detectorRef.current = new NativeDetector({ formats: nativeFormats });
            if (mountedRef.current) setEngineLabel("Native");
            return detectorRef.current;
          }
        } catch {
          // Lanjut ke ponyfill jika native gagal
        }
      }

      const { BarcodeDetector: PonyfillDetector } = await import("barcode-detector/ponyfill");
      detectorRef.current = new PonyfillDetector({ formats: formatsList });
      if (mountedRef.current) setEngineLabel("WASM");
      return detectorRef.current;
    }, []);

    const runDetectionLoop = useCallback(
      (mode: ScanMode) => {
        if (!isActiveRef.current) return;

        const tick = async () => {
          if (!isActiveRef.current) return;

          const video = videoRef.current;
          const detector = detectorRef.current;

          if (
            video &&
            detector &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            !busyRef.current
          ) {
            busyRef.current = true;
            try {
              const isAll = mode === "ALL";
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              const cropW = isAll ? Math.round(Math.min(vw, vh) * 0.85) : Math.round(vw * 0.92);
              const cropH = isAll ? Math.round(Math.min(vw, vh) * 0.85) : Math.round(vh * 0.45);
              const sx = Math.round((vw - cropW) / 2);
              const sy = Math.round((vh - cropH) / 2);

              let canvas = canvasRef.current;
              if (!canvas) {
                canvas = document.createElement("canvas");
                canvasRef.current = canvas;
              }
              const maxPx = isAll ? 1024 : 640;
              const scale = Math.min(1, maxPx / cropW);
              const targetW = Math.max(160, Math.round(cropW * scale));
              const targetH = Math.max(100, Math.round(cropH * scale));
              if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
              }

              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
                const results = await detector.detect(canvas);

                if (results && results.length > 0 && isActiveRef.current) {
                  for (const hit of results) {
                    const raw = String(hit.rawValue || "").trim();
                    if (!raw) continue;

                    const parsed = parseScan(raw);
                    if (parsed.type === "ignore") continue;

                    const now = Date.now();
                    const isSameWithinCooldown =
                      parsed.code === lastHitRef.current.code &&
                      now - lastHitRef.current.time < cooldownMs;

                    if (isSameWithinCooldown) continue;

                    lastHitRef.current = { code: parsed.code, time: now };
                    triggerSuccessFeedback();
                    onScan(parsed.code, parsed.source);

                    if (!continuous) {
                      stop();
                      busyRef.current = false;
                      return;
                    }
                    break;
                  }
                }
              }
            } catch {
              // Abaikan error per-frame
            } finally {
              busyRef.current = false;
            }
          }

          if (isActiveRef.current) {
            rafIdRef.current = requestAnimationFrame(tick);
          }
        };

        rafIdRef.current = requestAnimationFrame(tick);
      },
      [continuous, cooldownMs, onScan, stop, triggerSuccessFeedback]
    );

    const start = useCallback(
      async (overrideDeviceId?: string, overrideMode?: ScanMode) => {
        stop();
        setErrorMessage(null);
        setStatus("starting");

        if (typeof window !== "undefined" && !window.isSecureContext) {
          setStatus("error");
          setErrorMessage("Akses kamera membutuhkan koneksi aman (HTTPS) atau localhost.");
          return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("error");
          setErrorMessage(
            "Browser ini tidak mendukung akses kamera (getUserMedia). Gunakan Chrome, Safari, atau Firefox terbaru."
          );
          return;
        }

        const activeMode = overrideMode ?? scanMode;
        const formatsList = activeMode === "1D" ? FORMATS_1D : FORMATS_ALL;

        try {
          await initDetector(formatsList);

          const targetId = overrideDeviceId ?? selectedDeviceId;
          const videoConstraints: MediaTrackConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            ...(targetId
              ? { deviceId: { exact: targetId } }
              : { facingMode: { ideal: "environment" } }),
          };

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoConstraints,
          });

          if (!mountedRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play().catch(() => {});
          }

          const track = stream.getVideoTracks()[0];
          if (track) {
            const caps: any = track.getCapabilities ? track.getCapabilities() : {};
            setTorchSupported(Boolean(caps?.torch));
            setTorchOn(false);

            if (
              Array.isArray(caps?.focusMode) &&
              caps.focusMode.includes("continuous")
            ) {
              track
                .applyConstraints({
                  advanced: [{ focusMode: "continuous" } as any],
                })
                .catch(() => {});
            }

            const currentId = track.getSettings?.().deviceId;
            if (currentId) setSelectedDeviceId(currentId);
          }

          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
          if (mountedRef.current) {
            setDevices(videoDevices);
          }

          isActiveRef.current = true;
          setStatus("scanning");
          runDetectionLoop(activeMode);
        } catch (err: any) {
          stop();
          setStatus("error");
          const name = err?.name || "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            setErrorMessage(
              "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser Anda lalu coba lagi."
            );
          } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            setErrorMessage(
              "Kamera tidak ditemukan pada perangkat ini. Gunakan input manual di bawah."
            );
          } else if (name === "NotReadableError" || name === "TrackStartError") {
            setErrorMessage(
              "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain lalu muat ulang."
            );
          } else {
            setErrorMessage(
              err?.message || "Gagal mengakses kamera. Gunakan input manual sebagai cadangan."
            );
          }
        }
      },
      [initDetector, runDetectionLoop, scanMode, selectedDeviceId, stop]
    );

    const handleModeChange = (nextMode: ScanMode) => {
      if (nextMode === scanMode) return;
      setScanMode(nextMode);
      if (typeof window !== "undefined") {
        localStorage.setItem(SCAN_MODE_STORAGE_KEY, nextMode);
      }
      if (status === "scanning" || status === "starting") {
        start(undefined, nextMode);
      }
    };

    const toggleTorch = useCallback(async () => {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track || !torchSupported) return;
      const next = !torchOn;
      try {
        await track.applyConstraints({
          advanced: [{ torch: next } as any],
        });
        setTorchOn(next);
      } catch {}
    }, [torchOn, torchSupported]);

    const handleSwitchCamera = async () => {
      if (devices.length < 2) return;
      const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextDevice = devices[(idx + 1) % devices.length];
      if (nextDevice) {
        setSelectedDeviceId(nextDevice.deviceId);
        await start(nextDevice.deviceId);
      }
    };

    useImperativeHandle(ref, () => ({ start, stop, toggleTorch }), [
      start,
      stop,
      toggleTorch,
    ]);

    useEffect(() => {
      mountedRef.current = true;
      if (autoStart) {
        start();
      }

      const onVisibilityChange = () => {
        if (document.hidden) {
          stop();
        } else if (autoStart && mountedRef.current) {
          start();
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        mountedRef.current = false;
        document.removeEventListener("visibilitychange", onVisibilityChange);
        stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = manualCode.trim();
      if (!trimmed) return;
      const parsed = parseScan(trimmed);
      if (parsed.type === "ignore") {
        triggerSuccessFeedback();
        onScan(trimmed, "manual");
      } else {
        triggerSuccessFeedback();
        onScan(parsed.code, parsed.source);
      }
      setManualCode("");
      if (!continuous) {
        stop();
      }
    };

    return (
      <div className={`flex flex-col gap-3 w-full ${className}`}>
        {/* Toggle Mode Scan (Barcode batang saja vs Semua kode) */}
        <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange("1D")}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scanMode === "1D"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Barcode batang saja</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("ALL")}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scanMode === "ALL"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Semua kode</span>
          </button>
        </div>

        {/* Viewport Kamera */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Overlay area bidik tengah */}
          {status === "scanning" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`relative rounded-2xl transition-all duration-200 border-2 ${
                  scanMode === "1D" ? "w-[82%] h-[38%]" : "w-[66%] aspect-square"
                } ${
                  flashHit
                    ? "border-emerald-400 bg-emerald-400/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                    : "border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                }`}
              >
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                <div className="absolute inset-x-3 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.85)] scanner-laser" />
              </div>

              {engineLabel && (
                <span className="absolute top-2.5 left-3 px-2 py-0.5 rounded-full bg-black/50 text-[10px] font-semibold text-white/80 backdrop-blur-xs">
                  {engineLabel}
                </span>
              )}
            </div>
          )}

          {/* Status Loading */}
          {status === "starting" && (
            <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2 text-white">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs font-medium">Menyalakan kamera...</span>
            </div>
          )}

          {/* Status Error */}
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

          {/* Kontrol Cepat di Bawah Viewport */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {devices.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="h-10 px-3 rounded-xl bg-black/60 hover:bg-black/75 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
                  title="Ganti kamera"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span className="hidden sm:inline">Ganti Kamera</span>
                </button>
              )}

              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`h-10 px-3 rounded-xl text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                    torchOn
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-black/60 hover:bg-black/75 text-white"
                  }`}
                  title="Senter"
                >
                  <Flashlight className="w-4 h-4" />
                  <span>{torchOn ? "Senter Nyala" : "Senter"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {devices.length > 1 && (
                <div className="hidden sm:block w-40">
                  <Dropdown
                    variant="box"
                    searchable={false}
                    align="right"
                    ariaLabel="Pilih kamera"
                    value={selectedDeviceId}
                    onChange={(val) => {
                      setSelectedDeviceId(val);
                      start(val);
                    }}
                    options={devices.map((d, idx) => ({
                      value: d.deviceId,
                      label: d.label || `Kamera ${idx + 1}`,
                    }))}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="h-10 px-3 rounded-xl bg-black/60 hover:bg-black/75 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
                title="Ketik kode manual"
              >
                <Keyboard className="w-4 h-4" />
                <span>Manual</span>
              </button>

              {status === "stopped" && (
                <button
                  type="button"
                  onClick={() => start()}
                  className="h-10 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Mulai</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Manual Cadangan */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik angka barcode lalu tekan Enter..."
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              Gunakan
            </button>
          </form>
        )}
      </div>
    );
  }
);
