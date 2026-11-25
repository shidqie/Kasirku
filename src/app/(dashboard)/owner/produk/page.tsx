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
} from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";

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
      alert("Nama produk tidak boleh kosong");
      setSavingInDrawer(false);
      return;
    }
    if (!satuanDasar.trim()) {
      alert("Satuan dasar tidak boleh kosong");
      setSavingInDrawer(false);
      return;
    }
    for (const s of satuanList) {
      if (!s.namaSatuan.trim()) {
        alert("Nama satuan tidak boleh kosong");
        setSavingInDrawer(false);
        return;
      }
      if (s.faktorKeDasar <= 0) {
        alert("Isi / faktor konversi harus lebih dari 0");
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
      alert(err.message || "Gagal menyimpan produk");
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

  const handleDelete = async (p: ProductItem) => {
    if (!confirm(`Nonaktifkan produk "${p.nama}"?`)) return;

    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menonaktifkan produk");

      setSuccess(`Produk "${p.nama}" berhasil dinonaktifkan`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* Header & Filter Fixed at Top */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Master Produk &amp; Harga
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Kelola produk sembako, multi-satuan, harga jual/beli, dan stok minimum.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
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
            <select
              value={selectedKategori}
              onChange={(e) => {
                setSelectedKategori(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-slate-900 dark:focus:border-white pr-2"
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>

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
                <th className="py-3 pr-4 whitespace-nowrap">ID barang</th>
                <th className="py-3 px-3 whitespace-nowrap">Barcode</th>
                <th className="py-3 px-3">Nama barang</th>
                <th className="py-3 px-3 whitespace-nowrap">Kategori</th>
                <th className="py-3 px-3 whitespace-nowrap">Satuan</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Harga (eceran)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Stok saat ini</th>
                <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loading ? (
                <TableSkeletonRows rows={8} cols={8} />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
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

                  // ID Barang: format BRG-NNN berdasarkan urutan
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const idBarang = `BRG-${String(globalIdx).padStart(3, "0")}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      {/* ID Barang */}
                      <td className="py-3 pr-4">
                        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {idBarang}
                        </span>
                      </td>

                      {/* Barcode */}
                      <td className="py-3 px-3">
                        {p.barcode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                              {p.barcode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setScannerRowProductId(p.id);
                                setIsScannerOpen(true);
                              }}
                              className="text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors whitespace-nowrap"
                              title="Ganti barcode"
                            >
                              Ganti
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setScannerRowProductId(p.id);
                              setIsScannerOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-dashed border-slate-200 hover:border-amber-300 whitespace-nowrap"
                          >
                            <Barcode className="w-3 h-3" />
                            <span>+ Barcode</span>
                          </button>
                        )}
                      </td>

                      {/* Nama Barang */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <span className="font-semibold text-slate-900 text-sm leading-tight">
                          {p.nama}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {p.kategori?.nama || <span className="text-slate-400 italic">Umum</span>}
                        </span>
                      </td>

                      {/* Satuan (eceran) */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {satuanEceran?.namaSatuan || p.satuanDasar}
                        </span>
                      </td>

                      {/* Harga (Eceran) */}
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(hargaEceran)}
                        </span>
                      </td>

                      {/* Stok Saat Ini */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          {isLowStock && (
                            <span
                              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                isHabis ? "bg-rose-500" : "bg-amber-500"
                              }`}
                              title={isHabis ? "Stok habis" : "Stok menipis"}
                            />
                          )}
                          <span className={`text-sm font-bold ${
                            isHabis ? "text-rose-600" : isMenipis ? "text-amber-600" : "text-slate-900"
                          }`}>
                            {formatDecimal(stok)}
                          </span>
                        </div>
                        {konversiStokDisplay !== null && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
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

      {/* Modal / Slide-over Detail Produk (Tampilan Bersih, Elegan & Minimalis - Sesuai Tema Light Sistem) */}
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

        // Satuan dasar produk
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
              className="w-full max-w-md h-full bg-white text-slate-900 shadow-2xl flex flex-col border-l border-slate-200 select-text drawer-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: ID Barang, Nama Barang, Tombol Tutup / Batal */}
              <div className="flex items-start justify-between p-6 pb-5 border-b border-slate-100 shrink-0">
                <div className="pr-3 flex-1 min-w-0">
                  <span className="text-xs font-mono font-medium text-slate-400 block tracking-wide">
                    {detailProduct.idBarang}
                  </span>
                  {!isDrawerEditing ? (
                    <h3 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                      {p.nama}
                    </h3>
                  ) : (
                    <div className="mt-1">
                      <input
                        type="text"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Nama Produk..."
                        required
                        className="w-full px-3 py-1.5 font-bold text-base text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-[#F0090F]/20 focus:border-[#F0090F]"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (isDrawerEditing) {
                      setIsDrawerEditing(false);
                    } else {
                      setDetailProduct(null);
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shrink-0"
                >
                  {isDrawerEditing ? "Batal" : "Tutup"}
                </button>
              </div>

              {/* Body: Harga Produk di atas, lalu Info Properti & Tombol Edit */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                {/* 1. Section: Harga Produk */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      Harga Produk
                    </h4>
                    {isDrawerEditing && (
                      <button
                        type="button"
                        onClick={handleAddSatuanRow}
                        className="text-xs font-bold text-[#F0090F] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Satuan</span>
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    {!isDrawerEditing ? (
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Satuan</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Isi</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Harga</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Per {p.satuanDasar}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {p.satuanProduk.map((s) => {
                            const faktor = Number(s.faktorKeDasar) || 1;
                            const hargaPerDasar = Math.round(s.hargaJual / faktor);
                            return (
                              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 font-medium text-slate-900 capitalize">
                                  {s.namaSatuan}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                                  {formatDecimal(faktor)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {formatRupiah(s.hargaJual)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                                  {formatRupiah(hargaPerDasar)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className="py-2 px-2.5 font-semibold">Satuan</th>
                            <th className="py-2 px-1 font-semibold text-center">Isi</th>
                            <th className="py-2 px-2 font-semibold text-right">Harga</th>
                            <th className="py-2 px-1 font-semibold text-center w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {satuanList.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  required
                                  value={s.namaSatuan}
                                  onChange={(e) => {
                                    const u = [...satuanList];
                                    u[idx].namaSatuan = e.target.value;
                                    setSatuanList(u);
                                  }}
                                  placeholder="Satuan"
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F0090F]"
                                />
                              </td>
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min={0.001}
                                  required
                                  value={s.faktorKeDasar}
                                  onChange={(e) => {
                                    const u = [...satuanList];
                                    u[idx].faktorKeDasar = parseFloat(e.target.value || "1");
                                    setSatuanList(u);
                                  }}
                                  className="w-14 text-center px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#F0090F]"
                                />
                              </td>
                              <td className="py-2 px-2 text-right">
                                <div className="relative inline-block w-28">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none select-none">
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
                                    className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-[#F0090F]"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-1 text-center">
                                {satuanList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSatuanRow(idx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Hapus baris satuan ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* 2. Info List Properti Produk */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs font-medium">Kategori</span>
                    {!isDrawerEditing ? (
                      <span className="font-semibold text-slate-900 text-xs">
                        {p.kategori?.nama || "Umum"}
                      </span>
                    ) : (
                      <select
                        value={kategoriId}
                        onChange={(e) => setKategoriId(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#F0090F]"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs font-medium">Satuan</span>
                    <span className="font-semibold text-slate-900 text-xs capitalize">
                      {!isDrawerEditing
                        ? (defaultUnit?.namaSatuan || p.satuanDasar)
                        : (satuanList[0]?.namaSatuan || satuanDasar)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs font-medium">Satuan dasar</span>
                    {!isDrawerEditing ? (
                      <span className="font-semibold text-slate-900 text-xs capitalize">
                        {p.satuanDasar}
                      </span>
                    ) : (
                      <input
                        type="text"
                        required
                        value={satuanDasar}
                        onChange={(e) => setSatuanDasar(e.target.value)}
                        placeholder="Satuan dasar"
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 w-28 text-right focus:outline-none focus:border-[#F0090F]"
                      />
                    )}
                  </div>

                  {isDrawerEditing && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 text-xs font-medium">Barcode</span>
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Barcode (opsional)"
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono w-36 text-right focus:outline-none focus:border-[#F0090F]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs font-medium">Stok saat ini</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {formatDecimal(stok)} {p.satuanDasar}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs font-medium">Stok minimum</span>
                    {!isDrawerEditing ? (
                      <span className="font-semibold text-slate-900 text-xs">
                        {formatDecimal(min)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={stokMinimum}
                        onChange={(e) => setStokMinimum(Number(e.target.value))}
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 w-20 text-right focus:outline-none focus:border-[#F0090F]"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 text-xs font-medium">Status stok</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusColor}`}>
                      {statusStok}
                    </span>
                  </div>
                </div>

                {/* 3. Tombol Aksi */}
                {!isDrawerEditing ? (
                  <div className="pt-3">
                    <button
                      onClick={() => openEditInDrawer(p)}
                      className="w-full h-11 rounded-xl font-bold text-xs text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                      style={{ background: "var(--primary)" }}
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Ubah Data Produk Ini</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsDrawerEditing(false)}
                      className="flex-1 h-11 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center justify-center active:scale-95"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={savingInDrawer}
                      onClick={handleSaveFromDrawer}
                      className="flex-[2] h-11 rounded-xl font-bold text-xs text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      style={{ background: "var(--primary)" }}
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingInDrawer ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </button>
                  </div>
                )}
              </div>
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
                  <select
                    value={kategoriId}
                    onChange={(e) => setKategoriId(e.target.value)}
                    className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
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
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={stokMinimum}
                      onChange={(e) => setStokMinimum(parseFloat(e.target.value || "0"))}
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
                        <input
                          type="number"
                          step="any"
                          min={0.001}
                          required
                          value={s.faktorKeDasar}
                          onChange={(e) => {
                            const updated = [...satuanList];
                            updated[idx].faktorKeDasar = parseFloat(e.target.value || "1");
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
                alert(data.error || "Gagal menyimpan barcode");
                return;
              }
              setSuccess(`Barcode ${cleanCode} berhasil disimpan ke produk!`);
              setIsScannerOpen(false);
              setScannerRowProductId(null);
              fetchData();
            } catch (err: any) {
              alert(err.message || "Gagal menghubungi server");
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
    </div>
  );
}

function ProdukContent() {
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
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
