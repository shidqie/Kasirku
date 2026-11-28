"use client";

import { useEffect, useState, Suspense } from "react";
import { TableSkeletonRows, DetailPageSkeleton } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Barcode,
  Camera,
  AlertTriangle,
  Ban,
  Tag,
  ListFilter,
  Save,
  FileText,
  TrendingUp,
} from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { formatProductCode } from "@/lib/codification";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { HargaNaikModal } from "@/components/produk/HargaNaikModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface SatuanInput {
  id?: string;
  namaSatuan: string;
  faktorKeDasar: number;
  hargaJual: number;
  hargaBeli: number;
  isDefault: boolean;
}

interface ProductItem {
  id: string;
  nama: string;
  barcode: string | null;
  satuanDasar: string;
  stokMinimum: string | number;
  stokCache: string | number;
  aktif: boolean;
  kategori: { id: string; nama: string } | null;
  satuanProduk: {
    id: string;
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    hargaBeli: number;
    isDefault: boolean;
  }[];
}

interface CategoryOption {
  id: string;
  nama: string;
}

function TabProduk() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [filterStok, setFilterStok] = useState<"SEMUA" | "MENIPIS" | "HABIS" | "TANPA_BARCODE">("SEMUA");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"SEARCH" | "FORM">("FORM");
  const [isHargaNaikOpen, setIsHargaNaikOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scannerRowProductId, setScannerRowProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<{ product: ProductItem; idBarang: string } | null>(null);
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [savingInDrawer, setSavingInDrawer] = useState(false);
  const [nama, setNama] = useState("");
  const [kategoriId, setKategoriId] = useState<string>("");
  const [barcode, setBarcode] = useState("");
  const [satuanDasar, setSatuanDasar] = useState("kg");
  const [stokMinimum, setStokMinimum] = useState<number>(0);
  const [satuanList, setSatuanList] = useState<SatuanInput[]>([
    { namaSatuan: "kg", faktorKeDasar: 1, hargaJual: 0, hargaBeli: 0, isDefault: true },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedKategori) params.set("kategoriId", selectedKategori);

      const [pRes, cRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        fetch("/api/categories"),
      ]);

      const pData = await pRes.json();
      const cData = await cRes.json();

      if (pRes.ok) setProducts(pData.products || []);
      if (cRes.ok) setCategories(cData.categories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData();
  }, [searchQuery, selectedKategori]);

  const openCreateModal = () => {
    setEditingProductId(null);
    setNama("");
    setKategoriId("");
    setBarcode("");
    setSatuanDasar("kg");
    setStokMinimum(5);
    setSatuanList([
      { namaSatuan: "kg", faktorKeDasar: 1, hargaJual: 14000, hargaBeli: 12000, isDefault: true },
    ]);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditInDrawer = (p: ProductItem) => {
    setEditingProductId(p.id);
    setNama(p.nama);
    setKategoriId(p.kategori?.id || "");
    setBarcode(p.barcode || "");
    setSatuanDasar(p.satuanDasar);
    setStokMinimum(Number(p.stokMinimum));
    setSatuanList(
      p.satuanProduk.map((s) => ({
        id: s.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli,
        isDefault: s.isDefault,
      }))
    );
    setError(null);
    setIsDrawerEditing(true);
  };

  const handleSaveFromDrawer = async () => {
    if (!detailProduct) return;
    const p = detailProduct.product;
    setSavingInDrawer(true);

    if (!nama.trim()) {
      setError("Nama produk tidak boleh kosong");
      setSavingInDrawer(false);
      return;
    }
    if (!satuanDasar.trim()) {
      setError("Satuan dasar tidak boleh kosong");
      setSavingInDrawer(false);
      return;
    }
    for (const s of satuanList) {
      if (!s.namaSatuan.trim()) {
        setError("Nama satuan tidak boleh kosong");
        setSavingInDrawer(false);
        return;
      }
      if (s.faktorKeDasar <= 0) {
        setError("Isi / faktor konversi harus lebih dari 0");
        setSavingInDrawer(false);
        return;
      }
    }

    try {
      const payload = {
        nama: nama.trim(),
        kategoriId: kategoriId || null,
        barcode: barcode.trim() || null,
        satuanDasar: satuanDasar.trim(),
        stokMinimum: Number(stokMinimum) || 0,
        satuanList,
      };

      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan produk");

      setSuccess(`Produk "${nama}" berhasil diperbarui`);
      setIsDrawerEditing(false);
      if (data.product) {
        setDetailProduct({ product: data.product, idBarang: detailProduct.idBarang });
      }
      fetchData();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan produk");
    } finally {
      setSavingInDrawer(false);
    }
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProductId(p.id);
    setNama(p.nama);
    setKategoriId(p.kategori?.id || "");
    setBarcode(p.barcode || "");
    setSatuanDasar(p.satuanDasar);
    setStokMinimum(Number(p.stokMinimum));
    setSatuanList(
      p.satuanProduk.map((s) => ({
        id: s.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli,
        isDefault: s.isDefault,
      }))
    );
    setError(null);
    setIsModalOpen(true);
  };

  const handleAddSatuanRow = () => {
    setSatuanList([
      ...satuanList,
      { namaSatuan: "", faktorKeDasar: 1, hargaJual: 0, hargaBeli: 0, isDefault: false },
    ]);
  };

  const handleRemoveSatuanRow = (index: number) => {
    if (satuanList.length <= 1) return;
    const newList = satuanList.filter((_, i) => i !== index);
    if (!newList.some((s) => s.isDefault)) {
      newList[0].isDefault = true;
    }
    setSatuanList(newList);
  };

  const handleSetDefaultSatuan = (index: number) => {
    setSatuanList(
      satuanList.map((s, i) => ({
        ...s,
        isDefault: i === index,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    for (const s of satuanList) {
      if (!s.namaSatuan) {
        setError("Nama satuan tidak boleh kosong");
        setSubmitting(false);
        return;
      }
      if (s.faktorKeDasar <= 0) {
        setError("Faktor konversi harus lebih dari 0");
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        nama,
        kategoriId: kategoriId || null,
        barcode: barcode.trim() || null,
        satuanDasar,
        stokMinimum: Number(stokMinimum),
        satuanList,
      };

      const url = editingProductId ? `/api/products/${editingProductId}` : "/api/products";
      const method = editingProductId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan produk");

      setSuccess(`Produk "${nama}" berhasil disimpan`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (p: ProductItem) => {
    setDeleteTarget(p);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menonaktifkan produk");

      setSuccess(`Produk "${deleteTarget.nama}" berhasil dinonaktifkan`);
      if (detailProduct?.product.id === deleteTarget.id) {
        setDetailProduct(null);
        setIsDrawerEditing(false);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      {/* Header & Filter Fixed at Top */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Daftar Produk &amp; Harga
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Kelola produk sembako, multi-satuan, harga jual/beli, dan stok minimum.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setIsHargaNaikOpen(true)}
              className="h-10 px-3.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 active:scale-95 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
              title="Naikkan harga jual produk dengan cepat"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Harga Naik</span>
            </button>
            <button
              onClick={() => {
                setScannerTarget("SEARCH");
                setIsScannerOpen(true);
              }}
              className="h-10 px-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 active:scale-95 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
              title="Scan barcode produk untuk mencari barang"
            >
              <Barcode className="w-4 h-4" />
              <span>Scan barcode</span>
            </button>
            <button
              onClick={openCreateModal}
              className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <span>Tambah produk</span>
            </button>
          </div>
        </div>

        {/* Filter Bar Garis Bawah */}
        <div className="pt-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: "SEMUA", label: "Semua" },
              { id: "MENIPIS", label: "Stok menipis" },
              { id: "HABIS", label: "Stok habis" },
              { id: "TANPA_BARCODE", label: "Tanpa barcode" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilterStok(f.id as any);
                  setCurrentPage(1);
                }}
                className={`pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                  filterStok === f.id
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap pb-2.5">
            <Dropdown
              variant="underline"
              ariaLabel="Filter kategori produk"
              value={selectedKategori}
              onChange={(val) => {
                setSelectedKategori(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="Cari kategori..."
              options={[
                { value: "", label: "Semua kategori" },
                ...categories.map((c) => ({ value: c.id, label: c.nama })),
              ]}
            />

            <div className="relative flex-1 sm:w-52">
              <input
                type="text"
                placeholder="Cari nama atau barcode"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-6 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
              title="Muat ulang"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tabel Produk Minimalist (Scrollable Internal, Sticky Header) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4 whitespace-nowrap">ID</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Harga Jual</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Stok</th>
                <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loading ? (
                <TableSkeletonRows rows={8} cols={6} />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Tidak ada produk yang cocok.
                  </td>
                </tr>
              ) : (
                products
                  .filter((p) => {
                    const stok = Number(p.stokCache);
                    const min = Number(p.stokMinimum);
                    if (filterStok === "HABIS") return stok <= 0;
                    if (filterStok === "MENIPIS") return stok > 0 && stok <= min;
                    if (filterStok === "TANPA_BARCODE") return !p.barcode;
                    return true;
                  })
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((p, idx) => {
                  const stok = Number(p.stokCache);
                  const min = Number(p.stokMinimum);
                  const isHabis = stok <= 0;
                  const isMenipis = stok > 0 && stok <= min;
                  const isLowStock = stok <= min;

                  // Satuan eceran = satuan dengan faktorKeDasar terkecil (satuan dasar)
                  const satuanEceran = p.satuanProduk.reduce((prev, cur) =>
                    Number(cur.faktorKeDasar) <= Number(prev.faktorKeDasar) ? cur : prev,
                    p.satuanProduk[0]
                  );
                  // Satuan grosir = satuan dengan faktorKeDasar terbesar (untuk konversi stok)
                  const satuanGrosir = p.satuanProduk.length > 1
                    ? p.satuanProduk.reduce((prev, cur) =>
                        Number(cur.faktorKeDasar) > Number(prev.faktorKeDasar) ? cur : prev,
                        p.satuanProduk[0]
                      )
                    : null;
                  const hargaEceran = satuanEceran?.hargaJual || 0;

                  // Konversi stok ke satuan grosir jika ada
                  const konversiStokDisplay = satuanGrosir && Number(satuanGrosir.faktorKeDasar) > 1
                    ? Math.floor(stok / Number(satuanGrosir.faktorKeDasar))
                    : null;

                  // ID Barang: format PRD-[KAT]-NNN berdasarkan kategori & urutan
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const idBarang = formatProductCode(p.kategori?.nama, globalIdx);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/90 dark:hover:bg-zinc-800/60 transition-colors duration-150">
                      {/* ID */}
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                          {idBarang}
                        </span>
                      </td>

                      {/* Nama Produk */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-tight">
                          {p.nama}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-zinc-300">
                          {p.kategori?.nama || <span className="text-slate-400 italic">Umum</span>}
                        </span>
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                          {formatRupiah(hargaEceran)}
                        </span>
                      </td>

                      {/* Stok */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isLowStock && (
                            <span
                              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                isHabis ? "bg-rose-500" : "bg-amber-500"
                              }`}
                              title={isHabis ? "Stok habis" : "Stok menipis"}
                            />
                          )}
                          <span className={`text-sm font-semibold tabular-nums ${
                            isHabis ? "text-rose-600" : isMenipis ? "text-amber-600" : "text-slate-900 dark:text-zinc-100"
                          }`}>
                            {formatDecimal(stok)}
                          </span>
                        </div>
                        {konversiStokDisplay !== null && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                            ≈ {konversiStokDisplay} {satuanGrosir?.namaSatuan}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 text-xs">
                          <button
                            onClick={() => setDetailProduct({ product: p, idBarang })}
                            className="h-7 px-2.5 rounded-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Lihat detail produk"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => {
                              setDetailProduct({ product: p, idBarang });
                              openEditInDrawer(p);
                            }}
                            className="h-7 px-2.5 rounded-lg font-semibold text-amber-600 hover:bg-amber-50 transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Edit produk & harga"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="h-7 px-2.5 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Nonaktifkan produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {products.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={products.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Drawer Detail / Edit / Hapus Produk (UI seragam dengan Tambah Produk) */}
      {detailProduct && (() => {
        const p = detailProduct.product;
        const stok = Number(p.stokCache);
        const min = Number(p.stokMinimum);
        const isHabis = stok <= 0;
        const isMenipis = stok > 0 && stok <= min;
        const statusStok = isHabis ? "Habis" : isMenipis ? "Menipis" : "Aman";
        const statusColor = isHabis
          ? "text-rose-600 bg-rose-50 border border-rose-200"
          : isMenipis
          ? "text-amber-600 bg-amber-50 border border-amber-200"
          : "text-emerald-600 bg-emerald-50 border border-emerald-200";

        return (
          <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
            onClick={() => {
              setDetailProduct(null);
              setIsDrawerEditing(false);
            }}
          >
            <div
              className="w-full max-w-xl h-full bg-white text-slate-900 shadow-2xl flex flex-col border-l border-slate-200 select-text drawer-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Seragam */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">
                      {isDrawerEditing ? "Edit Produk" : "Detail Produk"}
                    </h3>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {detailProduct.idBarang}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusStok}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isDrawerEditing
                      ? "Perbarui data barang dan pengaturan satuan harga"
                      : `Stok saat ini: ${formatDecimal(stok)} ${p.satuanDasar} • Stok min: ${formatDecimal(min)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailProduct(null);
                    setIsDrawerEditing(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Seragam (Read & Edit) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isDrawerEditing) handleSaveFromDrawer();
                }}
                className="flex-1 overflow-y-auto p-5 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Produk */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                      Nama Produk *
                    </label>
                    {!isDrawerEditing ? (
                      <div className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold flex items-center">
                        {p.nama}
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Contoh: Beras Ramos Setra"
                        className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    )}
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                      Kategori
                    </label>
                    {!isDrawerEditing ? (
                      <div className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm flex items-center">
                        {p.kategori?.nama || "Umum"}
                      </div>
                    ) : (
                      <div className="mt-1.5">
                        <Dropdown
                          variant="box"
                          ariaLabel="Pilih kategori produk"
                          value={kategoriId}
                          onChange={setKategoriId}
                          placeholder="-- Pilih Kategori --"
                          searchPlaceholder="Cari kategori..."
                          options={[
                            { value: "", label: "-- Pilih Kategori --" },
                            ...categories.map((c) => ({ value: c.id, label: c.nama })),
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  {/* Barcode Produk */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                        Barcode Produk
                      </label>
                      {isDrawerEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget("FORM");
                            setIsScannerOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 text-[11px] font-bold transition-colors"
                          title="Scan kemasan fisik dengan kamera"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Scan Kamera</span>
                        </button>
                      )}
                    </div>
                    {!isDrawerEditing ? (
                      <div className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono flex items-center justify-between">
                        <span>{p.barcode || "-"}</span>
                        <Barcode className="w-4 h-4 text-slate-400" />
                      </div>
                    ) : (
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder="Scan atau ketik barcode produk (EAN-13 / 899...)"
                          className="w-full pl-3.5 pr-10 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget("FORM");
                            setIsScannerOpen(true);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary-600 transition-colors"
                          title="Buka scanner kamera"
                        >
                          <Barcode className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Satuan Dasar & Stok Min */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                          Satuan Dasar *
                        </label>
                        {isDrawerEditing && (
                          <span className="text-[10px] text-slate-400">Pilih / ketik</span>
                        )}
                      </div>
                      {!isDrawerEditing ? (
                        <div className="w-full mt-1.5 px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm capitalize flex items-center">
                          {p.satuanDasar}
                        </div>
                      ) : (
                        <>
                          <div className="relative mt-1.5">
                            <input
                              type="text"
                              required
                              list="preset-satuan-dasar"
                              value={satuanDasar}
                              onChange={(e) => setSatuanDasar(e.target.value)}
                              placeholder="pcs / kg / bungkus..."
                              className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[
                              { label: "pcs", title: "Eceran umum" },
                              { label: "kg", title: "Beras/Gula/Tepung" },
                              { label: "bungkus", title: "Mie/Rokok" },
                              { label: "sachet", title: "Kopi/Minuman" },
                              { label: "butir", title: "Telur" },
                              { label: "botol", title: "Minyak/Kecap" },
                              { label: "renceng", title: "Grosir sachet" },
                              { label: "dus", title: "Grosir kardus" },
                              { label: "pak", title: "Grosir pak" },
                              { label: "karung", title: "Grosir karung" },
                            ].map((chip) => (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => setSatuanDasar(chip.label)}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                                  satuanDasar === chip.label
                                    ? "bg-blue-600 text-white font-bold"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                }`}
                                title={chip.title}
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                        Stok Min
                      </label>
                      {!isDrawerEditing ? (
                        <div className="w-full mt-1.5 px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm flex items-center">
                          {formatDecimal(min)}
                        </div>
                      ) : (
                        <NumberInput
                          min={0}
                          emptyFallback={0}
                          value={stokMinimum}
                          onChange={setStokMinimum}
                          className="w-full mt-1.5 px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Multi-Satuan dan Harga Produk (Seragam dengan Tambah Produk) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        Multi-Satuan dan Harga Produk
                      </h4>
                      <p className="text-xs text-slate-400">
                        {isDrawerEditing
                          ? `Atur beberapa satuan & harga konversi ke satuan dasar (${satuanDasar}).`
                          : `Daftar satuan & harga konversi ke satuan dasar (${p.satuanDasar}).`}
                      </p>
                    </div>
                    {isDrawerEditing && (
                      <button
                        type="button"
                        onClick={handleAddSatuanRow}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Satuan</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!isDrawerEditing ? (
                      p.satuanProduk.map((s) => (
                        <div
                          key={s.id}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-3 items-center"
                        >
                          <div className="col-span-12 sm:col-span-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Nama Satuan
                            </span>
                            <div className="w-full px-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center capitalize">
                              {s.namaSatuan}
                            </div>
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Isi ({p.satuanDasar})
                            </span>
                            <div className="w-full px-2 h-9 bg-white border border-slate-200 rounded-lg text-xs font-sans flex items-center">
                              {formatDecimal(Number(s.faktorKeDasar) || 1)}
                            </div>
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Harga Beli (Rp)
                            </span>
                            <div className="w-full px-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-end">
                              {formatRupiah(s.hargaBeli)}
                            </div>
                          </div>
                          <div className="col-span-8 sm:col-span-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Harga Jual (Rp)
                            </span>
                            <div className="w-full px-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 flex items-center justify-end">
                              {formatRupiah(s.hargaJual)}
                            </div>
                          </div>
                          <div className="col-span-4 sm:col-span-1 flex items-center justify-end pt-3 sm:pt-0">
                            {s.isDefault && (
                              <span className="p-1.5 rounded-lg text-xs bg-blue-600 text-white font-bold">
                                Def
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      satuanList.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-3 items-center"
                        >
                          <div className="col-span-12 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Nama Satuan
                            </label>
                            <input
                              type="text"
                              required
                              list="preset-multi-satuan"
                              value={s.namaSatuan}
                              onChange={(e) => {
                                const updated = [...satuanList];
                                updated[idx].namaSatuan = e.target.value;
                                setSatuanList(updated);
                              }}
                              placeholder="pcs, dus, renceng..."
                              className="w-full px-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Isi ({satuanDasar})
                            </label>
                            <NumberInput
                              min={0.001}
                              emptyFallback={1}
                              required
                              value={s.faktorKeDasar}
                              onChange={(val) => {
                                const updated = [...satuanList];
                                updated[idx].faktorKeDasar = val;
                                setSatuanList(updated);
                              }}
                              className="w-full px-2 h-9 bg-white border border-slate-200 rounded-lg text-xs font-sans"
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Harga Beli (Rp)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none select-none">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="0"
                                value={s.hargaBeli ? s.hargaBeli.toLocaleString("id-ID") : ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  const updated = [...satuanList];
                                  updated[idx].hargaBeli = digits ? parseInt(digits, 10) : 0;
                                  setSatuanList(updated);
                                }}
                                className="w-full pl-8 pr-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="col-span-8 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                              Harga Jual (Rp)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none select-none">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="0"
                                value={s.hargaJual ? s.hargaJual.toLocaleString("id-ID") : ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  const updated = [...satuanList];
                                  updated[idx].hargaJual = digits ? parseInt(digits, 10) : 0;
                                  setSatuanList(updated);
                                }}
                                className="w-full pl-8 pr-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-blue-600 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="col-span-4 sm:col-span-1 flex items-center justify-end gap-1.5 pt-3 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleSetDefaultSatuan(idx)}
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                s.isDefault
                                  ? "bg-blue-600 text-white font-bold"
                                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Jadikan satuan default kasir"
                            >
                              Def
                            </button>
                            {satuanList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSatuanRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Hapus baris satuan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Seragam (Read: Hapus + Edit, Update: Batal + Simpan Perubahan) */}
                {!isDrawerEditing ? (
                  <div className="flex gap-2 pt-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="w-1/2 h-11 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditInDrawer(p)}
                      className="w-1/2 h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit Produk</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsDrawerEditing(false)}
                      className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingInDrawer}
                      className="w-1/2 h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingInDrawer ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        );
      })()}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop">
          <div
            className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingProductId ? "Detail & Edit Produk" : "Tambah Produk Baru"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingProductId
                    ? "Informasi lengkap dan pengaturan harga/stok barang"
                    : "Lengkapi data barang dan satuan harga"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Beras Ramos Setra"
                    className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                    Kategori
                  </label>
                  <div className="mt-1.5">
                    <Dropdown
                      variant="box"
                      ariaLabel="Pilih kategori produk"
                      value={kategoriId}
                      onChange={setKategoriId}
                      placeholder="-- Pilih Kategori --"
                      searchPlaceholder="Cari kategori..."
                      options={[
                        { value: "", label: "-- Pilih Kategori --" },
                        ...categories.map((c) => ({ value: c.id, label: c.nama })),
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                      Barcode Produk
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget("FORM");
                        setIsScannerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 text-[11px] font-bold transition-colors"
                      title="Scan kemasan fisik dengan kamera"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan Kamera</span>
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan atau ketik barcode produk (EAN-13 / 899...)"
                      className="w-full pl-3.5 pr-10 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget("FORM");
                        setIsScannerOpen(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary-600 transition-colors"
                      title="Buka scanner kamera"
                    >
                      <Barcode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                        Satuan Dasar *
                      </label>
                      <span className="text-[10px] text-slate-400">Pilih / ketik</span>
                    </div>
                    <div className="relative mt-1.5">
                      <input
                        type="text"
                        required
                        list="preset-satuan-dasar"
                        value={satuanDasar}
                        onChange={(e) => setSatuanDasar(e.target.value)}
                        placeholder="pcs / kg / bungkus / renceng..."
                        className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <datalist id="preset-satuan-dasar">
                        <option value="pcs" />
                        <option value="kg" />
                        <option value="gram" />
                        <option value="liter" />
                        <option value="bungkus" />
                        <option value="sachet" />
                        <option value="butir" />
                        <option value="botol" />
                        <option value="kaleng" />
                        <option value="dus" />
                        <option value="karton" />
                        <option value="renceng" />
                        <option value="pak" />
                        <option value="karung" />
                        <option value="ikat" />
                        <option value="bal" />
                        <option value="slop" />
                        <option value="lusin" />
                        <option value="kodi" />
                        <option value="sak" />
                      </datalist>
                    </div>

                    {/* Quick suggestion chips untuk sembako eceran & grosir */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        { label: "pcs", title: "Eceran umum" },
                        { label: "kg", title: "Beras/Gula/Tepung" },
                        { label: "bungkus", title: "Mie/Rokok" },
                        { label: "sachet", title: "Kopi/Minuman" },
                        { label: "butir", title: "Telur" },
                        { label: "botol", title: "Minyak/Kecap" },
                        { label: "renceng", title: "Grosir sachet" },
                        { label: "dus", title: "Grosir kardus" },
                        { label: "pak", title: "Grosir pak" },
                        { label: "karung", title: "Grosir karung" },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setSatuanDasar(chip.label)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                            satuanDasar === chip.label
                              ? "bg-blue-600 text-white font-bold"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          }`}
                          title={chip.title}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                      Stok Min
                    </label>
                    <NumberInput
                      min={0}
                      emptyFallback={0}
                      value={stokMinimum}
                      onChange={setStokMinimum}
                      className="w-full mt-1.5 px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      Multi-Satuan dan Harga Produk
                    </h4>
                    <p className="text-xs text-slate-400">
                      Atur beberapa satuan & harga konversi ke satuan dasar ({satuanDasar}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSatuanRow}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Satuan</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {satuanList.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                          Nama Satuan
                        </label>
                        <input
                          type="text"
                          required
                          list="preset-multi-satuan"
                          value={s.namaSatuan}
                          onChange={(e) => {
                            const updated = [...satuanList];
                            updated[idx].namaSatuan = e.target.value;
                            setSatuanList(updated);
                          }}
                          placeholder="pcs, dus, renceng..."
                          className="w-full px-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                        <datalist id="preset-multi-satuan">
                          <option value="pcs" />
                          <option value="butir" />
                          <option value="bungkus" />
                          <option value="sachet" />
                          <option value="botol" />
                          <option value="kaleng" />
                          <option value="kg" />
                          <option value="liter" />
                          <option value="renceng (10 sachet)" />
                          <option value="renceng (12 sachet)" />
                          <option value="pak (10 pcs)" />
                          <option value="pak (20 pcs)" />
                          <option value="dus (24 pcs)" />
                          <option value="dus (40 pcs)" />
                          <option value="dus (48 pcs)" />
                          <option value="karton" />
                          <option value="karung 5kg" />
                          <option value="karung 10kg" />
                          <option value="karung 25kg" />
                          <option value="karung 50kg" />
                          <option value="slop (10 bungkus)" />
                          <option value="bal (20 slop)" />
                          <option value="lusin (12 pcs)" />
                          <option value="kodi (20 pcs)" />
                          <option value="ikat" />
                        </datalist>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                          Isi ({satuanDasar})
                        </label>
                        <NumberInput
                          min={0.001}
                          emptyFallback={1}
                          required
                          value={s.faktorKeDasar}
                          onChange={(val) => {
                            const updated = [...satuanList];
                            updated[idx].faktorKeDasar = val;
                            setSatuanList(updated);
                          }}
                          className="w-full px-2 h-9 bg-white border border-slate-200 rounded-lg text-xs font-sans"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                          Harga Beli (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none select-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="0"
                            value={s.hargaBeli ? s.hargaBeli.toLocaleString("id-ID") : ""}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              const updated = [...satuanList];
                              updated[idx].hargaBeli = digits ? parseInt(digits, 10) : 0;
                              setSatuanList(updated);
                            }}
                            className="w-full pl-8 pr-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="col-span-8 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans block mb-1">
                          Harga Jual (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none select-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="0"
                            value={s.hargaJual ? s.hargaJual.toLocaleString("id-ID") : ""}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              const updated = [...satuanList];
                              updated[idx].hargaJual = digits ? parseInt(digits, 10) : 0;
                              setSatuanList(updated);
                            }}
                            className="w-full pl-8 pr-2.5 h-9 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-blue-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="col-span-4 sm:col-span-1 flex items-center justify-end gap-1.5 pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultSatuan(idx)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            s.isDefault
                              ? "bg-blue-600 text-white font-bold"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Jadikan satuan default kasir"
                        >
                          Def
                        </button>
                        {satuanList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSatuanRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Hapus baris satuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submitting ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Barcode Scanner Modal untuk Master Produk */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerRowProductId(null);
        }}
        onScanSuccess={async (scannedCode) => {
          const cleanCode = scannedCode.trim();
          if (scannerRowProductId) {
            // Pasang / Update barcode langsung dari baris tabel ke database
            try {
              const res = await fetch(`/api/products/${scannerRowProductId}/barcode`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ barcode: cleanCode }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || "Gagal menyimpan barcode");
                return;
              }
              setSuccess(`Barcode ${cleanCode} berhasil disimpan ke produk!`);
              setIsScannerOpen(false);
              setScannerRowProductId(null);
              fetchData();
            } catch (err: any) {
              setError(err.message || "Gagal menghubungi server");
            }
          } else if (scannerTarget === "FORM") {
            setBarcode(cleanCode);
            setIsScannerOpen(false);
          } else {
            setSearchQuery(cleanCode);
            setIsScannerOpen(false);
          }
        }}
      />

      <HargaNaikModal
        isOpen={isHargaNaikOpen}
        onClose={() => setIsHargaNaikOpen(false)}
        products={products}
        categories={categories}
        onSuccess={(msg) => {
          setSuccess(msg);
          fetchData();
        }}
        onError={(msg) => setError(msg)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Nonaktifkan Produk?"
        description={
          deleteTarget
            ? `Produk "${deleteTarget.nama}" akan dinonaktifkan dari daftar kasir.`
            : ""
        }
        confirmText="Ya, Nonaktifkan"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}

function ProdukContent() {
  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      <TabProduk />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <ProdukContent />
    </Suspense>
  );
}
