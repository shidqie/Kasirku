"use client";

import { useState, useEffect } from "react";
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { getDefaultLandingRoute } from "@/lib/auth/permissions";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mode Reset Password dengan PIN Owner
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
    e.preventDefault();
    if (!username || !password) {
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
        setError(data?.error || "Gagal masuk ke sistem.");
        setLoading(false);
      } else {
        // Login Berhasil: Redirect sesuai role
        const user = data?.user;
        const targetUrl = getDefaultLandingRoute(user?.role || "STAFF_KASIR");
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

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedUser = resetUsername.trim();
    if (!trimmedUser) {
      setError("Username wajib diisi.");
      return;
    }
    if (!/^\d{6}$/.test(ownerPin)) {
      setError("PIN Owner harus berupa 6 digit angka.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUser,
          pin: ownerPin,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Gagal mereset password.");
      } else {
        setSuccessMsg(data?.message || "Password berhasil direset. Silakan masuk.");
        setUsername(trimmedUser);
        setPassword("");
        setOwnerPin("");
        setNewPassword("");
        setConfirmPassword("");
        setIsResetMode(false);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa jaringan Anda.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 selection:bg-red-500/30 selection:text-white"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Panel Kiri: Latar Gelap + Ilustrasi */}
      <section
        className="hidden lg:flex items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: "#111827" }}
      >
        <div className="w-full max-w-md flex items-center justify-center">
          <svg
            viewBox="0 0 360 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto max-w-[340px]"
            aria-hidden="true"
          >
            {/* Bayangan lantai */}
            <ellipse cx="176" cy="238" rx="120" ry="10" fill="#0B1120" opacity="0.65" />

            {/* Panel pink di belakang monitor */}
            <rect x="108" y="48" width="166" height="106" rx="10" fill="#FDD5D5" />

            {/* Kartu putih di dalam panel */}
            <rect x="162" y="66" width="60" height="70" rx="8" fill="#FFFFFF" />
            <rect x="174" y="80" width="36" height="6" rx="3" fill="#E2E8F0" />
            <rect x="174" y="92" width="36" height="6" rx="3" fill="#E2E8F0" />
            <rect x="174" y="109" width="36" height="9" rx="4.5" fill="#DC0A12" />

            {/* Lemari putih kanan bawah */}
            <rect x="190" y="156" width="84" height="72" rx="4" fill="#F1F5F9" />
            <line x1="232" y1="156" x2="232" y2="228" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Buku / folder vertikal di rak */}
            <rect x="198" y="164" width="6" height="24" rx="1.5" fill="#DC0A12" />
            <rect x="206" y="164" width="6" height="24" rx="1.5" fill="#F87171" />
            <rect x="214" y="164" width="6" height="24" rx="1.5" fill="#FCA5A5" />
            <rect x="222" y="164" width="6" height="24" rx="1.5" fill="#DC0A12" />

            <rect x="198" y="196" width="6" height="24" rx="1.5" fill="#EF4444" />
            <rect x="206" y="196" width="6" height="24" rx="1.5" fill="#FCA5A5" />
            <rect x="214" y="196" width="6" height="24" rx="1.5" fill="#E2E8F0" />

            {/* Tanaman kaktus merah dalam pot */}
            <rect x="249" y="190" width="6" height="24" rx="3" fill="#DC0A12" />
            <rect x="242" y="196" width="5" height="14" rx="2.5" fill="#EF4444" />
            <rect x="257" y="198" width="5" height="12" rx="2.5" fill="#EF4444" />
            <path d="M242 212H262L259 228H245L242 212Z" fill="#1E293B" />

            {/* Kaki meja */}
            <rect x="172" y="154" width="5" height="76" fill="#475569" />

            {/* Monitor */}
            <rect x="122" y="114" width="42" height="28" rx="3" fill="#94A3B8" />
            <rect x="139" y="142" width="8" height="6" fill="#64748B" />
            <rect x="133" y="147" width="20" height="3" rx="1.5" fill="#CBD5E1" />

            {/* Meja merah */}
            <rect x="82" y="148" width="128" height="7" rx="3.5" fill="#DC0A12" />

            {/* Kursi bar merah */}
            <rect x="64" y="176" width="28" height="7" rx="3.5" fill="#DC0A12" />
            <rect x="76" y="183" width="4" height="50" fill="#334155" />
            <rect x="66" y="213" width="24" height="3.5" rx="1.75" fill="#334155" />
            <rect x="64" y="230" width="28" height="4" rx="2" fill="#334155" />

            {/* Karakter orang duduk */}
            {/* Kaki biru muda */}
            <path
              d="M78 171L108 177L120 229"
              stroke="#7DB4F5"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Badan */}
            <path
              d="M66 130C66 122 72 117 79 117C86 117 91 123 91 131V170H68L66 130Z"
              fill="#334155"
            />
            {/* Lengan */}
            <path
              d="M84 128L98 148L116 148"
              stroke="#475569"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Kepala */}
            <circle cx="80" cy="102" r="11" fill="#8D5524" />
            {/* Rambut / topi */}
            <path d="M69 101C69 94 74 89 81 89C87 89 91 93 91 98H69V101Z" fill="#1E293B" />
          </svg>
        </div>
      </section>

      {/* Panel Kanan: Latar Merah + Kartu Login Gelap */}
      <section
        className="relative flex items-center justify-center p-6 sm:p-10 overflow-hidden min-h-screen"
        style={{ backgroundColor: "#DC0A12" }}
      >
        {/* Dekorasi lingkaran konsentris di pojok kanan bawah */}
        <div
          className="pointer-events-none absolute -bottom-28 -right-28 w-72 h-72 rounded-full border border-white/25"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-44 -right-44 w-[420px] h-[420px] rounded-full border border-white/20"
          aria-hidden="true"
        />

        {/* Kartu Login Gelap */}
        <div
          className="relative z-10 w-full max-w-[380px] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6"
          style={{
            backgroundColor: "#111827",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* Header */}
          <div className="space-y-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "#DC0A12" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5a7 7 0 1 0 5.3 11.5" />
                <circle cx="14.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isResetMode ? "Reset Password" : "Kasirku POS Sembako"}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isResetMode
                  ? "Masukkan username & PIN Owner (6 digit)"
                  : "Silakan masuk"}
              </p>
            </div>
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              className="flex items-center gap-2.5 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-xs animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!isResetMode ? (
            /* Form Login */
            <form
              action="/api/auth/login"
              method="POST"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 h-11 rounded-xl text-white text-sm placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 h-11 rounded-xl text-white text-sm placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "#DC0A12",
                    border: "none",
                  }}
                >
                  {loading ? (
                    <span>Memeriksa kredensial...</span>
                  ) : (
                    <>
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setResetUsername(username);
                    setIsResetMode(true);
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors py-1"
                >
                  Lupa password? Reset dengan PIN Owner
                </button>
              </div>
            </form>
          ) : (
            /* Form Reset Password dengan PIN Owner */
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-username"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  Username Akun
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-username"
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 h-10 rounded-xl text-white text-sm placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={resetLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="owner-pin"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  PIN Owner (6 Digit)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="owner-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full pl-10 pr-4 h-10 rounded-xl text-white text-sm tracking-[0.25em] placeholder:tracking-normal placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={resetLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  Password Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 h-10 rounded-xl text-white text-sm placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-[11px] font-bold text-white uppercase tracking-wider"
                >
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="confirm-password"
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full pl-10 pr-4 h-10 rounded-xl text-white text-sm placeholder:text-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#DC0A12] transition-all"
                    style={{ backgroundColor: "#161F30" }}
                    disabled={resetLoading}
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "#DC0A12",
                    border: "none",
                  }}
                >
                  {resetLoading ? (
                    <span>Memproses reset...</span>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsResetMode(false);
                  }}
                  className="w-full h-9 rounded-xl border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Masuk</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
