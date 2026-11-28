"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Tag,
  Gift,
  Percent,
  Banknote,
  Package,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import {
  PromoRuleDTO,
  TipePromo,
  formatPromoShortLabel,
  isPromoActiveNow,
} from "@/lib/promo";
import {
  DataTable,
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmpty,
} from "@/components/shared/DataTable";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { PopupAlert } from "@/components/shared/ToastProvider";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface ProductOption {
  id: string;
  nama: string;
  satuanDasar: string;
}

interface CategoryOption {
  id: string;
  nama: string;
}

const PROMO_TYPE_META: Record<
  TipePromo,
  { label: string; desc: string; icon: any; badgeClass: string }
> = {
  BELI_X_GRATIS_Y: {
    label: "Beli X Gratis Y",
    desc: "Contoh: Beli 1 Gratis 1 atau Beli 2 Gratis 1 produk bonus",
    icon: Gift,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  HARGA_PAKET: {
    label: "Harga Paket / Bundling",
    desc: "Contoh: Beli 3 pcs jadi Rp 10.000",
    icon: Package,
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  },
  DISKON_PERSEN: {
    label: "Diskon Persen (%)",
    desc: "Potongan persentase untuk produk atau kategori tertentu",
    icon: Percent,
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  },
  DISKON_NOMINAL: {
    label: "Diskon Nominal (Rp)",
    desc: "Potongan harga tetap dalam Rupiah",
    icon: Banknote,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  },
};

function toDateInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export default function PromoPage() {
  const [promos, setPromos] = useState<PromoRuleDTO[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<TipePromo>("BELI_X_GRATIS_Y");
  const [targetMode, setTargetMode] = useState<"PRODUK" | "KATEGORI" | "SEMUA">("PRODUK");
  const [produkId, setProdukId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [minQty, setMinQty] = useState(1);
  const [bonusQty, setBonusQty] = useState(1);
  const [bonusProdukId, setBonusProdukId] = useState("");
  const [diskonPersen, setDiskonPersen] = useState(10);
  const [diskonNominal, setDiskonNominal] = useState(1000);
  const [hargaPaket, setHargaPaket] = useState(10000);
  const [berlakuKelipatan, setBerlakuKelipatan] = useState(true);
  const [mulaiPada, setMulaiPada] = useState("");
  const [berakhirPada, setBerakhirPada] = useState("");
  const [aktif, setAktif] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PromoRuleDTO | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, prodRes, catRes] = await Promise.all([
        fetch("/api/promos"),
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const [pData, prodData, catData] = await Promise.all([
        pRes.json(),
        prodRes.json(),
        catRes.json(),
      ]);
      setPromos(pData.promos || []);
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
    } catch {
      setError("Gagal memuat data aturan promo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      if (filterStatus === "ACTIVE" && !isPromoActiveNow(p)) return false;
      if (filterStatus === "INACTIVE" && isPromoActiveNow(p)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNama = p.nama.toLowerCase().includes(q);
        const matchProduk = p.produk?.nama.toLowerCase().includes(q);
        const matchKategori = p.kategori?.nama.toLowerCase().includes(q);
        if (!matchNama && !matchProduk && !matchKategori) return false;
      }
      return true;
    });
  }, [promos, filterStatus, search]);

  const openAddModal = () => {
    setEditingId(null);
    setNama("");
    setTipe("BELI_X_GRATIS_Y");
    setTargetMode("PRODUK");
    setProdukId("");
    setKategoriId("");
    setMinQty(1);
    setBonusQty(1);
    setBonusProdukId("");
    setDiskonPersen(10);
    setDiskonNominal(1000);
    setHargaPaket(10000);
    setBerlakuKelipatan(true);
    setMulaiPada("");
    setBerakhirPada("");
    setAktif(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: PromoRuleDTO) => {
    setEditingId(p.id);
    setNama(p.nama);
    setTipe(p.tipe);
    setTargetMode(p.produkId ? "PRODUK" : p.kategoriId ? "KATEGORI" : "SEMUA");
    setProdukId(p.produkId || "");
    setKategoriId(p.kategoriId || "");
    setMinQty(p.minQty);
    setBonusQty(p.bonusQty);
    setBonusProdukId(p.bonusProdukId || "");
    setDiskonPersen(p.diskonPersen);
    setDiskonNominal(p.diskonNominal);
    setHargaPaket(p.hargaPaket);
    setBerlakuKelipatan(p.berlakuKelipatan);
    setMulaiPada(toDateInput(p.mulaiPada));
    setBerakhirPada(toDateInput(p.berakhirPada));
    setAktif(p.aktif);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama promo wajib diisi");
      return;
    }
    if (targetMode === "PRODUK" && !produkId) {
      setError("Pilih produk target terlebih dahulu");
      return;
    }
    if (targetMode === "KATEGORI" && !kategoriId) {
      setError("Pilih kategori target terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nama: nama.trim(),
        tipe,
        produkId: targetMode === "PRODUK" ? produkId : null,
        kategoriId: targetMode === "KATEGORI" ? kategoriId : null,
        minQty,
        bonusQty: tipe === "BELI_X_GRATIS_Y" ? bonusQty : 0,
        bonusProdukId: tipe === "BELI_X_GRATIS_Y" && bonusProdukId ? bonusProdukId : null,
        diskonPersen: tipe === "DISKON_PERSEN" ? diskonPersen : 0,
        diskonNominal: tipe === "DISKON_NOMINAL" ? diskonNominal : 0,
        hargaPaket: tipe === "HARGA_PAKET" ? hargaPaket : 0,
        berlakuKelipatan,
        mulaiPada: mulaiPada || null,
        berakhirPada: berakhirPada || null,
        aktif,
      };

      const url = editingId ? `/api/promos/${editingId}` : "/api/promos";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan aturan promo");

      setSuccess(editingId ? "Aturan promo diperbarui" : "Aturan promo berhasil ditambahkan");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAktif = async (p: PromoRuleDTO) => {
    try {
      const res = await fetch(`/api/promos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !p.aktif }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status promo");
      setPromos((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, aktif: !p.aktif } : item))
      );
      setSuccess(`Promo "${p.nama}" ${!p.aktif ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/promos/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus aturan promo");
      setSuccess(`Promo "${deleteTarget.nama}" dihapus`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const paginated = filteredPromos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 space-y-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Aturan Promo &amp; Diskon
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 tabular-nums">
                {promos.length} aturan
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              Buat promo Beli 1 Gratis 1, Harga Paket, Diskon Persen, atau Potongan Nominal otomatis di kasir.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah aturan</span>
          </button>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-xs border-b border-slate-200 dark:border-zinc-800 pb-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama promo atau produk..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                { id: "ALL", label: "Semua" },
                { id: "ACTIVE", label: "Aktif" },
                { id: "INACTIVE", label: "Nonaktif" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={fetchData}
              title="Muat ulang"
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Table */}
      <DataTableContainer>
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Nama Promo</DataTableHead>
              <DataTableHead>Jenis</DataTableHead>
              <DataTableHead>Target</DataTableHead>
              <DataTableHead>Aturan</DataTableHead>
              <DataTableHead align="center">Status</DataTableHead>
              <DataTableHead align="center">Aksi</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <TableSkeletonRows rows={6} cols={6} />
            ) : paginated.length === 0 ? (
              <DataTableEmpty colSpan={6} className="py-12">
                <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                Belum ada aturan promo. Klik &ldquo;Tambah aturan&rdquo; untuk membuat promo baru.
              </DataTableEmpty>
            ) : (
              paginated.map((p) => {
                const meta = PROMO_TYPE_META[p.tipe];
                const Icon = meta.icon;
                const activeNow = isPromoActiveNow(p);

                return (
                  <DataTableRow key={p.id}>
                    <DataTableCell>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 block">
                        {p.nama}
                      </span>
                      {(p.mulaiPada || p.berakhirPada) && (
                        <span className="text-[11px] text-slate-400">
                          {p.mulaiPada ? toDateInput(p.mulaiPada) : "Sekarang"} s/d{" "}
                          {p.berakhirPada ? toDateInput(p.berakhirPada) : "Seterusnya"}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.badgeClass}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      {p.produk ? (
                        <span className="font-medium text-slate-800 dark:text-zinc-200">
                          {p.produk.nama}
                        </span>
                      ) : p.kategori ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          Kategori: {p.kategori.nama}
                        </span>
                      ) : (
                        <span className="text-slate-500">Semua Produk</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        {formatPromoShortLabel(p)}
                      </span>
                      {p.berlakuKelipatan && p.tipe !== "DISKON_PERSEN" && (
                        <span className="block text-[10px] text-slate-400">
                          Berlaku kelipatan
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell align="center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.aktif}
                        onClick={() => handleToggleAktif(p)}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                          p.aktif ? "bg-blue-500" : "bg-slate-200 dark:bg-zinc-700"
                        }`}
                        title={activeNow ? "Promo aktif" : "Promo nonaktif"}
                      >
                        <span
                          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            p.aktif ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </DataTableCell>
                    <DataTableCell align="center" className="whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="h-7 px-2.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </DataTableContainer>

      {filteredPromos.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPromos.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Modal Form Tambah / Edit Promo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                {editingId ? "Edit Aturan Promo" : "Tambah Aturan Promo"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Promo
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Misal: Beli 1 Gratis 1 Aqua 600ml"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Jenis Aturan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROMO_TYPE_META) as TipePromo[]).map((key) => {
                    const m = PROMO_TYPE_META[key];
                    const Icon = m.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipe(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          tipe === key
                            ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-zinc-300">
                  Berlaku Untuk
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "PRODUK", label: "Produk Tertentu" },
                      { id: "KATEGORI", label: "Kategori" },
                      { id: "SEMUA", label: "Semua Produk" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetMode(t.id)}
                      className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        targetMode === t.id
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900"
                          : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {targetMode === "PRODUK" && (
                  <Dropdown
                    searchable
                    searchPlaceholder="Cari produk target..."
                    value={produkId}
                    onChange={setProdukId}
                    placeholder="Pilih produk..."
                    options={products.map((pr) => ({
                      value: pr.id,
                      label: pr.nama,
                    }))}
                  />
                )}

                {targetMode === "KATEGORI" && (
                  <Dropdown
                    searchable
                    searchPlaceholder="Cari kategori..."
                    value={kategoriId}
                    onChange={setKategoriId}
                    placeholder="Pilih kategori..."
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.nama,
                    }))}
                  />
                )}
              </div>

              {/* Parameter Aturan */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-800">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    {tipe === "BELI_X_GRATIS_Y"
                      ? "Beli Minimal (Qty)"
                      : tipe === "HARGA_PAKET"
                      ? "Jumlah Paket (Qty)"
                      : "Minimal Qty"}
                  </label>
                  <NumberInput
                    min={1}
                    emptyFallback={1}
                    value={minQty}
                    onChange={setMinQty}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                  />
                </div>

                {tipe === "BELI_X_GRATIS_Y" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                      Gratis (Qty Bonus)
                    </label>
                    <NumberInput
                      min={1}
                      emptyFallback={1}
                      value={bonusQty}
                      onChange={setBonusQty}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                )}

                {tipe === "HARGA_PAKET" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                      Harga Paket (Rp)
                    </label>
                    <NumberInput
                      min={0}
                      emptyFallback={0}
                      value={hargaPaket}
                      onChange={setHargaPaket}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                )}

                {tipe === "DISKON_PERSEN" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                      Diskon (%)
                    </label>
                    <NumberInput
                      min={1}
                      max={100}
                      emptyFallback={10}
                      value={diskonPersen}
                      onChange={setDiskonPersen}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                )}

                {tipe === "DISKON_NOMINAL" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                      Potongan (Rp)
                    </label>
                    <NumberInput
                      min={0}
                      emptyFallback={0}
                      value={diskonNominal}
                      onChange={setDiskonNominal}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                )}

                {tipe === "BELI_X_GRATIS_Y" && (
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                      Produk Gratis (Opsional — kosongkan jika sama dengan produk yang dibeli)
                    </label>
                    <Dropdown
                      searchable
                      searchPlaceholder="Cari produk bonus..."
                      value={bonusProdukId}
                      onChange={setBonusProdukId}
                      placeholder="Sama dengan produk yang dibeli"
                      options={[
                        { value: "", label: "Sama dengan produk yang dibeli" },
                        ...products.map((pr) => ({
                          value: pr.id,
                          label: pr.nama,
                        })),
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* Kelipatan & Periode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Mulai Tanggal (Opsional)
                  </label>
                  <input
                    type="date"
                    value={mulaiPada}
                    onChange={(e) => setMulaiPada(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Berakhir Tanggal (Opsional)
                  </label>
                  <input
                    type="date"
                    value={berakhirPada}
                    onChange={(e) => setBerakhirPada(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={berlakuKelipatan}
                    onChange={(e) => setBerlakuKelipatan(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    Berlaku kelipatan (mis. beli 2 gratis 2)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    Aktif
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Hapus Aturan Promo"
        description={`Yakin ingin menghapus promo "${deleteTarget?.nama}"?`}
        confirmText="Hapus"
        variant="danger"
      />
    </div>
  );
}
