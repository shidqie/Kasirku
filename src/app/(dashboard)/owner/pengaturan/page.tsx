"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Settings,
  Lock,
  CheckCircle,
  AlertCircle,
  Save,
  UserCheck,
  UserPlus,
  KeyRound,
  XCircle,
  RefreshCw,
  Store,
  ShieldCheck,
  Palette,
  Check,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/formatters";
import {
  ACCENT_PRESETS,
  AccentColor,
  PresetAccentColor,
  applyAccentToDocument,
  buildCustomAccentDefinition,
  getAccentDefinition,
  getInitialAccent,
  getInitialCustomHex,
  normalizeHex,
  previewAccentOnDocument,
} from "@/lib/theme";

interface SettingsData {
  namaToko: string;
  alamat: string | null;
  telepon: string | null;
  footerStruk: string | null;
  pesanWhatsApp: string | null;
  pembulatan: "BULAT_0" | "BULAT_100" | "BULAT_500";
  batasDiskonStaff: number;
  ambangUtangLamaHari: number;
  bolehJualStokNol: boolean;
}

interface UserItem {
  id: string;
  username: string;
  nama: string;
  role: "OWNER" | "STAFF";
  aktif: boolean;
  createdAt: string;
}

function TabToko() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pengaturan");
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...settings,
        batasDiskonStaff: Math.max(0, Number(settings.batasDiskonStaff) || 0),
        ambangUtangLamaHari: Math.max(1, Number(settings.ambangUtangLamaHari) || 30),
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui pengaturan");

      if (data.settings) {
        setSettings(data.settings);
      }
      setSuccess("Pengaturan toko berhasil disimpan!");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Memuat pengaturan toko...</div>;
  }

  return (
    <div className="pt-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Informasi toko &amp; aturan kasir</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Pengaturan profil toko, pembulatan transaksi, dan kebijakan kasir.</p>
        </div>
        <Link
          href="/owner/go-live"
          className="text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 self-start sm:self-auto"
        >
          Buka checklist Go-Live
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {settings && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">
                Nama toko <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={settings.namaToko}
                onChange={(e) => setSettings({ ...settings, namaToko: e.target.value })}
                className="ctl"
              />
            </div>

            <div>
              <label className="field-label">
                Nomor telepon / WhatsApp toko
              </label>
              <input
                type="text"
                value={settings.telepon || ""}
                onChange={(e) => setSettings({ ...settings, telepon: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="ctl"
              />
            </div>
          </div>

          <div>
            <label className="field-label">
              Alamat toko
            </label>
            <textarea
              rows={2}
              value={settings.alamat || ""}
              onChange={(e) => setSettings({ ...settings, alamat: e.target.value })}
              placeholder="Alamat lengkap toko"
              className="ctl-ta"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">
                Footer struk belanja
              </label>
              <input
                type="text"
                value={settings.footerStruk || ""}
                onChange={(e) => setSettings({ ...settings, footerStruk: e.target.value })}
                placeholder="Contoh: Terima kasih atas kunjungan Anda"
                className="ctl"
              />
            </div>

            <div>
              <label className="field-label">
                Aturan pembulatan kasir
              </label>
              <select
                value={settings.pembulatan}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    pembulatan: e.target.value as "BULAT_0" | "BULAT_100" | "BULAT_500",
                  })
                }
                className="ctl"
              >
                <option value="BULAT_0">Tanpa Pembulatan (Rp 0)</option>
                <option value="BULAT_100">Bulatkan ke Ratusan Terdekat (Rp 100)</option>
                <option value="BULAT_500">Bulatkan ke Lima Ratus Terdekat (Rp 500)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">
                Batas diskon staff tanpa PIN Owner
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={settings.batasDiskonStaff ? settings.batasDiskonStaff.toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setSettings({ ...settings, batasDiskonStaff: digits ? parseInt(digits, 10) : 0 });
                  }}
                  placeholder="0"
                  className="ctl pl-10 font-semibold text-right"
                />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Diskon melebihi nominal ini ({formatRupiah(settings.batasDiskonStaff)}) memerlukan PIN Owner.
              </span>
            </div>

            <div>
              <label className="field-label">
                Ambang utang kasbon lama (hari)
              </label>
              <input
                type="number"
                min={1}
                value={settings.ambangUtangLamaHari}
                onChange={(e) =>
                  setSettings({ ...settings, ambangUtangLamaHari: parseInt(e.target.value || "30", 10) })
                }
                className="ctl"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Kasbon yang belum lunas lebih dari {settings.ambangUtangLamaHari} hari akan ditandai di laporan.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.bolehJualStokNol}
                onChange={(e) => setSettings({ ...settings, bolehJualStokNol: e.target.checked })}
                className="w-5 h-5 text-[#F0090F] rounded-md border-slate-300 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">
                  Izinkan Penjualan Saat Stok 0 (Stok Negatif)
                </span>
                <span className="text-xs text-slate-500">
                  Default tidak boleh. Jika diaktifkan, kasir tetap dapat checkout barang meskipun stok sistem sudah habis.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? "Menyimpan..." : "Simpan pengaturan"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EditProfileCard() {
  const [profile, setProfile] = useState<{ id: string; nama: string; username: string; role: string } | null>(null);
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setNama(data.user.nama || "");
          setUsername(data.user.username || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword.length < 6) {
      setError("Password baru minimal 6 karakter");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }

    if (newPassword && !oldPassword) {
      setError("Masukkan password saat ini untuk konfirmasi perubahan password");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          username,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil");
      setSuccess("Profil akun berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (data.user) {
        setProfile(data.user);
        setNama(data.user.nama);
        setUsername(data.user.username);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-400">
        Memuat profil akun...
      </div>
    );
  }

  return (
    <div className="pt-2 pb-6 border-b border-slate-200 dark:border-zinc-800 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
            Profil akun saya
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Kelola nama profil, username login, dan ubah kata sandi akun yang sedang aktif.
          </p>
        </div>
        {profile && (
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {profile.role}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">
              Nama lengkap <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap"
              className="ctl"
            />
          </div>
          <div>
            <label className="field-label">
              Username <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username login"
              className="ctl"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-zinc-800">
          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">Ubah kata sandi (opsional)</p>
          <p className="text-xs text-slate-400 mb-3">
            Kosongkan kolom password jika tidak ingin mengganti kata sandi.
          </p>

          <div className="space-y-3">
            <div>
              <label className="field-label">Password saat ini</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Wajib diisi jika mengganti password"
                className="ctl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Password baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="ctl"
                />
              </div>
              <div>
                <label className="field-label">Konfirmasi password baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="ctl"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Menyimpan..." : "Simpan profil akun"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function TabPin() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinError("PIN baru harus berupa 6 digit angka");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("Konfirmasi PIN baru tidak cocok");
      return;
    }

    setSavingPin(true);

    try {
      const res = await fetch("/api/settings/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPin, newPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah PIN");

      setPinSuccess("PIN Owner berhasil diubah!");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="pt-2 pb-6 border-b border-slate-200 dark:border-zinc-800 space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
          Ubah PIN Pemilik (Owner PIN)
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          PIN 6-digit digunakan untuk otorisasi aksi sensitif staff (Void transaksi, penyesuaian stok, diskon khusus).
        </p>
      </div>

      {pinError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{pinError}</span>
        </div>
      )}
      {pinSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{pinSuccess}</span>
        </div>
      )}

      <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
        <div>
          <label className="field-label">
            PIN lama (6 digit) <span className="text-rose-600">*</span>
          </label>
          <input
            type="password"
            required
            maxLength={6}
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value)}
            placeholder="Masukkan PIN lama"
            className="ctl tracking-widest"
          />
        </div>

        <div>
          <label className="field-label">
            PIN baru (6 digit angka) <span className="text-rose-600">*</span>
          </label>
          <input
            type="password"
            required
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="Masukkan 6 angka baru"
            className="ctl tracking-widest"
          />
        </div>

        <div>
          <label className="field-label">
            Konfirmasi PIN baru <span className="text-rose-600">*</span>
          </label>
          <input
            type="password"
            required
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Ulangi 6 angka baru"
            className="ctl tracking-widest"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingPin}
            className="h-10 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{savingPin ? "Mengubah PIN..." : "Perbarui PIN Owner"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function TabPengguna() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"STAFF" | "OWNER">("STAFF");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pengguna");
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          nama: newNama,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah pengguna");

      setSuccess(`Pengguna ${newUsername} berhasil ditambahkan!`);
      setIsAddOpen(false);
      setNewUsername("");
      setNewNama("");
      setNewPassword("");
      setNewRole("STAFF");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleToggleAktif = async (user: UserItem) => {
    const actionName = user.aktif ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Apakah Anda yakin ingin ${actionName} akun "${user.username}"?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !user.aktif }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status pengguna");

      setSuccess(`Status akun ${user.username} berhasil diubah.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;

    setSubmittingReset(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${selectedUserForReset.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset password");

      setSuccess(`Password untuk ${selectedUserForReset.username} berhasil diperbarui.`);
      setSelectedUserForReset(null);
      setResetPasswordValue("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kelola Pengguna & Akun Staff */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            Kelola pengguna &amp; akun staff
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Tambah staf kasir, ubah status aktif, dan atur ulang kata sandi.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto text-xs cursor-pointer"
        >
          <span>Tambah pengguna</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="pt-2">
        <div className="pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Daftar akun pengguna ({users.length})</h4>
          <button
            onClick={fetchUsers}
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4">Nama lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tanggal dibuat</th>
                <th className="py-3 pl-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-zinc-100">{user.nama}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">@{user.username}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          user.role === "OWNER"
                            ? "text-blue-600"
                            : "text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {user.role === "OWNER" ? "Pemilik" : "Staff"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          user.aktif
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {user.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-zinc-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(user);
                            setResetPasswordValue("");
                          }}
                          className="h-7 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          title="Ganti password pengguna"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset password</span>
                        </button>
                        <button
                          onClick={() => handleToggleAktif(user)}
                          className={`h-7 px-2.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            user.aktif
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {user.aktif ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Nonaktifkan</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 mb-1">Tambah Pengguna Baru</h3>
            <p className="text-xs text-slate-500 mb-5">
              Akun baru dibuat langsung oleh Pemilik tanpa registrasi publik.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: budi"
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Password Awal (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password aman"
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Peran / Hak Akses
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "STAFF" | "OWNER")}
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                >
                  <option value="STAFF">Staff Toko (Kasir, Stok, Member)</option>
                  <option value="OWNER">Pemilik Toko (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="w-1/2 h-11 bg-[#F0090F] hover:bg-[#D6080E] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingAdd ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Atur ulang password untuk akun <strong>@{selectedUserForReset.username}</strong> ({selectedUserForReset.nama}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="w-1/2 h-11 bg-[#F0090F] hover:bg-[#D6080E] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingReset ? "Menyimpan..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabTema() {
  const [currentAccent, setCurrentAccent] = useState<AccentColor>("red");
  const [customHex, setCustomHex] = useState<string>("#0EA5E9");
  const [hexInput, setHexInput] = useState<string>("#0EA5E9");
  const [pendingTheme, setPendingTheme] = useState<{
    accent: AccentColor;
    customHex: string;
    prevAccent: AccentColor;
    prevCustomHex: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const initAccent = getInitialAccent();
    const initHex = getInitialCustomHex();
    setCurrentAccent(initAccent);
    setCustomHex(initHex);
    setHexInput(initHex);
  }, []);

  // Cleanup: if user navigates away while confirmation is pending, revert to persisted accent
  useEffect(() => {
    return () => {
      previewAccentOnDocument(getInitialAccent(), getInitialCustomHex());
    };
  }, []);

  // 10-second countdown timer for theme confirmation
  useEffect(() => {
    if (!pendingTheme) return;

    if (countdown <= 0) {
      // Auto-revert to previous theme
      previewAccentOnDocument(pendingTheme.prevAccent, pendingTheme.prevCustomHex);
      setCurrentAccent(pendingTheme.prevAccent);
      setCustomHex(pendingTheme.prevCustomHex);
      setHexInput(pendingTheme.prevCustomHex);
      setPendingTheme(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pendingTheme, countdown]);

  const requestThemeChange = (nextAccent: AccentColor, nextCustomHex: string) => {
    const normalized = normalizeHex(nextCustomHex);
    // Skip if already active with the exact same color
    if (
      nextAccent === currentAccent &&
      (nextAccent !== "custom" || normalized === customHex)
    ) {
      return;
    }

    const prevAccent = pendingTheme ? pendingTheme.prevAccent : currentAccent;
    const prevCustomHex = pendingTheme ? pendingTheme.prevCustomHex : customHex;

    previewAccentOnDocument(nextAccent, normalized);
    setPendingTheme({
      accent: nextAccent,
      customHex: normalized,
      prevAccent,
      prevCustomHex,
    });
    setCountdown(10);
    setSuccess(null);
  };

  const handleConfirmTheme = () => {
    if (!pendingTheme) return;
    applyAccentToDocument(pendingTheme.accent, pendingTheme.customHex);
    setCurrentAccent(pendingTheme.accent);
    setCustomHex(pendingTheme.customHex);
    setHexInput(pendingTheme.customHex);
    const label = getAccentDefinition(pendingTheme.accent, pendingTheme.customHex).label;
    setPendingTheme(null);
    setSuccess(`Warna aksen berhasil diubah ke ${label}!`);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleRevertTheme = () => {
    if (!pendingTheme) return;
    previewAccentOnDocument(pendingTheme.prevAccent, pendingTheme.prevCustomHex);
    setCurrentAccent(pendingTheme.prevAccent);
    setCustomHex(pendingTheme.prevCustomHex);
    setHexInput(pendingTheme.prevCustomHex);
    setPendingTheme(null);
  };

  const activeAccent = pendingTheme ? pendingTheme.accent : currentAccent;
  const activeHex = pendingTheme ? pendingTheme.customHex : customHex;
  const activeDef = getAccentDefinition(activeAccent, activeHex);
  const customPreviewDef = buildCustomAccentDefinition(hexInput);

  return (
    <div className="pt-2 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Warna aksen aplikasi</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Pilih warna aksen utama sistem atau tentukan warna kustom Anda sendiri.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Berlaku di semua halaman
        </span>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Preset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(ACCENT_PRESETS) as PresetAccentColor[]).map((key) => {
          const preset = ACCENT_PRESETS[key];
          const isSelected = activeAccent === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => requestThemeChange(key, customHex)}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-3 relative hover:scale-[1.02] ${
                isSelected
                  ? "border-slate-900 bg-slate-50/80 shadow-md ring-2 ring-slate-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-full shadow-inner flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: preset.primary }}
                  >
                    {isSelected && <CheckCircle className="w-4 h-4" />}
                  </span>
                  <span className="font-bold text-sm text-slate-800">{preset.label}</span>
                </div>
              </div>

              {/* Mini Preview Palette */}
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className="w-5 h-5 rounded-md shadow-xs"
                  style={{ backgroundColor: preset.primary }}
                  title="Warna Utama"
                />
                <span
                  className="w-5 h-5 rounded-md shadow-xs"
                  style={{ backgroundColor: preset.primaryHover }}
                  title="Hover"
                />
                <span
                  className="w-5 h-5 rounded-md shadow-xs"
                  style={{ backgroundColor: preset.primaryLight }}
                  title="Background Lembut"
                />
                <span
                  className="w-5 h-5 rounded-md border"
                  style={{ borderColor: preset.primaryBorder, backgroundColor: "#FFF" }}
                  title="Border"
                />
              </div>

              {isSelected && (
                <div className="text-[11px] font-bold text-slate-900 tracking-wide uppercase mt-1 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{pendingTheme ? "Pratinjau" : "Sedang Aktif"}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Color Picker Card */}
      <div
        className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
          activeAccent === "custom"
            ? "border-slate-900 bg-slate-50/80 shadow-md ring-2 ring-slate-900/10"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: customPreviewDef.primary }}
            >
              {activeAccent === "custom" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Palette className="w-4 h-4" />
              )}
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Warna Kustom Sendiri</h4>
              <p className="text-xs text-slate-500">
                Pilih warna bebas menggunakan pemilih warna atau masukkan kode HEX.
              </p>
            </div>
          </div>

          {activeAccent === "custom" && (
            <span className="text-[11px] font-bold text-slate-900 tracking-wide uppercase inline-flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>{pendingTheme ? "Pratinjau" : "Sedang Aktif"}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] border border-slate-200 bg-white cursor-pointer hover:border-slate-300 transition-colors">
            <input
              type="color"
              value={customPreviewDef.primary}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              className="w-7 h-7 rounded-lg border-0 p-0 bg-transparent cursor-pointer"
              aria-label="Pilih warna kustom"
            />
            <span className="text-xs font-semibold text-slate-700">Pilih Warna</span>
          </label>

          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            placeholder="#0EA5E9"
            maxLength={7}
            className="w-32 h-11 px-3.5 rounded-[14px] border border-slate-200 bg-white text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": customPreviewDef.primary } as any}
          />

          <div className="flex items-center gap-1.5 px-2">
            <span
              className="w-5 h-5 rounded-md shadow-xs"
              style={{ backgroundColor: customPreviewDef.primary }}
              title="Warna Utama"
            />
            <span
              className="w-5 h-5 rounded-md shadow-xs"
              style={{ backgroundColor: customPreviewDef.primaryHover }}
              title="Hover"
            />
            <span
              className="w-5 h-5 rounded-md shadow-xs"
              style={{ backgroundColor: customPreviewDef.primaryLight }}
              title="Background Lembut"
            />
            <span
              className="w-5 h-5 rounded-md border"
              style={{ borderColor: customPreviewDef.primaryBorder, backgroundColor: "#FFF" }}
              title="Border"
            />
          </div>

          <button
            type="button"
            onClick={() => requestThemeChange("custom", hexInput)}
            className="h-11 px-5 rounded-[14px] font-bold text-xs text-white shadow-sm hover:opacity-90 active:scale-95 transition-all ml-auto"
            style={{ backgroundColor: customPreviewDef.primary }}
          >
            Terapkan Warna Kustom
          </button>
        </div>
      </div>

      {/* Interactive Preview Box */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
          Pratinjau Komponen dengan Aksen Terpilih:
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-10 px-5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center gap-2"
            style={{ backgroundColor: activeDef.primary }}
          >
            <span>Tombol Utama</span>
          </button>
          <div
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border"
            style={{
              backgroundColor: activeDef.primaryLight,
              color: activeDef.primary,
              borderColor: activeDef.primaryBorder,
            }}
          >
            Badge Status Aksen
          </div>
          <div
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border"
            style={{ borderColor: activeDef.primary }}
          >
            Input Berfokus Aksen
          </div>
        </div>
      </div>

      {/* 10-Second Confirmation Modal */}
      {pendingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: activeDef.primary }}
              >
                <Palette className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Ganti Warna Aksen?
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Anda sedang mencoba warna <strong className="text-slate-800">{activeDef.label}</strong>.
                  Jika tidak dikonfirmasi, tema akan otomatis kembali ke warna awal dalam{" "}
                  <strong className="text-slate-900 tabular-nums">{countdown} detik</strong>.
                </p>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full transition-all duration-1000 ease-linear rounded-full"
                style={{
                  width: `${(countdown / 10) * 100}%`,
                  backgroundColor: activeDef.primary,
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRevertTheme}
                className="h-11 px-4 rounded-[14px] border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal (Kembalikan)
              </button>
              <button
                type="button"
                onClick={handleConfirmTheme}
                className="h-11 px-5 rounded-[14px] text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
                style={{ backgroundColor: activeDef.primary }}
              >
                Ya, Simpan Tema ({countdown}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PengaturanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "toko";

  return (
    <div className="space-y-4 w-full pb-12 select-none">
      {/* Header Flat */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          Pengaturan Sistem &amp; Pengguna
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Pusat kendali operasional toko, manajemen staf kasir, dan keamanan otorisasi Owner.
        </p>
      </div>

      {/* Tabs Garis Bawah */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => router.push("/owner/pengaturan")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "toko" || (!["profil", "pin", "pengguna", "tema"].includes(activeTab))
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Toko
        </button>
        <button
          onClick={() => router.push("/owner/pengaturan?tab=profil")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "profil"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Profil akun
        </button>
        <button
          onClick={() => router.push("/owner/pengaturan?tab=pin")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "pin"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          PIN Owner
        </button>
        <button
          onClick={() => router.push("/owner/pengaturan?tab=pengguna")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "pengguna"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Pengguna
        </button>
        <button
          onClick={() => router.push("/owner/pengaturan?tab=tema")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "tema"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Warna aksen
        </button>
      </div>

      {activeTab === "profil" && <EditProfileCard />}
      {activeTab === "pin" && <TabPin />}
      {activeTab === "pengguna" && <TabPengguna />}
      {activeTab === "tema" && <TabTema />}
      {(activeTab === "toko" || (!["profil", "pin", "pengguna", "tema"].includes(activeTab))) && <TabToko />}
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat pengaturan...</div>}>
      <PengaturanContent />
    </Suspense>
  );
}
