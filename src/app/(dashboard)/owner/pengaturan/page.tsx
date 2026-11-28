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
  QrCode,
  Upload,
  Trash2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { NumberInput } from "@/components/shared/NumberInput";
import { Dropdown } from "@/components/shared/Dropdown";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { formatRupiah, formatDate } from "@/lib/formatters";
import { FormSkeleton, TableSkeletonRows } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";
import { isValidQrisPayload, extractQrisMerchantName } from "@/lib/qris";
import { DELEGATABLE_PERMISSIONS, getRoleLabel } from "@/lib/auth/permissions";
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
  qrisModeDefault?: "DINAMIS" | "STATIS";
  qrisPayload?: string | null;
  qrisStaticImage?: string | null;
  logoToko?: string | null;
}

interface UserItem {
  id: string;
  username: string;
  nama: string;
  role: string;
  permissions?: string[];
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
        window.dispatchEvent(new CustomEvent("kasirku-store-updated", { detail: data.settings }));
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
    return <FormSkeleton fields={6} />;
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

      <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />

      {settings && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Logo Toko */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0 p-1">
                <img
                  src={settings.logoToko || "/logo.png"}
                  alt="Logo Toko"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Logo Toko</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Tampil di sidebar, navbar, struk belanja, dan dokumen PDF.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="h-10 px-4 rounded-[14px] border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Ubah Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const img = new Image();
                          img.onload = () => {
                            const maxDim = 400;
                            let { width, height } = img;
                            if (width > maxDim || height > maxDim) {
                              if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                              } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                              }
                            }
                            const canvas = document.createElement("canvas");
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return reject(new Error("Canvas tidak tersedia"));
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL("image/png"));
                          };
                          img.onerror = () => reject(new Error("Gagal membaca logo"));
                          img.src = reader.result as string;
                        };
                        reader.onerror = () => reject(new Error("Gagal membaca file"));
                        reader.readAsDataURL(file);
                      });
                      setSettings({ ...settings, logoToko: dataUrl });
                      setSuccess("Logo dipilih. Klik 'Simpan pengaturan' untuk menerapkan.");
                    } catch (err: any) {
                      setError(err.message || "Gagal memproses logo");
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              {settings.logoToko && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoToko: null })}
                  className="h-10 px-3 rounded-[14px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kembalikan ke logo default"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Default</span>
                </button>
              )}
            </div>
          </div>

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
              <Dropdown
                variant="box"
                searchable={false}
                ariaLabel="Aturan pembulatan kasir"
                value={settings.pembulatan}
                onChange={(val) =>
                  setSettings({
                    ...settings,
                    pembulatan: val as "BULAT_0" | "BULAT_100" | "BULAT_500",
                  })
                }
                options={[
                  { value: "BULAT_0", label: "Tanpa Pembulatan (Rp 0)" },
                  { value: "BULAT_100", label: "Bulatkan ke Ratusan Terdekat (Rp 100)" },
                  { value: "BULAT_500", label: "Bulatkan ke Lima Ratus Terdekat (Rp 500)" },
                ]}
              />
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
              <NumberInput
                integer
                min={1}
                emptyFallback={30}
                value={settings.ambangUtangLamaHari}
                onChange={(val) =>
                  setSettings({ ...settings, ambangUtangLamaHari: val })
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
  const [previewMode, setPreviewMode] = useState<"struk" | "bon">("struk");

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
    return <FormSkeleton fields={4} />;
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

      <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />

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
  const [newRole, setNewRole] = useState<string>("STAFF_KASIR");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  const [delegatingUser, setDelegatingUser] = useState<(UserItem & { permissions?: string[] }) | null>(null);
  const [delegatedPerms, setDelegatedPerms] = useState<string[]>([]);
  const [savingDelegation, setSavingDelegation] = useState(false);
  const [delegationError, setDelegationError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<string>("STAFF_KASIR");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const handleOpenEditUser = (u: UserItem) => {
    setEditingUser(u);
    setEditNama(u.nama);
    setEditUsername(u.username);
    setEditRole(u.role === "STAFF" ? "STAFF_KASIR" : u.role);
    setError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editNama.trim(),
          username: editUsername.trim(),
          role: editRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui pengguna");

      setSuccess(`Data pengguna ${editNama.trim()} berhasil diperbarui.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setSubmittingDelete(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pengguna");

      setSuccess(data.message || `Pengguna ${deletingUser.username} berhasil dihapus.`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setDeletingUser(null);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleSaveDelegation = async () => {
    if (!delegatingUser) return;
    try {
      setSavingDelegation(true);
      setError(null);
      setDelegationError(null);
      const res = await fetch(`/api/users/${delegatingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: delegatedPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan delegasi izin");
      setSuccess(`Delegasi izin untuk ${delegatingUser.nama} berhasil diperbarui.`);
      setDelegatingUser(null);
      fetchUsers();
    } catch (err: any) {
      setDelegationError(err.message);
      setError(err.message);
    } finally {
      setSavingDelegation(false);
    }
  };

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
      setNewRole("STAFF_KASIR");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const [toggleTarget, setToggleTarget] = useState<UserItem | null>(null);
  const [togglingUser, setTogglingUser] = useState(false);

  const handleToggleAktif = (user: UserItem) => {
    setToggleTarget(user);
  };

  const confirmToggleAktif = async () => {
    if (!toggleTarget) return;
    setTogglingUser(true);
    try {
      const res = await fetch(`/api/users/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !toggleTarget.aktif }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status pengguna");

      setSuccess(`Status akun ${toggleTarget.username} berhasil diubah.`);
      setToggleTarget(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setToggleTarget(null);
    } finally {
      setTogglingUser(false);
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

      <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />

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
                <TableSkeletonRows rows={5} cols={6} />
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
                            : user.role === "KEPALA_TOKO"
                            ? "text-purple-600"
                            : "text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                      {Array.isArray((user as any).permissions) && (user as any).permissions.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-300">
                          +{(user as any).permissions.length} izin
                        </span>
                      )}
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
                          onClick={() => handleOpenEditUser(user)}
                          className="h-7 px-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Edit nama, username, atau peran"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {user.role !== "OWNER" && (
                          <button
                            onClick={() => {
                              setDelegatingUser(user as any);
                              setDelegatedPerms(Array.isArray((user as any).permissions) ? (user as any).permissions : []);
                              setDelegationError(null);
                            }}
                            className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Atur delegasi izin"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Delegasi Izin</span>
                          </button>
                        )}
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
                        {user.role !== "OWNER" && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="h-7 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus akun pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
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
              Akun baru dibuat langsung oleh Pemilik. Peran Kasir dapat dibuat lebih dari 1 akun (mis. Kasir 1, Kasir 2).
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
                <div className="mt-1.5">
                  <Dropdown
                    variant="box"
                    searchable={false}
                    ariaLabel="Peran atau hak akses"
                    value={newRole}
                    onChange={setNewRole}
                    options={[
                      { value: "STAFF_KASIR", label: "Staff 1 (Kasir)" },
                      { value: "STAFF_GUDANG", label: "Staff 2 (Stok / Gudang)" },
                      { value: "KEPALA_TOKO", label: "Kepala Toko (Operasional & Pengawasan)" },
                      { value: "OWNER", label: "Pemilik Toko (Akses Penuh)" },
                    ]}
                  />
                </div>
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

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-100 mb-1">
              Edit Pengguna
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Ubah nama lengkap, username, atau peran akun @{editingUser.username}.
            </p>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-sans">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-[#F0090F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-sans">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-[#F0090F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-sans">
                  Peran / Hak Akses
                </label>
                <div className="mt-1.5">
                  <Dropdown
                    variant="box"
                    searchable={false}
                    ariaLabel="Peran atau hak akses"
                    value={editRole}
                    onChange={setEditRole}
                    options={[
                      { value: "STAFF_KASIR", label: "Staff 1 (Kasir)" },
                      { value: "STAFF_GUDANG", label: "Staff 2 (Stok / Gudang)" },
                      { value: "KEPALA_TOKO", label: "Kepala Toko (Operasional & Pengawasan)" },
                      { value: "OWNER", label: "Pemilik Toko (Akses Penuh)" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 h-11 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="w-1/2 h-11 bg-[#F0090F] hover:bg-[#D6080E] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingUser)}
        title={`Hapus akun "${deletingUser?.nama || ""}"?`}
        description={`Akun @${deletingUser?.username || ""} akan dihapus permanen jika belum memiliki riwayat transaksi.`}
        confirmText="Ya, Hapus Akun"
        variant="danger"
        loading={submittingDelete}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => !submittingDelete && setDeletingUser(null)}
      />

      {delegatingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Delegasi Izin: {delegatingUser.nama}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Peran: <strong>{getRoleLabel(delegatingUser.role)}</strong>. Pilih kewenangan tambahan yang didelegasikan oleh Pemilik Toko.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl">
              {DELEGATABLE_PERMISSIONS.map((item) => {
                const checked = delegatedPerms.includes(item.permission);
                return (
                  <label
                    key={item.permission}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDelegatedPerms((prev) => [...prev, item.permission]);
                        } else {
                          setDelegatedPerms((prev) => prev.filter((p) => p !== item.permission));
                        }
                      }}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900 dark:text-zinc-100">{item.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{item.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {delegationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {delegationError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDelegatingUser(null)}
                className="h-9 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingDelegation}
                onClick={handleSaveDelegation}
                className="h-9 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {savingDelegation ? "Menyimpan..." : "Simpan Delegasi Izin"}
              </button>
            </div>
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

      <ConfirmModal
        isOpen={Boolean(toggleTarget)}
        title={toggleTarget?.aktif ? "Nonaktifkan Akun?" : "Aktifkan Akun?"}
        description={
          toggleTarget
            ? `Apakah Anda yakin ingin ${toggleTarget.aktif ? "menonaktifkan" : "mengaktifkan"} akun "${toggleTarget.username}"?`
            : ""
        }
        confirmText={toggleTarget?.aktif ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
        variant={toggleTarget?.aktif ? "danger" : "default"}
        loading={togglingUser}
        onConfirm={confirmToggleAktif}
        onCancel={() => !togglingUser && setToggleTarget(null)}
      />
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

      <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />

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

function TabPembayaran() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"struk" | "bon">("struk");
  const [qrisScanNote, setQrisScanNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const handleQrisImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setQrisScanNote(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 900;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas tidak tersedia"));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error("Gagal membaca gambar"));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error("Gagal membaca file"));
        reader.readAsDataURL(file);
      });

      let detectedPayload: string | null = null;
      const tempId = `qris-decode-${Date.now()}`;
      const tempEl = document.createElement("div");
      tempEl.id = tempId;
      tempEl.style.display = "none";
      document.body.appendChild(tempEl);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(tempId);
        const decoded = await scanner.scanFile(file, false);
        if (decoded && isValidQrisPayload(decoded)) {
          detectedPayload = decoded.trim();
        }
        scanner.clear();
      } catch {
        // Gambar statis tetap tersimpan walau QR tidak terbaca otomatis
      } finally {
        tempEl.remove();
      }

      setSettings((prev) =>
        prev
          ? {
              ...prev,
              qrisStaticImage: dataUrl,
              ...(detectedPayload ? { qrisPayload: detectedPayload } : {}),
            }
          : prev
      );

      if (detectedPayload) {
        const merchant = extractQrisMerchantName(detectedPayload);
        setQrisScanNote(
          `Foto QRIS tersimpan & kode QRIS otomatis terbaca${merchant ? ` (${merchant})` : ""}! Mode Dinamis siap digunakan.`
        );
      } else {
        setQrisScanNote(
          "Foto QRIS Statis tersimpan. Jika ingin Mode Dinamis (nominal otomatis), tempel juga kode teks QRIS di bawah."
        );
      }
    } catch (err: any) {
      setError(err.message || "Gagal memproses gambar QRIS");
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          batasDiskonStaff: Math.max(0, Number(settings.batasDiskonStaff) || 0),
          ambangUtangLamaHari: Math.max(1, Number(settings.ambangUtangLamaHari) || 30),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan pembayaran");
      if (data.settings) setSettings(data.settings);
      setSuccess("Pengaturan pembayaran QRIS berhasil disimpan!");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton fields={4} />;
  }

  return (
    <div className="pt-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
            Pembayaran QRIS Toko (Statis &amp; Dinamis)
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Upload foto kartu QRIS Statis warung Anda agar tampil di layar kasir &amp; bisa diubah ke QRIS Dinamis otomatis.
          </p>
        </div>
      </div>

      <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      <PopupAlert type="success" message={qrisScanNote} onClear={() => setQrisScanNote(null)} />

      {settings && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Mode QRIS Default di Kasir</label>
              <Dropdown
                variant="box"
                searchable={false}
                ariaLabel="Mode QRIS default di kasir"
                value={settings.qrisModeDefault || "DINAMIS"}
                onChange={(val) =>
                  setSettings({
                    ...settings,
                    qrisModeDefault: val as "DINAMIS" | "STATIS",
                  })
                }
                options={[
                  { value: "DINAMIS", label: "QRIS Dinamis (Nominal otomatis terisi)" },
                  { value: "STATIS", label: "QRIS Statis (Tampilkan kartu QRIS toko)" },
                ]}
              />
            </div>

            <div>
              <label className="field-label">Foto / Gambar Kartu QRIS Statis</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 h-11 px-4 rounded-[14px] border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{settings.qrisStaticImage ? "Ganti Foto QRIS" : "Upload Foto QRIS"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisImageUpload}
                    className="hidden"
                  />
                </label>
                {settings.qrisStaticImage && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, qrisStaticImage: null })}
                    className="h-11 px-3 rounded-[14px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Hapus gambar QRIS"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <label className="field-label">Kode String QRIS Statis (untuk Mode Dinamis)</label>
              <textarea
                rows={3}
                value={settings.qrisPayload || ""}
                onChange={(e) => setSettings({ ...settings, qrisPayload: e.target.value })}
                placeholder="Otomatis terisi saat upload foto QRIS yang jelas, atau tempel kode QRIS (diawali 000201...)"
                className="ctl-ta font-mono text-xs"
              />
              {settings.qrisPayload?.trim() && (
                <p
                  className={`text-xs mt-1 font-medium ${
                    isValidQrisPayload(settings.qrisPayload)
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {isValidQrisPayload(settings.qrisPayload)
                    ? `✓ Payload QRIS valid${
                        extractQrisMerchantName(settings.qrisPayload)
                          ? ` • Merchant: ${extractQrisMerchantName(settings.qrisPayload)}`
                          : ""
                      }`
                    : "Format payload QRIS belum valid (harus diawali 000201 dan memiliki checksum CRC16)."}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[120px]">
              {settings.qrisStaticImage ? (
                <img
                  src={settings.qrisStaticImage}
                  alt="Preview QRIS Statis"
                  className="max-h-36 w-auto rounded-lg object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 space-y-1">
                  <QrCode className="w-7 h-7 mx-auto opacity-50" />
                  <p className="text-[11px]">Belum ada foto QRIS</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Menyimpan..." : "Simpan pengaturan pembayaran"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TabStruk() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [headerStruk, setHeaderStruk] = useState("");
  const [footerStruk, setFooterStruk] = useState("");
  const [catatanRetur, setCatatanRetur] = useState("");
  const [headerBon, setHeaderBon] = useState("");
  const [footerBon, setFooterBon] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"struk" | "bon">("struk");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          setHeaderStruk(data.settings.headerStruk || "");
          setFooterStruk(data.settings.footerStruk || "");
          setCatatanRetur(data.settings.catatanRetur || "");
          setHeaderBon(data.settings.headerBon || "");
          setFooterBon(data.settings.footerBon || "");
        }
      })
      .catch(() => setError("Gagal memuat pengaturan struk & dokumen"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          batasDiskonStaff: Math.max(0, Number(settings.batasDiskonStaff) || 0),
          ambangUtangLamaHari: Math.max(1, Number(settings.ambangUtangLamaHari) || 30),
          headerStruk: headerStruk.trim() || null,
          footerStruk: footerStruk.trim() || null,
          catatanRetur: catatanRetur.trim() || null,
          headerBon: headerBon.trim() || null,
          footerBon: footerBon.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan struk & dokumen");
      if (data.settings) setSettings(data.settings);
      setSuccess("Pengaturan header & footer struk, e-struk, dan bon kasbon berhasil disimpan!");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div className="pt-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Pengaturan Struk, E-Struk & Bon Kasbon
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Sesuaikan teks header, footer, dan catatan kebijakan pada struk kasir, e-struk PDF, dan dokumen bon piutang.
          </p>
        </div>
      </div>

      {error && (
        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
      )}
      {success && (
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      )}

      {settings && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* Bagian 1: Struk & E-Struk Kasir */}
            <div
              onFocus={() => setPreviewMode("struk")}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 space-y-4"
            >
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Struk & E-Struk Kasir
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Tampil pada struk belanja kasir (modal & cetak PDF). Nama, alamat, telepon, dan logo toko diambil dari tab Toko.
                </p>
              </div>

              <div>
                <label className="field-label">Header / Tagline Struk (Opsional)</label>
                <input
                  type="text"
                  value={headerStruk}
                  onChange={(e) => setHeaderStruk(e.target.value)}
                  placeholder="Contoh: Melayani Kebutuhan Harian Anda • Buka 07.00 - 21.00"
                  className="ctl"
                />
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Ditampilkan tepat di bawah alamat dan nomor telepon toko pada header struk & e-struk.
                </p>
              </div>

              <div>
                <label className="field-label">Footer Struk Belanja</label>
                <textarea
                  rows={2}
                  value={footerStruk}
                  onChange={(e) => setFooterStruk(e.target.value)}
                  placeholder="Terima kasih telah berbelanja!"
                  className="ctl-ta"
                />
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Kosongkan untuk menggunakan teks default (&ldquo;Terima kasih telah berbelanja!&rdquo;).
                </p>
              </div>

              <div>
                <label className="field-label">Catatan Retur / Kebijakan (Opsional)</label>
                <textarea
                  rows={2}
                  value={catatanRetur}
                  onChange={(e) => setCatatanRetur(e.target.value)}
                  placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan."
                  className="ctl-ta"
                />
              </div>
            </div>

            {/* Bagian 2: Bon Kasbon / Piutang PDF */}
            <div
              onFocus={() => setPreviewMode("bon")}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 space-y-4"
            >
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Bon Kasbon / Piutang (PDF)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Tampil pada dokumen PDF rincian bon piutang member.
                </p>
              </div>

              <div>
                <label className="field-label">Judul / Header Bon Kasbon</label>
                <input
                  type="text"
                  value={headerBon}
                  onChange={(e) => setHeaderBon(e.target.value)}
                  placeholder="RINCIAN BON PIUTANG"
                  className="ctl"
                />
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Kosongkan untuk menggunakan judul default (&ldquo;RINCIAN BON PIUTANG&rdquo;).
                </p>
              </div>

              <div>
                <label className="field-label">Footer Bon Kasbon</label>
                <textarea
                  rows={3}
                  value={footerBon}
                  onChange={(e) => setFooterBon(e.target.value)}
                  placeholder={"Harap simpan bukti transaksi ini sebagai arsip pembayaran.\nTerima kasih atas kepercayaan Anda."}
                  className="ctl-ta"
                />
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Mendukung beberapa baris (tekan Enter untuk baris baru). Kosongkan untuk menggunakan teks default.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Menyimpan..." : "Simpan pengaturan struk & dokumen"}</span>
              </button>
            </div>
          </form>

          {/* Live Preview Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                Preview Langsung
              </span>
              <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode("struk")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    previewMode === "struk"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Struk / E-Struk
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("bon")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    previewMode === "bon"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  Bon Kasbon (PDF)
                </button>
              </div>
            </div>

            {previewMode === "struk" ? (
              <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
                {/* Store Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  {settings.logoToko && (
                    <img
                      src={settings.logoToko}
                      alt={settings.namaToko}
                      className="w-10 h-10 object-contain mx-auto mb-1.5 rounded-lg"
                    />
                  )}
                  <p className="font-bold text-sm uppercase tracking-tight text-slate-900">
                    {settings.namaToko || "TOKO"}
                  </p>
                  {settings.alamat && (
                    <p className="text-[11px] text-slate-500 leading-snug">{settings.alamat}</p>
                  )}
                  {settings.telepon && (
                    <p className="text-[11px] text-slate-500">{settings.telepon}</p>
                  )}
                  {headerStruk.trim() && (
                    <p className="text-[11px] font-medium text-slate-700 italic pt-1">
                      {headerStruk.trim()}
                    </p>
                  )}
                </div>

                {/* Meta & Sample Items */}
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>No: TR-20261125-0001</span>
                  <span>25 Nov 2026, 16.30</span>
                </div>

                <div className="py-2 border-y border-dashed border-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Beras Ramos 5kg</p>
                      <p className="text-[11px] text-slate-400">1 zak × Rp 68.000</p>
                    </div>
                    <span className="font-semibold tabular-nums">Rp 68.000</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Minyak Goreng 1L</p>
                      <p className="text-[11px] text-slate-400">2 pcs × Rp 18.000</p>
                    </div>
                    <span className="font-semibold tabular-nums">Rp 36.000</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-sm pt-0.5">
                  <span>Total</span>
                  <span className="tabular-nums">Rp 104.000</span>
                </div>

                {/* Footer & Return Note */}
                <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-2">
                  <p className="text-[11px] text-slate-600 whitespace-pre-line">
                    {footerStruk.trim() || "Terima kasih telah berbelanja!"}
                  </p>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500">
                    {catatanRetur.trim() ||
                      "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
                {/* PDF Header */}
                <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                  {settings.logoToko && (
                    <img
                      src={settings.logoToko}
                      alt={settings.namaToko}
                      className="w-9 h-9 object-contain mx-auto mb-1 rounded-lg"
                    />
                  )}
                  <p className="font-bold text-sm uppercase tracking-wide text-slate-900">
                    {settings.namaToko || "TOKO"}
                  </p>
                  {(settings.alamat || settings.telepon) && (
                    <p className="text-[10px] text-slate-500">
                      {[settings.alamat, settings.telepon].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="text-center py-1 border-b border-slate-200">
                  <p className="font-bold text-xs tracking-wide text-slate-900 uppercase">
                    {headerBon.trim() || "RINCIAN BON PIUTANG"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Dicetak - Rabu, 25 November 2026
                  </p>
                </div>

                {/* Sample Member & Bon */}
                <div className="flex justify-between items-baseline border-b border-slate-200 pb-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Pelanggan</p>
                    <p className="font-bold text-xs text-slate-900">Pak Budi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Total utang</p>
                    <p className="font-bold text-sm text-rose-600 tabular-nums">Rp 45.000</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Bon 1 · #A1B2C3</span>
                    <span className="text-rose-600">· Belum Lunas</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Diambil oleh Pak Budi · Jam 09.15 WIB
                  </p>
                  <div className="flex justify-between border-t border-slate-100 pt-1 text-slate-700">
                    <span>Gula Pasir 1 kg</span>
                    <span className="font-semibold tabular-nums">Rp 18.000</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Kopi Kapal Api 1 pack</span>
                    <span className="font-semibold tabular-nums">Rp 27.000</span>
                  </div>
                </div>

                {/* PDF Footer */}
                <div className="pt-3 border-t border-slate-200 text-center">
                  <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
                    {footerBon.trim() ||
                      "Harap simpan bukti transaksi ini sebagai arsip pembayaran.\nTerima kasih atas kepercayaan Anda."}
                  </p>
                </div>
              </div>
            )}
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
            activeTab === "toko" || (!["pembayaran", "profil", "pin", "pengguna", "tema", "struk"].includes(activeTab))
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
          onClick={() => router.push("/owner/pengaturan?tab=pembayaran")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "pembayaran"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Pembayaran
        </button>
        <button
          onClick={() => router.push("/owner/pengaturan?tab=struk")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "struk"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          Struk &amp; Dokumen
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

      {activeTab === "pembayaran" && <TabPembayaran />}
      {activeTab === "struk" && <TabStruk />}
      {activeTab === "profil" && <EditProfileCard />}
      {activeTab === "pin" && <TabPin />}
      {activeTab === "pengguna" && <TabPengguna />}
      {activeTab === "tema" && <TabTema />}
      {(activeTab === "toko" || (!["pembayaran", "profil", "pin", "pengguna", "tema", "struk"].includes(activeTab))) && <TabToko />}
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <PengaturanContent />
    </Suspense>
  );
}
