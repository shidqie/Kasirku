"use client";

import { useState, useEffect } from "react";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Baca pesan error dari query parameter (misal dari form redirect fallback)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const query = window.location.search;
        if (query) {
          const params = new URLSearchParams(query);
          const err = params.get("error");
          if (err) {
            setError(decodeURIComponent(err));
          }
        }
      } catch {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!username || !password) {
      e.preventDefault();
      setError("Silakan isi username dan password.");
      return;
    }

    setLoading(true);
    setError(null);

    const formElement = e.currentTarget;

    try {
      let data: any;
      let ok = false;

      if (typeof window !== "undefined" && typeof window.fetch === "function") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        ok = res.ok;
        data = await res.json();
      } else {
        // Fallback XMLHttpRequest jika window.fetch tidak tersedia
        const xhrRes = await new Promise<{ ok: boolean; data: any }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/auth/login", true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onload = function () {
            try {
              const parsed = JSON.parse(xhr.responseText);
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: parsed });
            } catch (err) {
              reject(err);
            }
          };
          xhr.onerror = function () {
            reject(new Error("Gagal menghubungi server"));
          };
          xhr.send(JSON.stringify({ username, password }));
        });
        ok = xhrRes.ok;
        data = xhrRes.data;
      }

      if (!ok) {
        e.preventDefault();
        setError(data?.error || "Gagal masuk ke sistem.");
        setLoading(false);
      } else {
        // Login Berhasil: Gunakan redirect browser langsung (100% stabil di Android 5.0.2)
        e.preventDefault();
        const user = data?.user;
        const targetUrl = user && user.role === "OWNER" ? "/owner/dashboard" : "/kasir";
        window.location.href = targetUrl;
      }
    } catch {
      // Jika AJAX / fetch gagal total, gunakan submit form HTML standar sebagai cadangan terkuat
      if (formElement && typeof formElement.submit === "function") {
        formElement.submit();
      } else {
        setError("Tidak dapat terhubung ke server. Periksa jaringan Anda.");
        setLoading(false);
      }
    }
  };

  return (
    <main
      className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 selection:bg-red-100"
      style={{
        backgroundColor: "#F1F5F9",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center p-1 bg-white shadow-md border border-slate-100"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#F1F5F9" }}
          >
            <img src="/logo.png" alt="Logo Toko" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ color: "#0F172A" }}>
            Kasirku POS Sembako
          </h1>
          <p className="text-sm text-slate-500" style={{ color: "#64748B" }}>
            Masuk dengan akun Pemilik atau Staff untuk memulai transaksi
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-in fade-in"
            style={{ backgroundColor: "#FFF1F2", borderColor: "#FECDD3", color: "#BE123C" }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form
          action="/api/auth/login"
          method="POST"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans" style={{ color: "#334155" }}>
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F] transition-all"
                style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans" style={{ color: "#334155" }}>
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F] transition-all"
                style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#F0090F] hover:bg-[#D6080E] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-base"
            style={{
              backgroundColor: "#F0090F",
              color: "#FFFFFF",
              border: "none",
            }}
          >
            {loading ? (
              <span>Memeriksa kredensial...</span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100" style={{ borderColor: "#F1F5F9" }}>
          <p className="text-xs text-slate-400" style={{ color: "#94A3B8" }}>
            Akses khusus internal toko. Tidak ada registrasi publik.
          </p>
        </div>
      </div>
    </main>
  );
}
