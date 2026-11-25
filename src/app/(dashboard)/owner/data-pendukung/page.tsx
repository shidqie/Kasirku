"use client";

import { useEffect, useState } from "react";
import { Database, CreditCard, Receipt, Users } from "lucide-react";
import { CardListSkeleton } from "@/components/shared/Skeleton";

interface MetodeBayar {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
  keterangan: string;
}

interface JenisPengeluaran {
  id: string;
  nama: string;
  kategori: string;
  rutin: boolean;
}

interface StafKasir {
  id: string;
  nama: string;
  username: string;
  telepon: string;
  role: string;
  aktif: boolean;
}

const DEFAULT_METODE: MetodeBayar[] = [
  { id: "1", nama: "Tunai / Cash", kode: "TUNAI", aktif: true, keterangan: "Uang kertas & koin di laci kasir" },
  { id: "2", nama: "QRIS", kode: "QRIS", aktif: true, keterangan: "BCA, GoPay, OVO, Dana, ShopeePay, LinkAja" },
  { id: "3", nama: "Transfer Bank", kode: "TRANSFER", aktif: true, keterangan: "BCA / Mandiri / BRI / BNI Pemilik" },
  { id: "4", nama: "Kasbon Pelanggan", kode: "KASBON", aktif: true, keterangan: "Dicatat ke saldo utang member terdaftar" },
];

const DEFAULT_PENGELUARAN: JenisPengeluaran[] = [
  { id: "1", nama: "Token Listrik Warung", kategori: "Utilitas", rutin: true },
  { id: "2", nama: "Kantong Plastik / Kresek", kategori: "Operasional Toko", rutin: true },
  { id: "3", nama: "Ongkos Angkut / Bensin Kulakan", kategori: "Transportasi", rutin: true },
  { id: "4", nama: "Iuran Kebersihan & Ronda RT", kategori: "Lingkungan", rutin: true },
  { id: "5", nama: "Air Galon & Konsumsi Penjaga", kategori: "Konsumsi", rutin: true },
  { id: "6", nama: "Kertas Struk / Lakban", kategori: "Perlengkapan Kasir", rutin: false },
];

export default function DataPendukungPage() {
  const [metodeList, setMetodeList] = useState<MetodeBayar[]>(DEFAULT_METODE);
  const [pengeluaranList, setPengeluaranList] = useState<JenisPengeluaran[]>(DEFAULT_PENGELUARAN);
  const [stafList, setStafList] = useState<StafKasir[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form Pengeluaran Baru
  const [newPengeluaran, setNewPengeluaran] = useState("");
  const newKatPengeluaran = "Operasional";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await fetch("/api/users");
        const data = await res.json();
        if (res.ok && data.users) {
          const mapped = data.users.map((u: any) => ({
            id: u.id,
            nama: u.nama,
            username: u.username,
            telepon: u.telepon || "0857-9785-xxxx",
            role: u.role,
            aktif: u.aktif !== false,
          }));
          setStafList(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleToggleMetode = (id: string) => {
    setMetodeList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, aktif: !m.aktif } : m))
    );
  };

  const handleAddPengeluaran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPengeluaran.trim()) return;
    setPengeluaranList([
      ...pengeluaranList,
      {
        id: String(Date.now()),
        nama: newPengeluaran.trim(),
        kategori: newKatPengeluaran,
        rutin: true,
      },
    ]);
    setNewPengeluaran("");
  };

  return (
    <div className="space-y-6 w-full pb-12 select-none font-sans">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          Data Pendukung Warung
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Pusat pengelolaan 3 data penunjang: <strong>Metode Pembayaran</strong>, <strong>Jenis Pengeluaran Rutin</strong>, dan <strong>Daftar Kasir / Karyawan</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabel 1: Metode Bayar */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <CreditCard className="w-4 h-4 text-[#F0090F]" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                1. Metode Pembayaran ({metodeList.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 mt-3 space-y-2">
              {metodeList.map((m) => (
                <div key={m.id} className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        {m.nama}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500">
                        {m.kode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.keterangan}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetode(m.id)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${
                      m.aktif
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {m.aktif ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 bg-red-50/60 dark:bg-blue-950/20 rounded-xl text-[11px] text-[#F0090F] dark:text-blue-300">
            Metode ini langsung terhubung ke kasir POS toko saat transaksi pelanggan.
          </div>
        </div>

        {/* Tabel 2: Jenis Pengeluaran */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <Receipt className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                2. Jenis Pengeluaran Toko ({pengeluaranList.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 mt-3 max-h-[300px] overflow-y-auto pr-1">
              {pengeluaranList.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">
                      {p.nama}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Kategori: {p.kategori}
                    </span>
                  </div>
                  {p.rutin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-medium">
                      Rutin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddPengeluaran} className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
              + Tambah Pos Pengeluaran
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newPengeluaran}
                onChange={(e) => setNewPengeluaran(e.target.value)}
                placeholder="Nama pengeluaran..."
                className="flex-1 px-2.5 h-8 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Tambah
              </button>
            </div>
          </form>
        </div>

        {/* Tabel 3: Kasir / Karyawan */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <Users className="w-4 h-4 text-primary-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                3. Kasir & Karyawan ({stafList.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 mt-3 space-y-2">
              {loadingUsers ? (
                <div className="py-2">
                  <CardListSkeleton count={3} />
                </div>
              ) : stafList.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Belum ada kasir</div>
              ) : (
                stafList.map((u) => (
                  <div key={u.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                          {u.nama}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-50 text-primary-700 font-semibold">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        User: @{u.username} · HP: {u.telepon}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-800 rounded-xl text-[11px] text-primary-700 dark:text-primary-200">
            Penambahan akun staf lengkap dengan password dapat diakses melalui menu Pengaturan Pengguna.
          </div>
        </div>
      </div>
    </div>
  );
}

