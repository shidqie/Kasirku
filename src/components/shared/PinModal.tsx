"use client";

import { useState } from "react";
import { Lock, Delete, X, AlertCircle } from "lucide-react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Verifikasi PIN Pemilik",
  description = "Aksi sensitif ini memerlukan otorisasi PIN Pemilik Toko.",
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setError(null);
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length !== 6) {
      setError("PIN harus 6 digit angka");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "PIN tidak valid");
        setPin("");
      } else {
        onSuccess();
        onClose();
        handleClear();
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button
            onClick={() => {
              handleClear();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">
          {description}
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 my-4">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? "bg-primary border-primary scale-110"
                  : "border-slate-300 bg-white"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Virtual Keypad for touchscreens */}
        <div className="grid grid-cols-3 gap-2.5 my-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-primary active:scale-95 text-slate-800 font-bold text-xl rounded-xl transition-all shadow-2xs border border-slate-200/80"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-semibold text-sm rounded-xl transition-all"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-primary active:scale-95 text-slate-800 font-bold text-xl rounded-xl transition-all shadow-2xs border border-slate-200/80"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-lg rounded-xl transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          disabled={pin.length !== 6 || loading}
          onClick={() => handleSubmit()}
          className="w-full mt-4 h-12 bg-primary hover:bg-primary-hover active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          {loading ? "Memverifikasi..." : "Konfirmasi PIN"}
        </button>
      </div>
    </div>
  );
}

