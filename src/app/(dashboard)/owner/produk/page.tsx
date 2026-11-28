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
  ChevronDown,
  ChevronRight,
  Layers,
  Split,
  Copy,
  History,
} from "lucide-react";
import { groupProductsForDisplay, formatPriceRange } from "@/lib/product-grouping";
import { parseScan } from "@/lib/barcode";
import { calculateMargin } from "@/lib/product-visibility";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";
import { VariantGroupFormModal, SplitProductModal } from "@/components/produk/ProductVariantModals";
import { formatRupiah, formatDecimal, formatDateTime } from "@/lib/formatters";
import { isRefillProduct } from "@/lib/refill";
import { formatProductCode } from "@/lib/codification";
import { downloadPriceListPdf, downloadPriceListCsv } from "@/lib/pdf-price-list";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { DataTable, DataTableContainer, DataTableHeader, DataTableHead, DataTableBody, DataTableEmpty } from "@/components/shared/DataTable";
import { TableSearchRow, TableFilterPills } from "@/components/shared/TableToolbar";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { HargaNaikModal } from "@/components/produk/HargaNaikModal";
import { ImportProdukModal } from "@/components/produk/ImportProdukModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface SatuanInput {
  id?: string;
  namaSatuan: string;
  faktorKeDasar: number;
  hargaJual: number;
  hargaBeli?: number;
  isDefault: boolean;
}

interface ProductItem {
  id: string;
  sku?: string | null;
  nama: string;
  groupId?: string | null;
  variantName?: string | null;
  group?: { id: string; nama: string; brand?: string | null; kategoriId?: string | null; kategori?: { id: string; nama: string } | null } | null;
  barcode: string | null;
  barcodes?: { id: string; code: string; source: string }[];
  satuanDasar: string;
  stokMinimum: string | number;
  stokCache: string | number;
  stokKosong?: string | number;
  isRefill?: boolean;
  aktif: boolean;
  hargaNaik?: boolean;
  penyesuaianHarga?: boolean;
  isBaru?: boolean;
  isDiperbarui?: boolean;
  kategori: { id: string; nama: string } | null;
  satuanProduk: {
    id: string;
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    hargaBeli?: number;
    isDefault: boolean;
  }[];
}

interface PriceHistoryItem {
  id: string;
  namaProduk: string;
  namaSatuan: string;
  jenisPerubahan: "HARGA_JUAL" | "HARGA_BELI" | string;
  hargaLama: number;
  hargaBaru: number;
  namaPengguna: string | null;
  keterangan: string | null;
  dibuatPada: string;
}

interface CategoryOption {
  id: string;
  nama: string;
}

interface UnitTemplate {
  id: string;
  label: string;
  satuanDasar: string;
  units: Array<{ namaSatuan: string; faktorKeDasar: number }>;
}

