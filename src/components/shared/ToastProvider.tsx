"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast("success", msg), [showToast]);
  const error = useCallback((msg: string) => showToast("error", msg), [showToast]);
  const info = useCallback((msg: string) => showToast("info", msg), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}

      {/* Global Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg backdrop-blur-sm ${
                isSuccess
                  ? "bg-white/95 dark:bg-zinc-900/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : isError
                  ? "bg-white/95 dark:bg-zinc-900/95 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                  : "bg-white/95 dark:bg-zinc-900/95 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isSuccess
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600"
                    : isError
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </span>

              <p className="text-xs font-semibold leading-relaxed flex-1 pt-0.5 break-words">
                {t.message}
              </p>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

export function PopupAlert({
  type,
  message,
  onClear,
}: {
  type: ToastType;
  message: string | null | undefined;
  onClear?: () => void;
}) {
  const { showToast } = useToast();

  useEffect(() => {
    if (message) {
      showToast(type, message);
      onClear?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return null;
}
