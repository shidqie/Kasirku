"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, AlertCircle, CheckCircle, RefreshCw, X } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";

interface CategoryItem {
  id: string;
  nama: string;
  _count?: { produk: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [namaInput, setNamaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat kategori");
      setCategories(data.categories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setNamaInput("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setNamaInput(cat.nama);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kategori");

      setSuccess(
        editingCategory
          ? `Kategori berhasil diubah menjadi "${namaInput}"`
          : `Kategori "${namaInput}" berhasil ditambahkan`
      );
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!confirm(`Hapus kategori "${cat.nama}"?`)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kategori");

      setSuccess(`Kategori "${cat.nama}" berhasil dihapus`);
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* Header Fixed */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Master Kategori Produk
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Kelompokkan sembako (Beras, Minyak, Gula, Telur, Mie, dll.) untuk memudahkan pencarian di kasir.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Tambah kategori
          </button>
        </div>

        <div className="py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Daftar kategori ({categories.length})
          </span>
          <button
            type="button"
            onClick={fetchCategories}
            title="Muat ulang"
            aria-label="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tabel Kategori Minimalist (Scrollable Internal, Sticky Header) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4">Nama kategori</th>
                <th className="py-3 px-4 text-center">Jumlah produk</th>
                <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loading ? (
                <TableSkeletonRows rows={6} cols={3} />
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    Belum ada kategori. Silakan tambahkan kategori baru.
                  </td>
                </tr>
              ) : (
                categories
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-zinc-100">{cat.nama}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500 dark:text-zinc-400 tabular-nums">
                      {cat._count?.produk ?? 0} produk
                    </td>
                    <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="h-7 px-2.5 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          title="Ubah nama kategori"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          title="Hapus kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {categories.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={categories.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Slide Drawer Tambah / Ubah Kategori */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  {editingCategory ? "Ubah Kategori" : "Tambah Kategori Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Contoh: Beras, Minyak Goreng, Bumbu Dapur, Makanan Ringan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="field-label">
                    Nama kategori <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={namaInput}
                    onChange={(e) => setNamaInput(e.target.value)}
                    placeholder="Masukkan nama kategori"
                    className="ctl"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-11 text-white font-bold rounded-[14px] text-xs shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  style={{ background: "var(--primary)" }}
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