const UNIT_TEMPLATES: UnitTemplate[] = [
  {
    id: "pcs",
    label: "Pcs",
    satuanDasar: "pcs",
    units: [{ namaSatuan: "pcs", faktorKeDasar: 1 }],
  },
  {
    id: "pcs-pak-dus",
    label: "Pcs · Pak · Dus",
    satuanDasar: "pcs",
    units: [
      { namaSatuan: "pcs", faktorKeDasar: 1 },
      { namaSatuan: "pak", faktorKeDasar: 12 },
      { namaSatuan: "dus", faktorKeDasar: 24 },
    ],
  },
  {
    id: "sachet-renceng",
    label: "Sachet · Renceng",
    satuanDasar: "sachet",
    units: [
      { namaSatuan: "sachet", faktorKeDasar: 1 },
      { namaSatuan: "renceng", faktorKeDasar: 10 },
    ],
  },
  {
    id: "kg-eceran",
    label: "Kg · ½ · ¼",
    satuanDasar: "kg",
    units: [
      { namaSatuan: "kg", faktorKeDasar: 1 },
      { namaSatuan: "1/2 kg", faktorKeDasar: 0.5 },
      { namaSatuan: "1/4 kg", faktorKeDasar: 0.25 },
    ],
  },
  {
    id: "botol-dus",
    label: "Botol · Dus",
    satuanDasar: "botol",
    units: [
      { namaSatuan: "botol", faktorKeDasar: 1 },
      { namaSatuan: "dus", faktorKeDasar: 24 },
    ],
  },
  {
    id: "liter",
    label: "Liter · ½",
    satuanDasar: "liter",
    units: [
      { namaSatuan: "liter", faktorKeDasar: 1 },
      { namaSatuan: "1/2 liter", faktorKeDasar: 0.5 },
    ],
  },
];

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
  const [scannerTarget, setScannerTarget] = useState<"SEARCH" | "FORM" | "EXTRA_BARCODE" | "VARIANT_ROW">("FORM");
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [variantRows, setVariantRows] = useState<
    Array<{ nama: string; barcode: string; hargaJual: number; hargaBeli: number; stokAwal: number }>
  >([
    { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
    { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
  ]);
  const [variantScanIdx, setVariantScanIdx] = useState<number | null>(null);
  const [userAccess, setUserAccess] = useState<{ role: string; permissions?: string[] } | null>(null);
  const [costMeta, setCostMeta] = useState<{
    hargaBeliAktif: boolean;
    canViewHargaBeli: boolean;
    showCost: boolean;
  }>({ hargaBeliAktif: false, canViewHargaBeli: false, showCost: false });
  const [togglingHargaBeli, setTogglingHargaBeli] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [newExtraBarcode, setNewExtraBarcode] = useState("");
  const [addingExtraBarcode, setAddingExtraBarcode] = useState(false);
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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [scannerRowProductId, setScannerRowProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<{ product: ProductItem; idBarang: string } | null>(null);
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [savingInDrawer, setSavingInDrawer] = useState(false);
  const [nama, setNama] = useState("");
  const [sku, setSku] = useState("");
  const [kategoriId, setKategoriId] = useState<string>("");
  const [barcode, setBarcode] = useState("");
  const [satuanDasar, setSatuanDasar] = useState("kg");
  const [stokMinimum, setStokMinimum] = useState<number>(0);
  const [stokKosong, setStokKosong] = useState<number>(0);
  const [isRefill, setIsRefill] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [isVariantGroupOpen, setIsVariantGroupOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<ProductItem | null>(null);
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
      if (selectedKategori && !selectedKategori.startsWith("__")) {
        params.set("kategoriId", selectedKategori);
      }

      const [pRes, cRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        fetch("/api/categories"),
      ]);

      const pData = await pRes.json();
      const cData = await cRes.json();

      if (pRes.ok) {
        setProducts(pData.products || []);
        if (pData.meta) setCostMeta(pData.meta);
      }
      if (cRes.ok) setCategories(cData.categories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUserAccess(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!detailProduct?.product?.id) {
      setPriceHistory([]);
      return;
    }
    setLoadingPriceHistory(true);
    fetch(`/api/products/${detailProduct.product.id}/price-history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.history)) {
          setPriceHistory(data.history);
        } else {
          setPriceHistory([]);
        }
      })
      .catch(() => setPriceHistory([]))
      .finally(() => setLoadingPriceHistory(false));
  }, [detailProduct?.product?.id, costMeta.showCost]);

  const handleToggleHargaBeli = async () => {
    if (togglingHargaBeli) return;
    setTogglingHargaBeli(true);
    setError(null);
    try {
      const next = !costMeta.hargaBeliAktif;
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktifkanHargaBeli: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah pengaturan harga beli");
      setSuccess(data.message);
      setIsDownloadMenuOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah pengaturan harga beli");
    } finally {
      setTogglingHargaBeli(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData();
  }, [searchQuery, selectedKategori]);

  const openCreateModal = () => {
    setEditingProductId(null);
    setIsMultiVariant(false);
    setVariantRows([
      { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
      { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
    ]);
    setVariantScanIdx(null);
    setNama("");
    setSku("");
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
    setSku(p.sku || "");
    setKategoriId(p.kategori?.id || "");
    setBarcode(p.barcode || "");
    setSatuanDasar(p.satuanDasar);
    setStokMinimum(Number(p.stokMinimum));
    setStokKosong(Number(p.stokKosong || 0));
    setIsRefill(p.isRefill ?? isRefillProduct(p.nama));
    setSatuanList(
      p.satuanProduk.map((s) => ({
        id: s.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli ?? 0,
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
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        kategoriId: kategoriId || null,
        barcode: barcode.trim() || null,
        satuanDasar: satuanDasar.trim(),
        stokMinimum: Number(stokMinimum) || 0,
        isRefill,
        ...(isRefill ? { stokKosong: Number(stokKosong) || 0 } : {}),
        satuanList: satuanList.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          namaSatuan: s.namaSatuan,
          faktorKeDasar: Number(s.faktorKeDasar),
          hargaJual: Number(s.hargaJual) || 0,
          ...(costMeta.showCost ? { hargaBeli: Number(s.hargaBeli) || 0 } : {}),
          isDefault: Boolean(s.isDefault),
        })),
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
        setDetailProduct({ product: data.product, idBarang: data.product.sku || detailProduct.idBarang });
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
    setSku(p.sku || "");
    setKategoriId(p.kategori?.id || "");
    setBarcode(p.barcode || "");
    setSatuanDasar(p.satuanDasar);
    setStokMinimum(Number(p.stokMinimum));
    setStokKosong(Number(p.stokKosong || 0));
    setIsRefill(p.isRefill ?? isRefillProduct(p.nama));
    setSatuanList(
      p.satuanProduk.map((s) => ({
        id: s.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaJual: s.hargaJual,
        hargaBeli: s.hargaBeli ?? 0,
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

  const applyUnitTemplate = (tpl: UnitTemplate) => {
    const baseRow =
      satuanList.find((s) => Number(s.faktorKeDasar) === 1) || satuanList[0];
    const baseHargaJual = baseRow ? Number(baseRow.hargaJual) || 0 : 0;
    const baseHargaBeli = baseRow ? Number(baseRow.hargaBeli) || 0 : 0;

    setSatuanDasar(tpl.satuanDasar);
    setSatuanList(
      tpl.units.map((u, idx) => {
        const existing = satuanList.find(
          (s) => s.namaSatuan.trim().toLowerCase() === u.namaSatuan.toLowerCase()
        );
        return {
          namaSatuan: u.namaSatuan,
          faktorKeDasar: u.faktorKeDasar,
          hargaJual: existing
            ? existing.hargaJual
            : baseHargaJual > 0
            ? Math.round(baseHargaJual * u.faktorKeDasar)
            : 0,
          hargaBeli: existing
            ? existing.hargaBeli
            : baseHargaBeli > 0
            ? Math.round(baseHargaBeli * u.faktorKeDasar)
            : 0,
          isDefault: idx === 0,
        };
      })
    );
  };

  const renderUnitTemplates = () => (
    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
      {UNIT_TEMPLATES.map((tpl) => {
        const isActive =
          satuanDasar.trim().toLowerCase() === tpl.satuanDasar.toLowerCase() &&
          satuanList.length === tpl.units.length &&
          tpl.units.every(
            (u, i) =>
              satuanList[i]?.namaSatuan.trim().toLowerCase() === u.namaSatuan.toLowerCase() &&
              Number(satuanList[i]?.faktorKeDasar) === u.faktorKeDasar
          );
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => applyUnitTemplate(tpl)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium text-center truncate transition-colors cursor-pointer ${
              isActive
                ? "bg-slate-900 text-white"
                : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            {tpl.label}
          </button>
        );
      })}
    </div>
  );

  const renderEditableUnitTable = () => (
    <table className="w-full text-left text-xs border-collapse">
      <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
        <tr className="divide-x divide-slate-200">
          <th className="py-2 px-2.5 font-semibold">Satuan</th>
          <th className="py-2 px-1.5 font-semibold text-center w-16">
            Isi ({satuanDasar || "pcs"})
          </th>
          {costMeta.showCost && (
            <th className="py-2 px-2.5 font-semibold text-right">Beli</th>
          )}
          <th className="py-2 px-2.5 font-semibold text-right">Jual</th>
          <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">
            {costMeta.showCost ? "Margin" : `Per ${satuanDasar || "pcs"}`}
          </th>
          {satuanList.length > 1 && <th className="py-2 px-1 w-7"></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 text-slate-600">
        {satuanList.map((s, idx) => {
          const faktor = Number(s.faktorKeDasar) || 1;
          const perDasar = Math.round((Number(s.hargaJual) || 0) / faktor);
          const margin = calculateMargin(Number(s.hargaJual) || 0, Number(s.hargaBeli ?? 0));
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
                  className="w-full h-9 px-2 bg-transparent text-xs font-medium text-slate-900 focus:outline-none focus:bg-blue-50/40"
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
                  className="w-full h-9 text-center px-1.5 bg-transparent text-xs font-mono text-slate-900 focus:outline-none focus:bg-blue-50/40"
                />
              </td>
              {costMeta.showCost && (
                <td className="p-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={s.hargaBeli ? s.hargaBeli.toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const updated = [...satuanList];
                      updated[idx].hargaBeli = digits ? parseInt(digits, 10) : 0;
                      setSatuanList(updated);
                    }}
                    className="w-full h-9 px-2 bg-transparent text-xs font-medium text-right text-slate-700 focus:outline-none focus:bg-blue-50/40 tabular-nums"
                  />
                </td>
              )}
              <td className="p-0">
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
                  className="w-full h-9 px-2 bg-transparent text-xs font-semibold text-right text-slate-900 focus:outline-none focus:bg-blue-50/40 tabular-nums"
                />
              </td>
              <td className="py-2 px-2 text-right text-[11px] whitespace-nowrap tabular-nums">
                {costMeta.showCost ? (
                  <span
                    className={`font-semibold ${
                      margin.nominal >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {margin.percent !== null ? `${margin.percent}%` : formatRupiah(margin.nominal)}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-700">{formatRupiah(perDasar)}</span>/
                    {satuanDasar || "pcs"}
                  </span>
                )}
              </td>
              {satuanList.length > 1 && (
                <td className="p-0 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveSatuanRow(idx)}
                    className="w-full h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer focus:outline-none"
                    title="Hapus baris satuan ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

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

    if (!editingProductId && isMultiVariant) {
      const filledRows = variantRows.filter(
        (r) =>
          r.nama.trim() !== "" ||
          r.barcode.trim() !== "" ||
          r.hargaJual > 0 ||
          r.stokAwal > 0
      );

      if (filledRows.length === 0) {
        setError("Minimal isi 1 baris varian produk");
        setSubmitting(false);
        return;
      }

      for (let i = 0; i < filledRows.length; i++) {
        if (!filledRows[i].nama.trim()) {
          setError(`Nama produk pada baris #${i + 1} wajib diisi`);
          setSubmitting(false);
          return;
        }
      }

      const groupName = nama.trim();
      if (groupName.length < 2) {
        setError("Nama induk / merek produk minimal 2 karakter");
        setSubmitting(false);
        return;
      }

      try {
        const cleanSatuan = satuanDasar.trim() || "pcs";
        const res = await fetch("/api/product-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama: groupName,
            kategoriId: kategoriId || null,
            variants: filledRows.map((r) => ({
              variantName: r.nama.trim(),
              barcode: r.barcode.trim() || null,
              satuanDasar: cleanSatuan,
              stokMinimum: Number(stokMinimum) || 0,
              stokAwal: Number(r.stokAwal) || 0,
              satuanList: [
                {
                  namaSatuan: cleanSatuan,
                  faktorKeDasar: 1,
                  hargaJual: Number(r.hargaJual) || 0,
                  ...(costMeta.showCost ? { hargaBeli: Number(r.hargaBeli) || 0 } : {}),
                  isDefault: true,
                },
              ],
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menyimpan varian produk");

        setSuccess(data.message || `${filledRows.length} varian "${groupName}" berhasil disimpan`);
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        nama,
        kategoriId: kategoriId || null,
        barcode: barcode.trim() || null,
        satuanDasar,
        stokMinimum: Number(stokMinimum),
        satuanList: satuanList.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          namaSatuan: s.namaSatuan,
          faktorKeDasar: Number(s.faktorKeDasar),
          hargaJual: Number(s.hargaJual) || 0,
          ...(costMeta.showCost ? { hargaBeli: Number(s.hargaBeli) || 0 } : {}),
          isDefault: Boolean(s.isDefault),
        })),
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

  const handleDuplicate = async (p: ProductItem) => {
    if (duplicatingId) return;
    setDuplicatingId(p.id);
    setError("");
    try {
      const res = await fetch(`/api/products/${p.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menduplikat produk");

      setSuccess(data.message || `Produk "${p.nama}" berhasil diduplikat dengan SKU baru`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Gagal menduplikat produk");
    } finally {
      setDuplicatingId(null);
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

  const hargaNaikCount = products.filter((p) => p.hargaNaik).length;
  const penyesuaianHargaCount = products.filter((p) => p.penyesuaianHarga).length;
  const updatedOrNewCount = products.filter((p) => p.isBaru || p.isDiperbarui).length;

  const canManageProduct = !userAccess || hasPermission(userAccess, "produk:manage");
  const canEditPrice =
    !userAccess || hasAnyPermission(userAccess, ["produk:manage", "produk:price", "satuan:manage"]);
  const canToggleCost =
    userAccess?.role === "OWNER" || (userAccess ? hasPermission(userAccess, "settings:manage") : false);

  const filteredProducts = products.filter((p) => {
    if (selectedKategori === "__HARGA_NAIK__" && !p.hargaNaik) return false;
    if (selectedKategori === "__PENYESUAIAN_HARGA__" && !p.penyesuaianHarga) return false;
    if (selectedKategori === "__UPDATED__" && !p.isBaru && !p.isDiperbarui) return false;
    const qLower = searchQuery.trim().toLowerCase();
    if (qLower) {
      const matchName = p.nama.toLowerCase().includes(qLower);
      const matchSku = (p.sku || "").toLowerCase().includes(qLower);
      const matchBarcode =
        (p.barcode || "").toLowerCase().includes(qLower) ||
        Boolean(p.barcodes?.some((b) => b.code.toLowerCase().includes(qLower)));
      const matchVariant = (p.variantName || "").toLowerCase().includes(qLower);
      const matchGroup = (p.group?.nama || "").toLowerCase().includes(qLower);
      if (!matchName && !matchSku && !matchBarcode && !matchVariant && !matchGroup) return false;
    }
    const stok = Number(p.stokCache);
    const min = Number(p.stokMinimum);
    if (filterStok === "HABIS") return stok <= 0;
    if (filterStok === "MENIPIS") return stok > 0 && stok <= min;
    if (filterStok === "TANPA_BARCODE") return !p.barcode;
    return true;
  });

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
              {costMeta.showCost
                ? "Kelola produk sembako, SKU, multi-satuan, harga jual/beli, dan stok minimum."
                : "Kelola produk sembako, SKU, multi-satuan, harga jual, dan ketersediaan stok."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManageProduct && (
              <button
                onClick={openCreateModal}
                className="h-10 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <span className="hidden sm:inline">Tambah produk</span>
                <span className="sm:hidden">Tambah</span>
              </button>
            )}
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                className="h-10 w-10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 active:scale-95 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Menu lainnya"
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
                  <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-lg py-1.5 z-40">
                    {canManageProduct && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDownloadMenuOpen(false);
                            setIsVariantGroupOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-violet-600" />
                          <span>Tambah Produk Bervarian</span>
                        </button>
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
                      </>
                    )}
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
                        downloadPriceListCsv(products, costMeta.showCost);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download Excel (.csv)</span>
                    </button>
                    {(canManageProduct || canToggleCost) && (
                      <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                    )}
                    {canManageProduct && (
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
                    )}
                    {canToggleCost && (
                      <button
                        type="button"
                        disabled={togglingHargaBeli}
                        onClick={handleToggleHargaBeli}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span>Pencatatan Harga Beli</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            costMeta.hargaBeliAktif
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {togglingHargaBeli ? "..." : costMeta.hargaBeliAktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search bar compact + Reload ujung kanan */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, SKU, atau barcode"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-6 pr-6 h-9 bg-transparent border-b border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="h-8 w-8 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>

        {/* Category pills horizontal scroll */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {[
            { value: "", label: "Semua", count: products.length, accent: "default" as const },
            ...(hargaNaikCount > 0
              ? [{ value: "__HARGA_NAIK__", label: "Harga Naik", count: hargaNaikCount, accent: "amber" as const }]
              : []),
            ...(penyesuaianHargaCount > 0
              ? [{ value: "__PENYESUAIAN_HARGA__", label: "Penyesuaian Harga", count: penyesuaianHargaCount, accent: "violet" as const }]
              : []),
            ...(updatedOrNewCount > 0
              ? [{ value: "__UPDATED__", label: "Baru / Update", count: updatedOrNewCount, accent: "blue" as const }]
              : []),
            ...categories.map((c) => ({
              value: c.id,
              label: c.nama,
              count: products.filter((p) => p.kategori?.id === c.id).length,
              accent: "default" as const,
            })),
          ].map((cat) => {
            const isSelected = selectedKategori === cat.value;
            const pillStyle = isSelected
              ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-zinc-900"
              : cat.accent === "amber"
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
              : cat.accent === "violet"
              ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/50"
              : cat.accent === "blue"
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-400 dark:hover:border-zinc-500 hover:text-slate-900 dark:hover:text-white";
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setSelectedKategori(cat.value);
                  setCurrentPage(1);
                }}
                className={`shrink-0 px-3.5 h-8 rounded-full border whitespace-nowrap transition-all cursor-pointer focus:outline-none text-xs font-medium inline-flex items-center gap-1.5 ${pillStyle}`}
              >
                {cat.accent === "amber" && <TrendingUp className="w-3.5 h-3.5 shrink-0" />}
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span className={`text-[10px] tabular-nums ${
                    isSelected
                      ? "text-white/70 dark:text-zinc-900/60"
                      : cat.accent === "amber"
                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                      : cat.accent === "violet"
                      ? "text-violet-600 dark:text-violet-400 font-semibold"
                      : cat.accent === "blue"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-400 dark:text-zinc-500"
                  }`}>{cat.count}</span>
                )}
              </button>
            );
          })}
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
          <div className="flex items-center gap-3 shrink-0 pl-4 pb-px">
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5 text-[11px] bg-slate-50 dark:bg-zinc-800/50">
              <button
                type="button"
                onClick={() => {
                  setViewMode("grouped");
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  viewMode === "grouped"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Dikelompokkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("flat");
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  viewMode === "flat"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Per varian
              </button>
            </div>
            {!loading && (
              <span className="hidden sm:inline text-slate-400 dark:text-zinc-500 text-[11px] tabular-nums">
                {Math.min(currentPage * pageSize, filteredProducts.length)} dari {filteredProducts.length} produk
              </span>
            )}
          </div>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tabel Produk Minimalist (Scrollable Internal, Sticky Header) */}
      <DataTableContainer>
        <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>SKU</DataTableHead>
                <DataTableHead>Nama Produk</DataTableHead>
                <DataTableHead>Kategori</DataTableHead>
                {costMeta.showCost && <DataTableHead align="right">Harga Beli</DataTableHead>}
                <DataTableHead align="right">Harga Jual</DataTableHead>
                <DataTableHead align="right">Stok</DataTableHead>
                <DataTableHead align="center">Aksi</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {loading ? (
                <TableSkeletonRows rows={8} cols={costMeta.showCost ? 7 : 6} />
              ) : filteredProducts.length === 0 ? (
                <DataTableEmpty colSpan={costMeta.showCost ? 7 : 6}>
                  Tidak ada produk yang cocok.
                </DataTableEmpty>
              ) : (
                (() => {
                  const renderProductRow = (
                    p: ProductItem,
                    idBarang: string,
                    isVariantChild = false
                  ) => {
                    const stok = Number(p.stokCache);
                    const min = Number(p.stokMinimum);
                    const isHabis = stok <= 0;
                    const isMenipis = stok > 0 && stok <= min;
                    const isLowStock = stok <= min;

                    const satuanEceran = p.satuanProduk.reduce((prev, cur) =>
                      Number(cur.faktorKeDasar) <= Number(prev.faktorKeDasar) ? cur : prev,
                      p.satuanProduk[0]
                    );
                    const satuanGrosir = p.satuanProduk.length > 1
                      ? p.satuanProduk.reduce((prev, cur) =>
                          Number(cur.faktorKeDasar) > Number(prev.faktorKeDasar) ? cur : prev,
                          p.satuanProduk[0]
                        )
                      : null;
                    const hargaEceran = satuanEceran?.hargaJual || 0;
                    const hargaBeliEceran = satuanEceran?.hargaBeli;
                    const margin = calculateMargin(hargaEceran, hargaBeliEceran);
                    const konversiStokDisplay = satuanGrosir && Number(satuanGrosir.faktorKeDasar) > 1
                      ? Math.floor(stok / Number(satuanGrosir.faktorKeDasar))
                      : null;
                    const displaySku = p.sku || idBarang;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors duration-150 ${
                          isVariantChild
                            ? "bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                            : "hover:bg-slate-50/90 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <td className="py-3.5 pr-4 whitespace-nowrap">
                          <span className={`text-xs font-mono text-slate-500 dark:text-zinc-400 ${isVariantChild ? "pl-4" : ""}`}>
                            {displaySku}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[180px]">
                          <div className={`flex items-center gap-1.5 flex-wrap ${isVariantChild ? "pl-4" : ""}`}>
                            <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-tight">
                              {isVariantChild && p.variantName ? p.variantName : p.nama}
                            </span>
                            {!isVariantChild && p.variantName && (
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-semibold">
                                {p.variantName}
                              </span>
                            )}
                            {p.barcode && isVariantChild && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {p.barcode}
                              </span>
                            )}
                            {p.hargaNaik && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold whitespace-nowrap">
                                <TrendingUp className="w-2.5 h-2.5" />
                                <span>Harga Naik</span>
                              </span>
                            )}
                            {p.penyesuaianHarga && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 text-[10px] font-bold whitespace-nowrap">
                                Penyesuaian Harga
                              </span>
                            )}
                            {p.isBaru && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold whitespace-nowrap">
                                Baru
                              </span>
                            )}
                            {!p.isBaru && p.isDiperbarui && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold whitespace-nowrap">
                                Update
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-zinc-300">
                            {p.kategori?.nama || <span className="text-slate-400 italic">Umum</span>}
                          </span>
                        </td>
                        {costMeta.showCost && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                                {typeof hargaBeliEceran === "number" ? formatRupiah(hargaBeliEceran) : "-"}
                              </span>
                              {typeof hargaBeliEceran === "number" && hargaBeliEceran > 0 && (
                                <span
                                  className={`text-[10px] font-semibold tabular-nums ${
                                    margin.nominal >= 0 ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {margin.nominal >= 0 ? "+" : ""}
                                  {formatRupiah(margin.nominal)}
                                  {margin.percent !== null ? ` (${margin.percent}%)` : ""}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                              {formatRupiah(hargaEceran)}
                            </span>
                            {satuanGrosir && (
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {satuanGrosir.namaSatuan}: {formatRupiah(satuanGrosir.hargaJual)}
                              </span>
                            )}
                          </div>
                        </td>
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
                              {(p.isRefill ?? isRefillProduct(p.nama)) ? `Terisi: ${formatDecimal(stok)}` : formatDecimal(stok)}
                            </span>
                          </div>
                          {(p.isRefill ?? isRefillProduct(p.nama)) && (
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5 space-y-0.5">
                              <div>
                                Kosong: <span className="font-semibold text-slate-600 dark:text-zinc-300">{formatDecimal(Number(p.stokKosong ?? 0))}</span>
                              </div>
                              <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                Total: {formatDecimal(stok + Number(p.stokKosong ?? 0))} Stok
                              </div>
                            </div>
                          )}
                          {konversiStokDisplay !== null && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              ≈ {konversiStokDisplay} {satuanGrosir?.namaSatuan}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => setDetailProduct({ product: p, idBarang: displaySku })}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                              title="Detail produk"
                              aria-label="Detail produk"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {canEditPrice && (
                              <button
                                onClick={() => {
                                  setDetailProduct({ product: p, idBarang: displaySku });
                                  openEditInDrawer(p);
                                }}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                title="Edit produk & harga"
                                aria-label="Edit produk"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canManageProduct && (
                              <>
                                <button
                                  onClick={() => handleDuplicate(p)}
                                  disabled={duplicatingId === p.id}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-40"
                                  title="Duplikat produk dengan SKU baru"
                                  aria-label="Duplikat produk"
                                >
                                  <Copy className={`w-3.5 h-3.5 ${duplicatingId === p.id ? "animate-pulse" : ""}`} />
                                </button>
                                <button
                                  onClick={() => handleDelete(p)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                  title="Hapus produk"
                                  aria-label="Hapus produk"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  };

                  if (viewMode === "flat") {
                    return filteredProducts
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((p, idx) => {
                        const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                        return renderProductRow(p, formatProductCode(p.kategori?.nama, globalIdx), false);
                      });
                  }

                  const grouped = groupProductsForDisplay(filteredProducts);
                  const pagedGroups = grouped.slice(
                    (currentPage - 1) * pageSize,
                    currentPage * pageSize
                  );

                  return pagedGroups.flatMap((entry, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                    if (entry.type === "standalone") {
                      return [
                        renderProductRow(
                          entry.product,
                          formatProductCode(entry.product.kategori?.nama, globalIdx),
                          false
                        ),
                      ];
                    }

                    const isExpanded = Boolean(expandedGroupIds[entry.group.id]);
                    const catName =
                      entry.group.kategori?.nama ||
                      entry.variants[0]?.kategori?.nama ||
                      "Umum";

                    const parentRow = (
                      <tr
                        key={`group-${entry.group.id}`}
                        onClick={() =>
                          setExpandedGroupIds((prev) => ({
                            ...prev,
                            [entry.group.id]: !prev[entry.group.id],
                          }))
                        }
                        className="hover:bg-slate-50/90 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 pr-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-zinc-400">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            GRP-{String(globalIdx).padStart(3, "0")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[180px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                              {entry.group.nama}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
                              {entry.variantCount} varian
                            </span>
                            {entry.hasLowStock && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-bold">
                                {entry.hasOutOfStock ? "Ada yg habis" : "Stok menipis"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                          {catName}
                        </td>
                        {costMeta.showCost && (() => {
                          const buyPrices = entry.variants
                            .map((v) => {
                              const def =
                                v.satuanProduk.find((s) => s.isDefault) || v.satuanProduk[0];
                              return def?.hargaBeli;
                            })
                            .filter((n): n is number => typeof n === "number");
                          const minBuy = buyPrices.length ? Math.min(...buyPrices) : 0;
                          const maxBuy = buyPrices.length ? Math.max(...buyPrices) : 0;
                          return (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs text-slate-600 tabular-nums">
                              {buyPrices.length > 0 ? formatPriceRange(minBuy, maxBuy) : "-"}
                            </td>
                          );
                        })()}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm tabular-nums">
                            {formatPriceRange(entry.minPrice, entry.maxPrice)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                            {formatDecimal(entry.totalStok)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            className="h-7 px-2.5 rounded-lg font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            {isExpanded ? "Tutup" : "Lihat varian"}
                          </button>
                        </td>
                      </tr>
                    );

                    if (!isExpanded) return [parentRow];

                    const childRows = entry.variants.map((v, vIdx) =>
                      renderProductRow(
                        v,
                        formatProductCode(v.kategori?.nama, vIdx + 1),
                        true
                      )
                    );
                    return [parentRow, ...childRows];
                  });
                })()
              )}
            </DataTableBody>
          </DataTable>
      </DataTableContainer>

      {products.length > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
          <span className="text-xs text-slate-500 dark:text-zinc-400 tabular-nums pr-1">
            Total <strong className="text-slate-800 dark:text-zinc-200">{filteredProducts.length.toLocaleString("id-ID")}</strong> produk · {pageSize}/hal
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
                {/* 1. SKU & Barcode */}
                {isDrawerEditing && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 text-xs">SKU</span>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Otomatis (PRD-...)"
                      className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 font-mono w-36 text-right focus:outline-none focus:border-slate-900"
                    />
                  </div>
                )}
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
                        className="text-xs font-semibold text-[#F0090F] hover:underline flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    )}
                  </div>

                  {isDrawerEditing && renderUnitTemplates()}

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    {!isDrawerEditing ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                          <tr className="divide-x divide-slate-200">
                            <th className="py-2 px-3 font-semibold">Satuan</th>
                            <th className="py-2 px-2 font-semibold text-center">Isi</th>
                            {costMeta.showCost && (
                              <th className="py-2 px-2.5 font-semibold text-right">Beli</th>
                            )}
                            <th className="py-2 px-2.5 font-semibold text-right">Jual</th>
                            <th className="py-2 px-2.5 font-semibold text-right">
                              {costMeta.showCost ? "Margin" : `Per ${p.satuanDasar}`}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-600">
                          {p.satuanProduk.map((s) => {
                            const faktor = Number(s.faktorKeDasar) || 1;
                            const hargaPerDasar = Math.round(s.hargaJual / faktor);
                            const margin = calculateMargin(s.hargaJual, s.hargaBeli);
                            return (
                              <tr key={s.id} className="divide-x divide-slate-200">
                                <td className="py-2 px-3 font-medium text-slate-900 capitalize">
                                  {s.namaSatuan}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-600 font-mono">
                                  {formatDecimal(faktor)}
                                </td>
                                {costMeta.showCost && (
                                  <td className="py-2 px-2.5 text-right text-slate-600 whitespace-nowrap tabular-nums">
                                    {typeof s.hargaBeli === "number" ? formatRupiah(s.hargaBeli) : "-"}
                                  </td>
                                )}
                                <td className="py-2 px-2.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                                  {formatRupiah(s.hargaJual)}
                                </td>
                                <td className="py-2 px-2.5 text-right whitespace-nowrap tabular-nums">
                                  {costMeta.showCost ? (
                                    <span
                                      className={`font-semibold ${
                                        margin.nominal >= 0 ? "text-emerald-600" : "text-rose-600"
                                      }`}
                                    >
                                      {margin.percent !== null
                                        ? `${margin.percent}%`
                                        : formatRupiah(margin.nominal)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">{formatRupiah(hargaPerDasar)}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      renderEditableUnitTable()
                    )}
                  </div>
                </div>

                {/* 3. Info List Properti Produk (Stok saat ini, Stok minimum, Satuan, Satuan dasar, Kategori, Status stok) */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Mode Isi Ulang (Galon)</span>
                    {isDrawerEditing ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isRefill}
                        onClick={() => setIsRefill(!isRefill)}
                        className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                          isRefill ? "bg-blue-500" : "bg-slate-200 dark:bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                            isRefill ? "translate-x-4.5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          (p.isRefill ?? isRefillProduct(p.nama))
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {(p.isRefill ?? isRefillProduct(p.nama)) ? "Aktif" : "Nonaktif"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">
                      {(isDrawerEditing ? isRefill : (p.isRefill ?? isRefillProduct(p.nama))) ? "Stok terisi" : "Stok saat ini"}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs text-right">
                      {formatDecimal(stok)} {p.satuanDasar}
                    </span>
                  </div>

                  {(isDrawerEditing ? isRefill : (p.isRefill ?? isRefillProduct(p.nama))) && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-slate-400 text-xs">Stok kosong</span>
                        {!isDrawerEditing ? (
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xs text-right">
                            {formatDecimal(Number(p.stokKosong ?? 0))} {p.satuanDasar}
                          </span>
                        ) : (
                          <NumberInput
                            min={0}
                            emptyFallback={0}
                            value={stokKosong}
                            onChange={setStokKosong}
                            className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 w-20 text-right focus:outline-none focus:border-slate-900 dark:focus:border-zinc-300"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-slate-400 text-xs">Total stok (Terisi + Kosong)</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs text-right tabular-nums">
                          {formatDecimal(stok + (isDrawerEditing ? Number(stokKosong) || 0 : Number(p.stokKosong ?? 0)))} {p.satuanDasar}
                        </span>
                      </div>
                    </>
                  )}

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

                {/* 2b. Daftar Semua Kode / Barcode Produk */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Daftar Kode / Barcode ({p.barcodes?.length || (p.barcode ? 1 : 0)})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {(p.barcodes && p.barcodes.length > 0
                      ? p.barcodes
                      : p.barcode
                      ? [{ id: "main", code: p.barcode, source: "manual" }]
                      : []
                    ).map((b) => {
                      const isPrimary = b.code === p.barcode;
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 truncate">
                              {b.code}
                            </span>
                            {isPrimary && (
                              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-bold shrink-0">
                                Utama
                              </span>
                            )}
                          </div>
                          {canManageProduct && b.id !== "main" && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await fetch(`/api/products/${p.id}/barcodes`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ barcodeId: b.id }),
                                    });
                                    const d = await res.json();
                                    if (!res.ok) {
                                      setError(d.error || "Gagal menjadikan utama");
                                      return;
                                    }
                                    if (d.product) setDetailProduct({ product: d.product, idBarang: detailProduct.idBarang });
                                    setSuccess(d.message);
                                    fetchData();
                                  }}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer"
                                >
                                  Jadikan Utama
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await fetch(`/api/products/${p.id}/barcodes?barcodeId=${encodeURIComponent(b.id)}`, {
                                    method: "DELETE",
                                  });
                                  const d = await res.json();
                                  if (!res.ok) {
                                    setError(d.error || "Gagal menghapus kode");
                                    return;
                                  }
                                  if (d.product) setDetailProduct({ product: d.product, idBarang: detailProduct.idBarang });
                                  setSuccess(d.message);
                                  fetchData();
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Hapus kode"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tambah kode tambahan (ketik atau scan) */}
                  {canManageProduct && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newExtraBarcode}
                        onChange={(e) => setNewExtraBarcode(e.target.value)}
                        placeholder="Tambah kode / barcode lain..."
                        className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                      />
                      <button
                        type="button"
                        disabled={addingExtraBarcode || !newExtraBarcode.trim()}
                        onClick={async () => {
                          const parsed = parseScan(newExtraBarcode);
                          const codeToAdd = parsed.type === "product" ? parsed.code : newExtraBarcode.trim();
                          const srcToAdd = parsed.type === "product" ? parsed.source : "manual";
                          setAddingExtraBarcode(true);
                          try {
                            const res = await fetch(`/api/products/${p.id}/barcodes`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ code: codeToAdd, source: srcToAdd }),
                            });
                            const d = await res.json();
                            if (!res.ok) {
                              setError(d.error || "Gagal menambahkan kode");
                              return;
                            }
                            if (d.product) setDetailProduct({ product: d.product, idBarang: detailProduct.idBarang });
                            setNewExtraBarcode("");
                            setSuccess(d.message);
                            fetchData();
                          } finally {
                            setAddingExtraBarcode(false);
                          }
                        }}
                        className="h-8 px-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Tambah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget("EXTRA_BARCODE");
                          setIsScannerOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Scan kode tambahan"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2c. Riwayat Perubahan Harga */}
                {!isDrawerEditing && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        <span>Riwayat Perubahan Harga ({priceHistory.length})</span>
                      </span>
                    </div>
                    {loadingPriceHistory ? (
                      <p className="text-xs text-slate-400">Memuat riwayat harga...</p>
                    ) : priceHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada perubahan harga tercatat.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {priceHistory.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    h.jenisPerubahan === "HARGA_BELI"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {h.jenisPerubahan === "HARGA_BELI" ? "Harga Beli" : "Harga Jual"}
                                </span>
                                <span className="font-medium text-slate-700 dark:text-zinc-200 capitalize">
                                  {h.namaSatuan}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {formatDateTime(h.dibuatPada)}
                                {h.namaPengguna ? ` · ${h.namaPengguna}` : ""}
                              </div>
                            </div>
                            <div className="text-right whitespace-nowrap shrink-0 tabular-nums">
                              <span className="text-slate-400 line-through text-[11px] mr-1.5">
                                {formatRupiah(h.hargaLama)}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-zinc-100">
                                {formatRupiah(h.hargaBaru)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tombol Aksi (Detail/Read menampilkan Pecah Varian jika belum berkelompok; Edit menampilkan Batal + Simpan) */}
                {!isDrawerEditing && !p.groupId && canManageProduct && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSplitTarget(p)}
                      className="w-full h-10 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/70 dark:bg-violet-950/30 hover:bg-violet-100/70 text-violet-700 dark:text-violet-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Pecah produk jadi beberapa varian</span>
                    </button>
                  </div>
                )}
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
            className={`w-full ${!editingProductId && isMultiVariant ? "max-w-lg" : "max-w-md"} h-full bg-white text-slate-900 shadow-xl flex flex-col border-l border-slate-100 select-text drawer-panel transition-all`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Minimalist */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="pr-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[11px] font-mono text-slate-400 tracking-wider">
                    {editingProductId ? "EDIT PRODUK" : "PRODUK BARU"}
                  </span>
                  {!editingProductId && (
                    <div className="inline-flex items-center gap-3 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setIsMultiVariant(false)}
                        className={`pb-0.5 transition-colors cursor-pointer ${
                          !isMultiVariant
                            ? "text-slate-900 border-b border-slate-900"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        1 Produk
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMultiVariant(true)}
                        className={`pb-0.5 transition-colors cursor-pointer ${
                          isMultiVariant
                            ? "text-slate-900 border-b border-slate-900"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        Multi Varian
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder={isMultiVariant ? "Nama Produk / Merek..." : "Nama Produk..."}
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
              {!editingProductId && isMultiVariant ? (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Daftar Produk
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setVariantRows((prev) => [
                          ...prev,
                          { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
                        ])
                      }
                      className="text-xs font-semibold text-[#F0090F] hover:underline flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah baris</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="text-slate-500 border-b border-slate-200 bg-slate-50/70">
                        <tr className="divide-x divide-slate-200">
                          <th className="py-2 px-2.5 font-semibold">Nama</th>
                          <th className="py-2 px-2.5 font-semibold w-28">Barcode</th>
                          {costMeta.showCost && (
                            <th className="py-2 px-2 font-semibold text-right w-20">Beli</th>
                          )}
                          <th className="py-2 px-2 font-semibold text-right w-20">Jual</th>
                          <th className="py-2 px-2 font-semibold text-right w-14">Stok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {variantRows.map((row, idx) => (
                          <tr key={idx} className="group divide-x divide-slate-200">
                            <td className="p-0">
                              <input
                                type="text"
                                value={row.nama}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVariantRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, nama: val } : r))
                                  );
                                }}
                                placeholder="Nama produk..."
                                className="w-full h-9 px-2.5 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-blue-50/30"
                              />
                            </td>
                            <td className="p-0 relative">
                              <div className="flex items-center h-9">
                                <input
                                  type="text"
                                  value={row.barcode}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setVariantRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, barcode: val } : r))
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (idx === variantRows.length - 1) {
                                        setVariantRows((prev) => [
                                          ...prev,
                                          { nama: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
                                        ]);
                                      }
                                    }
                                  }}
                                  placeholder="scan barcode"
                                  className="w-full h-full px-2 bg-transparent text-xs font-mono text-slate-900 placeholder:text-rose-500/80 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-rose-500 focus:bg-rose-50/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVariantScanIdx(idx);
                                    setScannerTarget("VARIANT_ROW");
                                    setIsScannerOpen(true);
                                  }}
                                  className="absolute right-1 p-1 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                  title="Scan kamera"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            {costMeta.showCost && (
                              <td className="p-0">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={row.hargaBeli ? row.hargaBeli.toLocaleString("id-ID") : ""}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "");
                                    const num = digits ? parseInt(digits, 10) : 0;
                                    setVariantRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, hargaBeli: num } : r))
                                    );
                                  }}
                                  className="w-full h-9 px-2 bg-transparent text-xs font-medium text-right text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-blue-50/30 tabular-nums"
                                />
                              </td>
                            )}
                            <td className="p-0">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={row.hargaJual ? row.hargaJual.toLocaleString("id-ID") : ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  const num = digits ? parseInt(digits, 10) : 0;
                                  setVariantRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, hargaJual: num } : r))
                                  );
                                }}
                                className="w-full h-9 px-2 bg-transparent text-xs font-semibold text-right text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-blue-50/30 tabular-nums"
                              />
                            </td>
                            <td className="p-0 relative">
                              <NumberInput
                                min={0}
                                emptyFallback={0}
                                value={row.stokAwal}
                                onChange={(val) =>
                                  setVariantRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, stokAwal: val } : r))
                                  )
                                }
                                className="w-full h-9 px-2.5 bg-transparent text-xs font-semibold text-right text-slate-900 focus:outline-none focus:bg-blue-50/30 tabular-nums"
                              />
                              {variantRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantRows((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Hapus baris"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
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
                        className="text-xs font-semibold text-[#F0090F] hover:underline flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>

                {renderUnitTemplates()}

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  {renderEditableUnitTable()}
                </div>
              </div>
                </>
              )}

              {/* 3. Info List Properti Produk (SKU, Stok minimum, Satuan, Satuan dasar, Kategori) */}
              <div className="divide-y divide-slate-100">
                {!isMultiVariant && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">SKU</span>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Otomatis (PRD-...)"
                      className="text-xs font-medium py-0.5 bg-transparent border-b border-slate-200 text-slate-900 font-mono w-36 text-right focus:outline-none focus:border-slate-900"
                    />
                  </div>
                )}
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

                {!isMultiVariant && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-400 text-xs">Satuan</span>
                    <span className="font-medium text-slate-900 text-xs capitalize text-right">
                      {satuanList[0]?.namaSatuan || satuanDasar}
                    </span>
                  </div>
                )}

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
                  <span>
                    {submitting
                      ? "Menyimpan..."
                      : !editingProductId && isMultiVariant
                      ? `Simpan ${variantRows.filter((r) => r.nama.trim()).length || variantRows.length} Varian`
                      : "Simpan Produk"}
                  </span>
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
          } else if (scannerTarget === "EXTRA_BARCODE" && detailProduct) {
            setIsScannerOpen(false);
            const parsed = parseScan(cleanCode);
            if (parsed.type === "ignore") return;
            try {
              const res = await fetch(`/api/products/${detailProduct.product.id}/barcodes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: parsed.code, source: parsed.source }),
              });
              const d = await res.json();
              if (!res.ok) {
                setError(d.error || "Gagal menambahkan kode");
                return;
              }
              if (d.product) setDetailProduct({ product: d.product, idBarang: detailProduct.idBarang });
              setSuccess(d.message);
              fetchData();
            } catch (err: any) {
              setError(err?.message || "Gagal menambahkan kode");
            }
          } else if (scannerTarget === "VARIANT_ROW" && variantScanIdx !== null) {
            const parsed = parseScan(cleanCode);
            const finalCode = parsed.type === "product" ? parsed.code : cleanCode;
            setVariantRows((prev) =>
              prev.map((r, i) => (i === variantScanIdx ? { ...r, barcode: finalCode } : r))
            );
            setVariantScanIdx(null);
            setIsScannerOpen(false);
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
                setSearchQuery("");
                setDetailProduct({
                  product: exactMatch,
                  idBarang: formatProductCode(exactMatch.kategori?.nama, 1),
                });
                setSuccess(`Produk ditemukan: ${exactMatch.nama}`);
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
              setError(`Gagal mencari barcode "${cleanCode}"`);
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
                    setReplaceBarcodeTarget(null);
                    setUnregisteredBarcode(null);
                    setSearchQuery("");
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
            setReplaceBarcodeTarget(null);
            setUnregisteredBarcode(null);
            setSearchQuery("");
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
        showHargaBeli={costMeta.showCost}
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

      <VariantGroupFormModal
        isOpen={isVariantGroupOpen}
        onClose={() => setIsVariantGroupOpen(false)}
        categories={categories}
        showHargaBeli={costMeta.showCost}
        onSuccess={(msg) => {
          setSuccess(msg);
          fetchData();
        }}
      />

      <SplitProductModal
        product={splitTarget}
        categories={categories}
        showHargaBeli={costMeta.showCost}
        onClose={() => setSplitTarget(null)}
        onSuccess={(msg) => {
          setSuccess(msg);
          setDetailProduct(null);
          fetchData();
        }}
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
