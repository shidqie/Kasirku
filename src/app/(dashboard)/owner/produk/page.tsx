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
  Download,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { formatProductCode } from "@/lib/codification";
import { downloadPriceListPdf, downloadPriceListCsv } from "@/lib/pdf-price-list";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { HargaNaikModal } from "@/components/produk/HargaNaikModal";
import { ImportProdukModal } from "@/components/produk/ImportProdukModal";
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [downloadingPriceList, setDownloadingPriceList] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState<string | null>(null);
  const [assignProducts, setAssignProducts] = useState<ProductItem[]>([]);
  const [assignSearch, setAssignSearch] = useState("");
  const [loadingAssignProducts, setLoadingAssignProducts] = useState(false);
  const [assigningProductId, setAssigningProductId] = useState<string | null>(null);
  const [replaceBarcodeTarget, setReplaceBarcodeTarget] = useState<ProductItem | null>(null);
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
  const [pageSize, setPageSize] = useState(20);

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
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");

      setSuccess(`Produk "${deleteTarget.nama}" berhasil dihapus`);
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
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Daftar Produk &amp; Harga
              </h2>
              {!loading && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 tabular-nums">
                  {products.length.toLocaleString("id-ID")} produk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Kelola produk sembako, multi-satuan, harga jual/beli, dan stok minimum.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                className="h-10 w-10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 active:scale-95 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Menu lainnya (Import, Download Harga, Harga Naik)"
                aria-label="Menu lainnya"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isDownloadMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsDownloadMenuOpen(false)}
                  />
                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-lg py-1.5 z-40">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        setIsImportOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>Import Data (.csv)</span>
                    </button>
                    <button
                      type="button"
                      disabled={downloadingPriceList || products.length === 0}
                      onClick={async () => {
                        setIsDownloadMenuOpen(false);
                        setDownloadingPriceList(true);
                        try {
                          await downloadPriceListPdf(products);
                        } finally {
                          setDownloadingPriceList(false);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      <span>{downloadingPriceList ? "Menyiapkan PDF..." : "Download Harga (PDF)"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={products.length === 0}
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        downloadPriceListCsv(products);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download Excel (.csv)</span>
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        setIsHargaNaikOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 flex items-center gap-2.5 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Harga Naik</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setScannerTarget("SEARCH");
                setIsScannerOpen(true);
              }}
              className="h-10 w-10 sm:w-auto sm:px-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 active:scale-95 font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              title="Scan barcode produk untuk mencari barang"
            >
              <Barcode className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Scan barcode</span>
            </button>
            <button
              onClick={openCreateModal}
              className="h-10 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <span className="hidden sm:inline">Tambah produk</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          </div>
        </div>

        {/* Search bar full-width */}
        <div className="pt-4 relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau barcode"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-6 pr-10 h-9 bg-transparent border-b border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          />
          <button
            type="button"
            onClick={fetchData}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>

        {/* Category tabs horizontal scroll */}
        <div className="mt-3 flex items-center gap-0 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-zinc-800 text-xs">
          {[
            { value: "", label: "Semua", count: products.length },
            ...categories.map((c) => ({
              value: c.id,
              label: c.nama,
              count: products.filter((p) => p.kategori?.id === c.id).length,
            })),
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setSelectedKategori(cat.value);
                setCurrentPage(1);
              }}
              className={`pb-2.5 pr-5 whitespace-nowrap transition-colors cursor-pointer focus:outline-none border-b-2 shrink-0 ${
                selectedKategori === cat.value
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              {cat.label}
              {cat.count > 0 && (
                <span className={`ml-1.5 text-[10px] font-semibold tabular-nums ${
                  selectedKategori === cat.value
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-zinc-500"
                }`}>{cat.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filter stok tabs + count */}
        <div className="mt-0 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
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
                className={`py-2.5 pr-5 border-b-2 whitespace-nowrap transition-colors cursor-pointer focus:outline-none shrink-0 ${
                  filterStok === f.id
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] tabular-nums shrink-0 pl-4 pb-px">
              {Math.min(currentPage * pageSize, (() => {
                const filtered = products.filter((p) => {
                  const stok = Number(p.stokCache);
                  if (filterStok === "MENIPIS") return stok > 0 && stok <= Number(p.stokMinimum);
                  if (filterStok === "HABIS") return stok <= 0;
                  if (filterStok === "TANPA_BARCODE") return !p.barcode;
                  return true;
                });
                return filtered.length;
              })())} dari {(() => {
                const filtered = products.filter((p) => {
                  const stok = Number(p.stokCache);
                  if (filterStok === "MENIPIS") return stok > 0 && stok <= Number(p.stokMinimum);
                  if (filterStok === "HABIS") return stok <= 0;
                  if (filterStok === "TANPA_BARCODE") return !p.barcode;
                  return true;
                });
                return filtered.length;
              })()} produk
            </span>
          )}
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
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
          <Pagination
            currentPage={currentPage}
            totalItems={products.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
          <span className="text-xs text-slate-500 dark:text-zinc-400 tabular-nums pr-1">
            Total <strong className="text-slate-800 dark:text-zinc-200">{products.length.toLocaleString("id-ID")}</strong> produk · {pageSize}/hal
          </span>
        </div>
      )}

      {/* Drawer Detail / Edit / Hapus Produk (Global Minimalist Style) */}
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
        const defaultUnit = p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];

        return (
          <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
            onClick={() => {
              setDetailProduct(null);
              setIsDrawerEditing(false);
            }}
          >
            <div
              className="w-full max-w-md h-full bg-white text-slate-900 shadow-xl flex flex-col border-l border-slate-100 select-text drawer-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Minimalist */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="pr-3 flex-1 min-w-0">
                  <span className="text-[11px] font-mono text-slate-400 block tracking-wider">
                    {detailProduct.idBarang}
                  </span>
                  {!isDrawerEditing ? (
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5 leading-snug">
                      {p.nama}
                    </h3>
                  ) : (
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama Produk..."
                      required
                      className="w-full mt-0.5 py-1 font-bold text-lg text-slate-900 bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-900 transition-colors"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isDrawerEditing) {
                      setIsDrawerEditing(false);
                    } else {
                      setDetailProduct(null);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  title={isDrawerEditing ? "Batal" : "Tutup"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Minimalist */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isDrawerEditing) handleSaveFromDrawer();
                }}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm"
              >
                {/* 1. Barcode */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 text-xs">Barcode</span>
                  {!isDrawerEditing ? (
                    <span className="font-medium text-slate-900 text-xs font-mono text-right">
                      {p.barcode || "-"}
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Opsional"
                        className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 font-mono w-36 text-right focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget("FORM");
                          setIsScannerOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                        title="Scan kamera"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Section: Harga Produk */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Harga Produk
                    </h4>
                    {isDrawerEditing && (
                      <button
                        type="button"
                        onClick={handleAddSatuanRow}
                        className="text-xs font-semibold text-[#F0090F] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    {!isDrawerEditing ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                          <tr className="divide-x divide-slate-200">
                            <th className="py-2 px-3 font-semibold">Satuan</th>
                            <th className="py-2 px-2.5 font-semibold text-center">Isi</th>
                            <th className="py-2 px-3 font-semibold text-right">Harga</th>
                            <th className="py-2 px-3 font-semibold text-right">Per {p.satuanDasar}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-600">
                          {p.satuanProduk.map((s) => {
                            const faktor = Number(s.faktorKeDasar) || 1;
                            const hargaPerDasar = Math.round(s.hargaJual / faktor);
                            return (
                              <tr key={s.id} className="divide-x divide-slate-200">
                                <td className="py-2 px-3 font-medium text-slate-900 capitalize">
                                  {s.namaSatuan}
                                </td>
                                <td className="py-2 px-2.5 text-center text-slate-600 font-mono">
                                  {formatDecimal(faktor)}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                                  {formatRupiah(s.hargaJual)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">
                                  {formatRupiah(hargaPerDasar)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                          <tr className="divide-x divide-slate-200">
                            <th className="py-2 px-2.5 font-semibold">Satuan</th>
                            <th className="py-2 px-2 font-semibold text-center w-20">
                              Isi ({satuanDasar || "pcs"})
                            </th>
                            <th className="py-2 px-2.5 font-semibold text-right">Harga jual</th>
                            <th className="py-2 px-2.5 font-semibold text-right">
                              Per {satuanDasar || "pcs"}
                            </th>
                            <th className="py-2 px-1 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-600">
                          {satuanList.map((s, idx) => {
                            const faktor = Number(s.faktorKeDasar) || 1;
                            const perDasar = Math.round((Number(s.hargaJual) || 0) / faktor);
                            return (
                              <tr key={idx} className="divide-x divide-slate-200">
                                <td className="p-0">
                                  <input
                                    type="text"
                                    required
                                    list="preset-multi-satuan"
                                    value={s.namaSatuan}
                                    onChange={(e) => {
                                      const u = [...satuanList];
                                      u[idx].namaSatuan = e.target.value;
                                      setSatuanList(u);
                                    }}
                                    placeholder="Satuan"
                                    className="w-full h-9 px-2.5 bg-transparent text-xs font-medium text-slate-900 focus:outline-none focus:bg-blue-50/40"
                                  />
                                </td>
                                <td className="p-0">
                                  <NumberInput
                                    min={0.001}
                                    emptyFallback={1}
                                    required
                                    value={s.faktorKeDasar}
                                    onChange={(val) => {
                                      const u = [...satuanList];
                                      u[idx].faktorKeDasar = val;
                                      setSatuanList(u);
                                    }}
                                    className="w-full h-9 text-center px-2 bg-transparent text-xs font-mono text-slate-900 focus:outline-none focus:bg-blue-50/40"
                                  />
                                </td>
                                <td className="p-0">
                                  <div className="relative flex items-center h-9 px-2.5">
                                    <span className="text-[11px] text-slate-400 pointer-events-none select-none mr-1">
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
                                        const u = [...satuanList];
                                        u[idx].hargaJual = digits ? parseInt(digits, 10) : 0;
                                        setSatuanList(u);
                                      }}
                                      className="w-full h-full bg-transparent text-xs font-semibold text-right text-slate-900 focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 text-right text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                                  <span className="font-semibold text-slate-700">{formatRupiah(perDasar)}</span>
                                  /{satuanDasar || "pcs"}
                                </td>
                                <td className="p-0 text-center">
                                  {satuanList.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSatuanRow(idx)}
                                      className="w-full h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer"
                                      title="Hapus baris satuan ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* 3. Info List Properti Produk (Stok saat ini, Stok minimum, Satuan, Satuan dasar, Kategori, Status stok) */}
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Stok saat ini</span>
                    <span className="font-semibold text-slate-900 text-xs text-right">
                      {formatDecimal(stok)} {p.satuanDasar}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Stok minimum</span>
                    {!isDrawerEditing ? (
                      <span className="font-medium text-slate-900 text-xs text-right">
                        {formatDecimal(min)}
                      </span>
                    ) : (
                      <NumberInput
                        min={0}
                        emptyFallback={0}
                        value={stokMinimum}
                        onChange={setStokMinimum}
                        className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 w-20 text-right focus:outline-none focus:border-slate-900"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Satuan</span>
                    <span className="font-medium text-slate-900 text-xs capitalize text-right">
                      {!isDrawerEditing
                        ? defaultUnit?.namaSatuan || p.satuanDasar
                        : satuanList[0]?.namaSatuan || satuanDasar}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Satuan dasar</span>
                    {!isDrawerEditing ? (
                      <span className="font-medium text-slate-900 text-xs capitalize text-right">
                        {p.satuanDasar}
                      </span>
                    ) : (
                      <input
                        type="text"
                        required
                        list="preset-satuan-dasar"
                        value={satuanDasar}
                        onChange={(e) => setSatuanDasar(e.target.value)}
                        placeholder="Satuan dasar"
                        className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 w-28 text-right focus:outline-none focus:border-slate-900"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Kategori</span>
                    {!isDrawerEditing ? (
                      <span className="font-medium text-slate-900 text-xs text-right">
                        {p.kategori?.nama || "Umum"}
                      </span>
                    ) : (
                      <div className="flex justify-end">
                        <Dropdown
                          variant="underline"
                          ariaLabel="Pilih kategori produk"
                          value={kategoriId}
                          onChange={setKategoriId}
                          placeholder="-- Pilih Kategori --"
                          searchPlaceholder="Cari kategori..."
                          align="right"
                          className="!w-auto"
                          options={[
                            { value: "", label: "-- Pilih Kategori --" },
                            ...categories.map((c) => ({ value: c.id, label: c.nama })),
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Status stok</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>
                      {statusStok}
                    </span>
                  </div>
                </div>

                {/* 3. Tombol Aksi (Detail/Read hanya tombol Tutup di header; Edit menampilkan Batal + Simpan) */}
                {isDrawerEditing && (
                  <div className="pt-3 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsDrawerEditing(false)}
                      className="flex-1 h-11 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingInDrawer}
                      className="flex-[2] h-11 rounded-xl font-bold text-xs text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                      style={{ background: "var(--primary)" }}
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
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-white text-slate-900 shadow-xl flex flex-col border-l border-slate-100 select-text drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Minimalist */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="pr-3 flex-1 min-w-0">
                <span className="text-[11px] font-mono text-slate-400 block tracking-wider">
                  {editingProductId ? "EDIT PRODUK" : "PRODUK BARU"}
                </span>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama Produk..."
                  className="w-full mt-0.5 py-1 font-bold text-lg text-slate-900 bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title="Batal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
              {/* 1. Barcode */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 text-xs">Barcode</span>
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Opsional"
                    className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 font-mono w-36 text-right focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget("FORM");
                      setIsScannerOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                    title="Scan kamera"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Section: Harga Produk */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Harga Produk
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSatuanRow}
                    className="text-xs font-semibold text-[#F0090F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                      <tr className="divide-x divide-slate-200">
                        <th className="py-2 px-2.5 font-semibold">Satuan</th>
                        <th className="py-2 px-2 font-semibold text-center w-20">
                          Isi ({satuanDasar || "pcs"})
                        </th>
                        <th className="py-2 px-2.5 font-semibold text-right">Harga jual</th>
                        <th className="py-2 px-2.5 font-semibold text-right">
                          Per {satuanDasar || "pcs"}
                        </th>
                        <th className="py-2 px-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-600">
                      {satuanList.map((s, idx) => {
                        const faktor = Number(s.faktorKeDasar) || 1;
                        const perDasar = Math.round((Number(s.hargaJual) || 0) / faktor);
                        return (
                          <tr key={idx} className="divide-x divide-slate-200">
                            <td className="p-0">
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
                                placeholder="pcs, dus..."
                                className="w-full h-9 px-2.5 bg-transparent text-xs font-medium text-slate-900 focus:outline-none focus:bg-blue-50/40"
                              />
                            </td>
                            <td className="p-0">
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
                                className="w-full h-9 text-center px-2 bg-transparent text-xs font-mono text-slate-900 focus:outline-none focus:bg-blue-50/40"
                              />
                            </td>
                            <td className="p-0">
                              <div className="relative flex items-center h-9 px-2.5">
                                <span className="text-[11px] text-slate-400 pointer-events-none select-none mr-1">
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
                                  className="w-full h-full bg-transparent text-xs font-semibold text-right text-slate-900 focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                              <span className="font-semibold text-slate-700">{formatRupiah(perDasar)}</span>
                              /{satuanDasar || "pcs"}
                            </td>
                            <td className="p-0 text-center">
                              {satuanList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSatuanRow(idx)}
                                  className="w-full h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer"
                                  title="Hapus baris satuan ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Info List Properti Produk (Stok minimum, Satuan, Satuan dasar, Kategori) */}
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 text-xs">Stok minimum</span>
                  <NumberInput
                    min={0}
                    emptyFallback={0}
                    value={stokMinimum}
                    onChange={setStokMinimum}
                    className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 w-20 text-right focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 text-xs">Satuan</span>
                  <span className="font-medium text-slate-900 text-xs capitalize text-right">
                    {satuanList[0]?.namaSatuan || satuanDasar}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 text-xs">Satuan dasar</span>
                  <input
                    type="text"
                    required
                    list="preset-satuan-dasar"
                    value={satuanDasar}
                    onChange={(e) => setSatuanDasar(e.target.value)}
                    placeholder="Satuan dasar"
                    className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 w-28 text-right focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 text-xs">Kategori</span>
                  <div className="flex justify-end">
                    <Dropdown
                      variant="underline"
                      ariaLabel="Pilih kategori produk"
                      value={kategoriId}
                      onChange={setKategoriId}
                      placeholder="-- Pilih Kategori --"
                      searchPlaceholder="Cari kategori..."
                      align="right"
                      className="!w-auto"
                      options={[
                        { value: "", label: "-- Pilih Kategori --" },
                        ...categories.map((c) => ({ value: c.id, label: c.nama })),
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] h-11 rounded-xl font-bold text-xs text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--primary)" }}
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? "Menyimpan..." : "Simpan Produk"}</span>
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
            // Cek apakah barcode sudah terdaftar di daftar produk
            setIsScannerOpen(false);
            try {
              const res = await fetch(`/api/products?search=${encodeURIComponent(cleanCode)}`);
              const data = await res.json();
              const foundList: ProductItem[] = Array.isArray(data?.products) ? data.products : [];
              const exactMatch = foundList.find(
                (p) => (p.barcode || "").trim().toLowerCase() === cleanCode.toLowerCase()
              );

              if (exactMatch) {
                setFilterStok("SEMUA");
                setSelectedKategori("");
                setCurrentPage(1);
                setSearchQuery(cleanCode);
                setSuccess(`Produk ditemukan: ${exactMatch.nama} (${cleanCode})`);
              } else {
                // Tidak terdaftar -> buka modal pilih produk untuk dipasangkan barcode ini
                setUnregisteredBarcode(cleanCode);
                setAssignSearch("");
                setLoadingAssignProducts(true);
                try {
                  const allRes = await fetch("/api/products");
                  const allData = await allRes.json();
                  setAssignProducts(Array.isArray(allData?.products) ? allData.products : []);
                } catch {
                  setAssignProducts(products);
                } finally {
                  setLoadingAssignProducts(false);
                }
              }
            } catch {
              setSearchQuery(cleanCode);
            }
          }
        }}
      />

      {/* Modal Pilih Produk untuk Barcode yang Belum Terdaftar */}
      {unregisteredBarcode && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUnregisteredBarcode(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold mb-1.5">
                  <Barcode className="w-3.5 h-3.5" />
                  <span className="font-mono">{unregisteredBarcode}</span>
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Barcode Belum Terdaftar
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Pilih produk untuk memasangkan barcode ini, atau buat produk baru.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnregisteredBarcode(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Cari nama produk..."
                  className="w-full pl-9 pr-3 h-10 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
              {loadingAssignProducts ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Memuat daftar produk...
                </div>
              ) : (() => {
                const q = assignSearch.trim().toLowerCase();
                const filtered = assignProducts.filter(
                  (p) => !q || p.nama.toLowerCase().includes(q)
                );
                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-xs text-slate-400">
                      Produk tidak ditemukan.
                    </div>
                  );
                }
                const assignBarcodeToProduct = async (p: ProductItem) => {
                  setAssigningProductId(p.id);
                  setError(null);
                  try {
                    const res = await fetch(`/api/products/${p.id}/barcode`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ barcode: unregisteredBarcode }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setError(data.error || "Gagal memasangkan barcode");
                      return;
                    }
                    setSuccess(`Barcode ${unregisteredBarcode} berhasil dipasang ke "${p.nama}"`);
                    const scanned = unregisteredBarcode;
                    setReplaceBarcodeTarget(null);
                    setUnregisteredBarcode(null);
                    setFilterStok("SEMUA");
                    setSelectedKategori("");
                    setCurrentPage(1);
                    setSearchQuery(scanned);
                    fetchData();
                  } catch (err: any) {
                    setError(err.message || "Gagal menghubungi server");
                  } finally {
                    setAssigningProductId(null);
                  }
                };

                return filtered.slice(0, 40).map((p) => {
                  const defaultUnit = p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
                  const isAssigning = assigningProductId === p.id;
                  const hasExistingBarcode = Boolean(p.barcode && p.barcode.trim() !== "");
                  return (
                    <div
                      key={p.id}
                      className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                          {p.nama}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.kategori?.nama || "Umum"} · {formatRupiah(defaultUnit?.hargaJual || 0)}
                          {hasExistingBarcode ? ` · Barcode lama: ${p.barcode}` : " · Tanpa barcode"}
                        </p>
                      </div>
                      {hasExistingBarcode ? (
                        <button
                          type="button"
                          disabled={Boolean(assigningProductId)}
                          onClick={() => setReplaceBarcodeTarget(p)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-[11px] font-semibold shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isAssigning ? "Menyimpan..." : "Ganti"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(assigningProductId)}
                          onClick={() => assignBarcodeToProduct(p)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-semibold shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isAssigning ? "Menyimpan..." : "Pilih"}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setUnregisteredBarcode(null)}
                className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const code = unregisteredBarcode;
                  setUnregisteredBarcode(null);
                  openCreateModal();
                  setBarcode(code);
                }}
                className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ background: "var(--primary)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Produk Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(replaceBarcodeTarget && unregisteredBarcode)}
        title="Ganti Barcode Produk?"
        description={
          replaceBarcodeTarget && unregisteredBarcode
            ? `Anda yakin ingin mengganti barcode produk "${replaceBarcodeTarget.nama}" dari ${replaceBarcodeTarget.barcode} menjadi ${unregisteredBarcode}?`
            : ""
        }
        confirmText="Ya, Ganti Barcode"
        variant="danger"
        loading={Boolean(assigningProductId)}
        onConfirm={async () => {
          if (!replaceBarcodeTarget || !unregisteredBarcode) return;
          setAssigningProductId(replaceBarcodeTarget.id);
          setError(null);
          try {
            const res = await fetch(`/api/products/${replaceBarcodeTarget.id}/barcode`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ barcode: unregisteredBarcode }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || "Gagal mengganti barcode");
              return;
            }
            setSuccess(`Barcode "${replaceBarcodeTarget.nama}" berhasil diganti menjadi ${unregisteredBarcode}`);
            const scanned = unregisteredBarcode;
            setReplaceBarcodeTarget(null);
            setUnregisteredBarcode(null);
            setFilterStok("SEMUA");
            setSelectedKategori("");
            setCurrentPage(1);
            setSearchQuery(scanned);
            fetchData();
          } catch (err: any) {
            setError(err.message || "Gagal menghubungi server");
          } finally {
            setAssigningProductId(null);
          }
        }}
        onCancel={() => !assigningProductId && setReplaceBarcodeTarget(null)}
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

      <ImportProdukModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        existingProducts={products}
        existingCategories={categories}
        onImported={(res) => {
          setSuccess(
            `Import selesai: ${res.created} ditambahkan, ${res.updated} diperbarui, ${res.skipped} duplikat dilewati.`
          );
          fetchData();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget ? `Hapus Produk "${deleteTarget.nama}"?` : "Hapus Produk?"}
        description={
          deleteTarget
            ? `Produk "${deleteTarget.nama}" akan dihapus secara permanen dari sistem.`
            : ""
        }
        confirmText="Ya, Hapus"
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
