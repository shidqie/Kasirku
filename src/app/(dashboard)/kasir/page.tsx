"use client";

import { useEffect, useState, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  UserCheck,
  QrCode,
  X,
  ChevronDown,
  ShoppingBag,
  Barcode,
  Receipt,
  History,
  Star,
  Coffee,
  Utensils,
  Sparkles,
  CupSoda,
  Cigarette,
  SprayCan,
  Pill,
  PencilRuler,
  Wheat,
  CookingPot,
  CakeSlice,
  Package,
  Maximize2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { formatRupiah, formatDecimal, generateUUID } from "@/lib/formatters";
import { KasirGridSkeleton } from "@/components/shared/Skeleton";
import {
  convertStaticQrisToDynamic,
  extractQrisMerchantName,
  isValidQrisPayload,
} from "@/lib/qris";
import { StrukModal } from "@/components/kasir/StrukModal";
import { BuktiTransaksiUploader } from "@/components/shared/BuktiTransaksiUploader";
import { PinModal } from "@/components/shared/PinModal";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { RiwayatPesananModal } from "@/components/kasir/RiwayatPesananModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { NumberInput } from "@/components/shared/NumberInput";
import { useToast } from "@/components/shared/ToastProvider";

interface SatuanItem {
  id: string;
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
  stokCache: number;
  hargaNaik?: boolean;
  kategori?: { id: string; nama: string } | null;
  satuanProduk: SatuanItem[];
}

interface CartItem {
  produkId: string;
  nama: string;
  satuanDasar: string;
  satuanProdukId: string;
  namaSatuan: string;
  hargaJual: number;
  qty: number;
  availableSatuan: SatuanItem[];
  stokCache: number;
  hargaNaik?: boolean;
  note?: string;
}

interface MemberOption {
  id: string;
  nama: string;
  telepon: string | null;
  batasKasbon: number;
  saldoUtangCache: number;
}

// Soft pastel card color palette
const CARD_PALETTES = [
  { bg: "#F0FDF4", text: "#166534" }, // soft green
  { bg: "#EFF6FF", text: "#0369A1" }, // soft blue
  { bg: "#FDF2F8", text: "#9D174D" }, // soft pink
  { bg: "#F5F3FF", text: "#5B21B6" }, // soft purple
  { bg: "#FFF7ED", text: "#9A3412" }, // soft orange
  { bg: "#ECFEFF", text: "#0E7490" }, // soft cyan/teal
  { bg: "#FEFCE8", text: "#854D0E" }, // soft yellow
  { bg: "#FFF1F2", text: "#991B1B" }, // soft rose
  { bg: "#F7FEE7", text: "#3F6212" }, // soft lime
  { bg: "#EEF2FF", text: "#3730A3" }, // soft indigo
  { bg: "#FAF5FF", text: "#6B21A8" }, // soft lavender
  { bg: "#FEF2F2", text: "#B91C1C" }, // soft red
];

const CATEGORY_PALETTES: Record<string, { bg: string; text: string }> = {
  Rokok: { bg: "#F0FDF4", text: "#166534" },
  "Minuman Dingin": { bg: "#EFF6FF", text: "#0369A1" },
  "Minuman Sachet": { bg: "#FFF7ED", text: "#9A3412" },
  "Mie & Makanan": { bg: "#FDF2F8", text: "#9D174D" },
  Sembako: { bg: "#F0FDF4", text: "#166534" },
  "Beras & Biji": { bg: "#F7FEE7", text: "#3F6212" },
  "Bumbu & Saus": { bg: "#FFF5F5", text: "#991B1B" },
  "Bumbu Dapur": { bg: "#FEFCE8", text: "#854D0E" },
  "Bahan Kue": { bg: "#FFF7ED", text: "#9A3412" },
  "Obat & Kesehatan": { bg: "#ECFEFF", text: "#0E7490" },
  "Perawatan Diri": { bg: "#FFF1F2", text: "#991B1B" },
  "Pembersih & Pewangi": { bg: "#F5F3FF", text: "#5B21B6" },
  "ATK & Perkakas": { bg: "#EEF2FF", text: "#3730A3" },
  "Tisu & Plastik": { bg: "#ECFEFF", text: "#155E75" },
};

function getCategoryPalette(categoryName?: string | null): { bg: string; text: string } {
  if (categoryName && CATEGORY_PALETTES[categoryName]) {
    return CATEGORY_PALETTES[categoryName];
  }
  if (!categoryName) {
    return CARD_PALETTES[0];
  }
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CARD_PALETTES.length;
  return CARD_PALETTES[index];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Minuman Sachet": Coffee,
  "Minuman Dingin": CupSoda,
  Rokok: Cigarette,
  "Perawatan Diri": Sparkles,
  "Pembersih & Pewangi": SprayCan,
  "Obat & Kesehatan": Pill,
  "ATK & Perkakas": PencilRuler,
  Sembako: Wheat,
  "Bumbu & Saus": CookingPot,
  "Bahan Kue": CakeSlice,
  "Mie & Makanan": Utensils,
  "Tisu & Plastik": Package,
};

function CategoryIcon({
  kategori,
  className,
}: {
  kategori?: string | null;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[kategori ?? ""] ?? Package;
  return <Icon className={className} strokeWidth={1.75} />;
}

function QtyStepperInput({
  value,
  onCommit,
  widthClass = "w-9",
}: {
  value: number;
  onCommit: (nextQty: number) => void;
  widthClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    setEditing(false);
    const normalized = draft.replace(",", ".").trim();
    if (!normalized) return;
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed !== value) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label="Jumlah barang"
      value={editing ? draft : formatDecimal(value)}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        setEditing(true);
        setDraft(String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9.,]/g, "");
        setDraft(cleaned);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setEditing(false);
          e.currentTarget.blur();
        }
      }}
      className={`${widthClass} text-xs font-bold text-slate-900 dark:text-zinc-100 text-center tabular-nums bg-transparent focus:bg-slate-100 dark:focus:bg-zinc-700 rounded-md focus:outline-none py-0.5`}
    />
  );
}

export default function KasirPOSPage() {
  const toast = useToast();
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>({
    namaToko: "Toko Sembako",
    pembulatan: "BULAT_0",
    batasDiskonStaff: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [diskonPersen, setDiskonPersen] = useState<number>(0);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [kasbonMemberSearch, setKasbonMemberSearch] = useState("");

  const [configProduct, setConfigProduct] = useState<ProductItem | null>(null);
  const [configSatuanId, setConfigSatuanId] = useState<string>("");
  const [configQty, setConfigQty] = useState<number>(1);
  const [configNote, setConfigNote] = useState<string>("");

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<"TUNAI" | "TRANSFER" | "KASBON">("TUNAI");
  const [qrisMode, setQrisMode] = useState<"DINAMIS" | "STATIS">("DINAMIS");
  const [qrisDataUrl, setQrisDataUrl] = useState<string | null>(null);
  const [isQrisZoomed, setIsQrisZoomed] = useState(false);
  const [isQuickQrisOpen, setIsQuickQrisOpen] = useState(false);
  const [quickQrisAmount, setQuickQrisAmount] = useState<number>(0);
  const [quickQrisConfirmed, setQuickQrisConfirmed] = useState(false);
  const [quickQrisSecondsLeft, setQuickQrisSecondsLeft] = useState<number>(60);
  const [quickQrisDataUrl, setQuickQrisDataUrl] = useState<string | null>(null);
  const [quickQrisBuktiKey, setQuickQrisBuktiKey] = useState<string | null>(null);
  const [quickQrisSaving, setQuickQrisSaving] = useState(false);
  const [transferBuktiKey, setTransferBuktiKey] = useState<string | null>(null);
  const [refillStatus, setRefillStatus] = useState<"PENDING" | "SUDAH" | "BELUM">("PENDING");
  const [uangDiterima, setUangDiterima] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completedTrx, setCompletedTrx] = useState<any>(null);
  const [isStrukOpen, setIsStrukOpen] = useState(false);
  const [isRiwayatOpen, setIsRiwayatOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [cachedPinOwner, setCachedPinOwner] = useState<string | undefined>();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Modal Hubungkan Barcode Baru ke Barang yang Sudah Ada
  const [unregisteredBarcode, setUnregisteredBarcode] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const initTransactionSession = () => setIdempotencyKey(generateUUID());

  const loadInitialData = async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/settings"),
      ]);

      const pData = await pRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();

      if (pRes.ok) setProducts(pData.products || []);
      if (cRes.ok) setCategories(cData.categories || []);
      if (sRes.ok) {
        const loadedSettings = sData.settings || {};
        setStoreInfo(loadedSettings);
        if (loadedSettings.qrisModeDefault === "STATIS" || loadedSettings.qrisModeDefault === "DINAMIS") {
          setQrisMode(loadedSettings.qrisModeDefault);
        }
      }

      const mRes = await fetch("/api/members");
      if (mRes.ok) {
        const mData = await mRes.json();
        setMembers(mData.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    initTransactionSession();
  }, []);

  // State Produk Favorit (tersimpan di browser)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kasir_favorite_product_ids");
        if (saved) {
          setFavoriteIds(JSON.parse(saved));
        } else if (products.length > 0) {
          // Default: 8 produk teratas sebagai favorit awal
          const defaultFavs = products.slice(0, 8).map((p) => p.id);
          setFavoriteIds(defaultFavs);
          localStorage.setItem("kasir_favorite_product_ids", JSON.stringify(defaultFavs));
        }
      } catch {}
    }
  }, [products.length]);

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      if (typeof window !== "undefined") {
        localStorage.setItem("kasir_favorite_product_ids", JSON.stringify(next));
      }
      return next;
    });
  };

  const hargaNaikCount = products.filter((p) => p.hargaNaik).length;

  const filteredProducts = products.filter((p) => {
    let matchCat = false;
    if (selectedCategory === "Semua" || !selectedCategory) {
      matchCat = true;
    } else if (selectedCategory === "Favorit") {
      matchCat = favoriteIds.includes(p.id);
    } else if (selectedCategory === "Harga Naik") {
      matchCat = Boolean(p.hargaNaik);
    } else {
      matchCat = (p as any).kategori?.nama === selectedCategory;
    }

    const matchQuery =
      !searchQuery ||
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchCat && matchQuery;
  });

  const openProductConfig = (p: ProductItem) => {
    const def = p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
    setConfigProduct(p);
    setConfigSatuanId(def?.id || "");
    setConfigQty(1);
    setConfigNote("");
  };

  // Helper untuk menghitung total kuantitas produk dalam satuan dasar yang sudah ada di keranjang
  const getProductCartQtyInBaseUnit = (cartList: CartItem[], produkId: string, excludeIndex?: number) => {
    return cartList
      .filter((item, idx) => item.produkId === produkId && (excludeIndex === undefined || idx !== excludeIndex))
      .reduce((sum, item) => {
        const sat = item.availableSatuan?.find((s) => s.id === item.satuanProdukId);
        const faktor = sat?.faktorKeDasar ? Number(sat.faktorKeDasar) : 1;
        return sum + item.qty * faktor;
      }, 0);
  };

  const handleQuickAdd = (e: React.MouseEvent, p: ProductItem) => {
    e.stopPropagation();
    if (p.satuanProduk && p.satuanProduk.length > 1) {
      openProductConfig(p);
      return;
    }
    const def = p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
    if (!def) return;

    const faktor = def.faktorKeDasar ? Number(def.faktorKeDasar) : 1;
    const currentBaseInCart = getProductCartQtyInBaseUnit(cart, p.id);
    const stokTersedia = Number(p.stokCache);

    // Jika stok pas atau sudah melebihi, jangan tambahkan lagi
    if (currentBaseInCart + faktor > stokTersedia) {
      return;
    }

    const existingIdx = cart.findIndex(
      (c) => c.produkId === p.id && c.satuanProdukId === def.id && !c.note
    );

    if (existingIdx >= 0) {
      updateCartQty(existingIdx, cart[existingIdx].qty + 1);
    } else {
      setCart((prev) => [
        ...prev,
        {
          produkId: p.id,
          nama: p.nama,
          satuanDasar: p.satuanDasar,
          satuanProdukId: def.id,
          namaSatuan: def.namaSatuan,
          hargaJual: def.hargaJual,
          qty: 1,
          availableSatuan: p.satuanProduk,
          stokCache: stokTersedia,
          hargaNaik: p.hargaNaik,
        },
      ]);
    }
  };

  const handleAddConfiguredProduct = () => {
    if (!configProduct) return;
    const s = configProduct.satuanProduk.find((sat) => sat.id === configSatuanId) || configProduct.satuanProduk[0];
    const faktor = s?.faktorKeDasar ? Number(s.faktorKeDasar) : 1;
    const stokTersedia = Number(configProduct.stokCache);

    const existingIdx = cart.findIndex(
      (c) => c.produkId === configProduct.id && c.satuanProdukId === s.id && c.note === configNote
    );

    const otherUsedBase = getProductCartQtyInBaseUnit(cart, configProduct.id, existingIdx >= 0 ? existingIdx : undefined);
    const remainingBase = Math.max(0, stokTersedia - otherUsedBase);
    const maxAllowedQty = remainingBase / faktor;

    const currentQtyInExisting = existingIdx >= 0 ? cart[existingIdx].qty : 0;
    const targetQty = currentQtyInExisting + configQty;

    if (targetQty > maxAllowedQty) {
      const sisaBisaDitambah = Math.max(0, maxAllowedQty - currentQtyInExisting);
      toast.error(`Stok tidak mencukupi. Sisa stok yang bisa ditambahkan: ${Math.floor(sisaBisaDitambah)} ${s.namaSatuan}`);
      return;
    }

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].qty = Math.round(targetQty * 1000) / 1000;
      setCart(updated);
    } else {
      setCart((prev) => [
        ...prev,
        {
          produkId: configProduct.id,
          nama: configProduct.nama,
          satuanDasar: configProduct.satuanDasar,
          satuanProdukId: s.id,
          namaSatuan: s.namaSatuan,
          hargaJual: s.hargaJual,
          qty: configQty,
          availableSatuan: configProduct.satuanProduk,
          stokCache: stokTersedia,
          hargaNaik: configProduct.hargaNaik,
          note: configNote,
        },
      ]);
    }
    setConfigProduct(null);
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const updateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) { removeFromCart(index); return; }
    const item = cart[index];
    if (!item) return;

    const sat = item.availableSatuan?.find((s) => s.id === item.satuanProdukId);
    const faktor = sat?.faktorKeDasar ? Number(sat.faktorKeDasar) : 1;
    const otherUsedBase = getProductCartQtyInBaseUnit(cart, item.produkId, index);
    const remainingBase = Math.max(0, item.stokCache - otherUsedBase);
    const maxAllowedQty = remainingBase / faktor;

    // Batasi kuantitas agar tidak pernah melebihi stok yang ada
    let finalQty = newQty;
    if (newQty > maxAllowedQty) {
      finalQty = maxAllowedQty;
    }

    if (finalQty <= 0) {
      removeFromCart(index);
      return;
    }

    const updated = [...cart];
    updated[index].qty = Math.round(finalQty * 1000) / 1000;
    setCart(updated);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    // Cari produk dengan barcode persis
    const found = products.find((p) => p.barcode && p.barcode.trim() === clean);

    if (found) {
      const def = found.satuanProduk.find((s) => s.isDefault) || found.satuanProduk[0];
      const faktor = def?.faktorKeDasar ? Number(def.faktorKeDasar) : 1;
      const usedBase = getProductCartQtyInBaseUnit(cart, found.id);
      const stokTersedia = Number(found.stokCache);

      if (usedBase + faktor > stokTersedia) {
        toast.error(`Stok produk ${found.nama} sudah pas/maksimal di keranjang (${stokTersedia} ${found.satuanDasar}).`);
        return;
      }

      const existingIdx = cart.findIndex(
        (c) => c.produkId === found.id && c.satuanProdukId === def?.id
      );

      if (existingIdx >= 0) {
        updateCartQty(existingIdx, cart[existingIdx].qty + 1);
      } else {
        setCart((prev) => [
          ...prev,
          {
            produkId: found.id,
            nama: found.nama,
            satuanDasar: found.satuanDasar,
            satuanProdukId: def?.id || "",
            namaSatuan: def?.namaSatuan || found.satuanDasar,
            hargaJual: def?.hargaJual || 0,
            qty: 1,
            availableSatuan: found.satuanProduk,
            stokCache: stokTersedia,
          },
        ]);
      }
      setIsScannerOpen(false);
      setSearchQuery("");
    } else {
      // Barcode belum terdaftar -> Buka dialog untuk langsung daftarkan ke produk yang sudah ada!
      setIsScannerOpen(false);
      setUnregisteredBarcode(clean);
      setAssignSearch("");
    }
  };

  const handleAssignBarcodeToProduct = async (productToAssign: ProductItem) => {
    if (!unregisteredBarcode) return;
    try {
      setIsAssigning(true);
      const res = await fetch(`/api/products/${productToAssign.id}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: unregisteredBarcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mendaftarkan barcode ke barang ini");
        return;
      }

      // Update produk lokal
      setProducts((prev) =>
        prev.map((p) => (p.id === productToAssign.id ? { ...p, barcode: unregisteredBarcode } : p))
      );

      // Otomatis masukkan barang ini ke keranjang belanja kasir!
      const def = productToAssign.satuanProduk.find((s) => s.isDefault) || productToAssign.satuanProduk[0];
      const existingIdx = cart.findIndex(
        (c) => c.produkId === productToAssign.id && c.satuanProdukId === def?.id
      );

      if (existingIdx >= 0) {
        const updated = [...cart];
        updated[existingIdx].qty += 1;
        setCart(updated);
      } else {
        setCart((prev) => [
          ...prev,
          {
            produkId: productToAssign.id,
            nama: productToAssign.nama,
            satuanDasar: productToAssign.satuanDasar,
            satuanProdukId: def?.id || "",
            namaSatuan: def?.namaSatuan || productToAssign.satuanDasar,
            hargaJual: def?.hargaJual || 0,
            qty: 1,
            availableSatuan: productToAssign.satuanProduk,
            stokCache: productToAssign.stokCache,
          },
        ]);
      }

      const assignedBarcode = unregisteredBarcode;
      setUnregisteredBarcode(null);
      toast.success(`Barcode ${assignedBarcode} berhasil didaftarkan ke "${productToAssign.nama}" dan ditambahkan ke keranjang.`);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghubungkan barcode");
    } finally {
      setIsAssigning(false);
    }
  };

  const clearCart = () => {
    if (cart.length > 0) {
      setIsClearCartConfirmOpen(true);
    }
  };

  const confirmClearCart = () => {
    setCart([]);
    setDiskonPersen(0);
    setUangDiterima(0);
    setSelectedMember(null);
    initTransactionSession();
    setIsClearCartConfirmOpen(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + Math.round(item.qty * item.hargaJual), 0);
  const diskonNominal = Math.round((subtotal * diskonPersen) / 100);
  const subtotalSetelahDiskon = Math.max(0, subtotal - diskonNominal);

  const hitungPembulatan = (val: number, aturan: string) => {
    if (aturan === "BULAT_100") {
      const sisa = val % 100;
      return sisa === 0 ? 0 : sisa >= 50 ? 100 - sisa : -sisa;
    }
    if (aturan === "BULAT_500") {
      const sisa = val % 500;
      return sisa === 0 ? 0 : sisa >= 250 ? 500 - sisa : -sisa;
    }
    return 0;
  };

  const pembulatan = hitungPembulatan(subtotalSetelahDiskon, storeInfo.pembulatan || "BULAT_0");
  const grandTotal = subtotalSetelahDiskon + pembulatan;
  const kembalian = uangDiterima >= grandTotal ? uangDiterima - grandTotal : 0;
  const isUangKurang = metodeBayar === "TUNAI" && uangDiterima < grandTotal;

  useEffect(() => {
    let active = true;
    const rawPayload = storeInfo?.qrisPayload;
    if (!isPayModalOpen || metodeBayar !== "TRANSFER") {
      setQrisDataUrl(null);
      return;
    }

    const generateFromPayload = async (payloadStr: string) => {
      const targetPayload =
        qrisMode === "DINAMIS"
          ? convertStaticQrisToDynamic(payloadStr, grandTotal)
          : payloadStr.trim();

      const url = await QRCode.toDataURL(targetPayload, {
        width: 560,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
      if (active) setQrisDataUrl(url);
    };

    if (isValidQrisPayload(rawPayload)) {
      generateFromPayload(rawPayload).catch(() => {
        if (active) setQrisDataUrl(null);
      });
    } else if (storeInfo?.qrisStaticImage) {
      // Fallback: jika baru foto QRIS yang tersimpan tanpa string payload, decode otomatis dari gambar
      (async () => {
        const tempId = `kasir-qris-decode-${Date.now()}`;
        const tempEl = document.createElement("div");
        tempEl.id = tempId;
        tempEl.style.display = "none";
        document.body.appendChild(tempEl);
        try {
          const blobRes = await fetch(storeInfo.qrisStaticImage);
          const blob = await blobRes.blob();
          const file = new File([blob], "qris.jpg", { type: blob.type || "image/jpeg" });
          const { Html5Qrcode } = await import("html5-qrcode");
          const scanner = new Html5Qrcode(tempId);
          const decoded = await scanner.scanFile(file, false);
          scanner.clear();
          if (decoded && isValidQrisPayload(decoded) && active) {
            setStoreInfo((prev: any) => ({ ...prev, qrisPayload: decoded.trim() }));
            await generateFromPayload(decoded.trim());
            return;
          }
        } catch {
          // ignore
        } finally {
          tempEl.remove();
        }
        if (active) setQrisDataUrl(null);
      })();
    } else {
      setQrisDataUrl(null);
    }

    return () => {
      active = false;
    };
  }, [isPayModalOpen, metodeBayar, qrisMode, grandTotal, storeInfo?.qrisPayload, storeInfo?.qrisStaticImage]);

  useEffect(() => {
    let active = true;
    const rawPayload = storeInfo?.qrisPayload;
    if (!isQuickQrisOpen || !quickQrisConfirmed || quickQrisAmount <= 0 || !isValidQrisPayload(rawPayload)) {
      setQuickQrisDataUrl(null);
      return;
    }

    const dynamicPayload = convertStaticQrisToDynamic(rawPayload, quickQrisAmount);
    QRCode.toDataURL(dynamicPayload, {
      width: 560,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setQuickQrisDataUrl(url);
      })
      .catch(() => {
        if (active) setQuickQrisDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [isQuickQrisOpen, quickQrisConfirmed, quickQrisAmount, storeInfo?.qrisPayload]);

  useEffect(() => {
    if (!isQuickQrisOpen || !quickQrisConfirmed) return;

    const timer = setInterval(() => {
      setQuickQrisSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQuickQrisOpen, quickQrisConfirmed]);

  const handleSaveQuickQris = async () => {
    if (!quickQrisBuktiKey || quickQrisAmount <= 0) return;
    setQuickQrisSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/quick-qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: quickQrisAmount,
          buktiKey: quickQrisBuktiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan transaksi Quick QRIS");

      setCompletedTrx(data.transaksi);
      setIsQuickQrisOpen(false);
      setQuickQrisConfirmed(false);
      setQuickQrisAmount(0);
      setQuickQrisBuktiKey(null);
      setQuickQrisSecondsLeft(60);
      setIsStrukOpen(true);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan transaksi Quick QRIS");
    } finally {
      setQuickQrisSaving(false);
    }
  };

  const refillItems = cart.filter((it) => /\b(galon|gas|lpg|elpiji)\b/i.test(it.nama));

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setUangDiterima(grandTotal);
    setRefillStatus("PENDING");
    setError(null);
    setIsPayModalOpen(true);
  };

  const handleCheckout = async (pin?: string) => {
    if (cart.length === 0) return;
    if (refillItems.length > 0 && refillStatus === "PENDING") {
      setError("Harap konfirmasi apakah tabung gas / galon kosong sudah dikembalikan.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        idempotencyKey,
        memberId: metodeBayar === "KASBON" || selectedMember ? selectedMember?.id : null,
        items: cart.map((it) => ({
          produkId: it.produkId,
          satuanProdukId: it.satuanProdukId,
          nama: it.nama,
          harga: Number(it.hargaJual),
          qty: Number(it.qty),
          subtotal: Math.round(Number(it.qty) * Number(it.hargaJual)),
        })),
        diskon: diskonNominal,
        metodePembayaran: metodeBayar,
        uangDiterima: metodeBayar === "TUNAI" ? uangDiterima : grandTotal,
        pinOwner: pin || cachedPinOwner,
        buktiKey: metodeBayar === "TRANSFER" ? transferBuktiKey : null,
        refillDikembalikan: refillItems.length > 0 ? refillStatus : null,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("PIN Pemilik")) {
          setIsPinModalOpen(true);
          setSubmitting(false);
          return;
        }
        throw new Error(data.error || "Gagal memproses transaksi");
      }

      const isOfflineTrx =
        Boolean(data?.isOfflineQueued) || res.headers.get("X-Offline-Queued") === "true";

      const completed = isOfflineTrx
        ? {
            ...data.transaksi,
            subtotal: data.transaksi?.subtotal || subtotal,
            diskon: data.transaksi?.diskon ?? diskonNominal,
            pembulatan: data.transaksi?.pembulatan ?? pembulatan,
            total: data.transaksi?.total || grandTotal,
            items: cart.map((it) => ({
              produkId: it.produkId,
              satuanProdukId: it.satuanProdukId,
              namaSnapshot: it.nama,
              satuanSnapshot: it.namaSatuan,
              qty: it.qty,
              hargaSatuan: it.hargaJual,
              hargaJualSnapshot: it.hargaJual,
              subtotal: Math.round(it.qty * it.hargaJual),
            })),
            pembayaran: [
              {
                metode: metodeBayar,
                jumlah: grandTotal,
                uangDiterima: metodeBayar === "TUNAI" ? uangDiterima : grandTotal,
                kembalian: metodeBayar === "TUNAI" ? kembalian : 0,
              },
            ],
            ...(selectedMember
              ? { member: { id: selectedMember.id, nama: selectedMember.nama } }
              : {}),
          }
        : data.transaksi;

      setCompletedTrx(completed);
      setIsPayModalOpen(false);
      setIsMobileCartOpen(false);
      setIsStrukOpen(true);
      setCart([]);
      setTransferBuktiKey(null);
      setRefillStatus("PENDING");
      setDiskonPersen(0);
      setUangDiterima(0);
      setSelectedMember(null);
      setCachedPinOwner(undefined);
      initTransactionSession();
      loadInitialData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="absolute inset-0 flex overflow-hidden select-none bg-white dark:bg-zinc-950">

      {/* ═══ PANEL TENGAH: Produk grid ════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top bar: search + scan + category pills bar */}
        <div className="shrink-0 px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang atau scan barcode (tekan /)"
                className="w-full pl-10 pr-4 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-[14px] text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ "--tw-ring-color": "var(--primary)" } as any}
              />
            </div>
            {/* Button Quick QRIS Dinamis */}
            <button
              type="button"
              onClick={() => {
                setQuickQrisAmount(0);
                setQuickQrisConfirmed(false);
                setQuickQrisSecondsLeft(30);
                setIsQuickQrisOpen(true);
              }}
              className="h-11 px-3 sm:px-3.5 rounded-[14px] text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 shrink-0 transition-all hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 flex items-center gap-2 shadow-2xs cursor-pointer"
              title="Buat QRIS Dinamis Cepat"
            >
              <QrCode className="w-4 h-4 text-[#F0090F]" />
              <span className="hidden sm:inline">Quick QRIS</span>
            </button>
            {/* Button Riwayat Penjualan */}
            <button
              onClick={() => setIsRiwayatOpen(true)}
              className="h-11 px-3 sm:px-4 rounded-[14px] text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 shrink-0 transition-all hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 flex items-center gap-2 shadow-2xs"
              title="Buka Riwayat Penjualan & Transaksi"
            >
              <History className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
              <span className="hidden sm:inline">Riwayat Penjualan</span>
            </button>
            {/* Mobile Quick Scan Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="md:hidden h-11 w-11 rounded-[14px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 shrink-0 flex items-center justify-center active:scale-95"
              title="Scan barcode barang"
              aria-label="Scan barcode barang"
            >
              <Barcode className="w-4 h-4" />
            </button>
          </div>

          {/* Horizontal Minimalist Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
            {[
              "Semua",
              "Favorit",
              ...(hargaNaikCount > 0 ? ["Harga Naik"] : []),
              ...categories.map((c) => c.nama),
            ].map((cat) => {
              const isSelected = selectedCategory === cat;
              const isFav = cat === "Favorit";
              const isHargaNaik = cat === "Harga Naik";
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-8 px-3.5 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                      : isHargaNaik
                      ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                      : "bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {isFav && (
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "fill-amber-400 text-amber-400" : "fill-amber-400 text-amber-500"
                      }`}
                    />
                  )}
                  {isHargaNaik && <TrendingUp className="w-3.5 h-3.5" />}
                  <span>{cat}</span>
                  {isFav && favoriteIds.length > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {favoriteIds.length}
                    </span>
                  )}
                  {isHargaNaik && (
                    <span
                      className={`text-[10px] font-bold px-1.5 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                          : "bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      }`}
                    >
                      {hargaNaikCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loadingProducts ? (
            <KasirGridSkeleton count={12} />
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-zinc-600 gap-3 py-16">
              {selectedCategory === "Favorit" ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                    <Star className="w-6 h-6 fill-amber-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Belum ada produk favorit</p>
                  <p className="text-xs text-slate-400 max-w-xs text-center">
                    Klik ikon bintang (⭐) pada kartu produk untuk menambahkannya ke kategori Favorit.
                  </p>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-12 h-12 opacity-30" />
                  <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-24 md:pb-4">
              {filteredProducts.map((p) => {
                const Icon = CATEGORY_ICONS[p.kategori?.nama ?? ""] ?? Package;
                const defaultSatuan = p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
                const stok = Number(p.stokCache);
                const isHabis = stok <= 0;
                const inCart = cart.find((c) => c.produkId === p.id);
                const usedBase = getProductCartQtyInBaseUnit(cart, p.id);
                const isStokPas = usedBase >= stok;

                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={isHabis ? -1 : 0}
                    onClick={() => {
                      if (isHabis) return;
                      if (p.satuanProduk && p.satuanProduk.length > 1) {
                        openProductConfig(p);
                      } else {
                        if (isStokPas) return;
                        handleQuickAdd({ stopPropagation: () => {} } as any, p);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isHabis) return;
                        if (p.satuanProduk && p.satuanProduk.length > 1) {
                          openProductConfig(p);
                        } else if (!isStokPas) {
                          handleQuickAdd({ stopPropagation: () => {} } as any, p);
                        }
                      }
                    }}
                    className={`group relative text-left rounded-2xl p-3.5 transition-all duration-150 flex flex-col justify-between min-h-[132px] bg-white dark:bg-zinc-900 focus:outline-none ${
                      isHabis
                        ? "opacity-55 cursor-not-allowed border border-slate-200/70 dark:border-zinc-800"
                        : inCart
                        ? "border-2 bg-rose-50/20 dark:bg-rose-950/10 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                        : "border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                    }`}
                    style={
                      inCart && !isHabis
                        ? { borderColor: isStokPas ? "#d97706" : "var(--primary)" }
                        : undefined
                    }
                  >
                    {/* Top row: Minimalist icon + Harga Naik badge + Favorite star + In-cart badge */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon
                          className="w-5 h-5 shrink-0 text-slate-400 dark:text-zinc-500"
                          strokeWidth={1.6}
                        />
                        {p.hargaNaik && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold whitespace-nowrap"
                            title="Harga produk baru saja naik"
                          >
                            <TrendingUp className="w-2.5 h-2.5" />
                            <span>Harga Naik</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(p.id);
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            favoriteIds.includes(p.id)
                              ? "text-amber-500"
                              : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-500"
                          }`}
                          title={favoriteIds.includes(p.id) ? "Hapus dari Favorit" : "Tandai sebagai Favorit"}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              favoriteIds.includes(p.id) ? "fill-amber-400 text-amber-500" : ""
                            }`}
                          />
                        </button>

                        {inCart && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap ${
                              isStokPas ? "bg-amber-600" : ""
                            }`}
                            style={!isStokPas ? { background: "var(--primary)" } : {}}
                          >
                            {formatDecimal(inCart.qty)}
                            {isStokPas ? " Maks" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info Container */}
                    <div className="space-y-1">
                      {/* Name */}
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
                        {p.nama}
                      </p>

                      {/* Price */}
                      {(defaultSatuan?.hargaJual || 0) > 0 ? (
                        <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight tabular-nums">
                          {formatRupiah(defaultSatuan?.hargaJual || 0)}
                        </p>
                      ) : (
                        <p className="text-[11px] font-medium text-slate-400">
                          Harga belum diatur
                        </p>
                      )}

                      {/* Bottom row: Stock + Add/Stepper */}
                      <div className="flex items-center justify-between gap-1.5 pt-1.5">
                        {!inCart ? (
                          <>
                            <span
                              className={`text-[11px] font-medium ${
                                isHabis
                                  ? "text-rose-600 font-semibold"
                                  : "text-slate-400 dark:text-zinc-500"
                              }`}
                            >
                              {isHabis ? "Stok habis" : `Stok ${formatDecimal(stok)}`}
                            </span>

                            {!isHabis && !isStokPas && (defaultSatuan?.hargaJual || 0) > 0 && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickAdd(e, p)}
                                className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 hover:!bg-slate-900 dark:hover:!bg-white text-slate-600 dark:text-zinc-300 hover:!text-white dark:hover:!text-zinc-900 flex items-center justify-center border border-slate-200/90 dark:border-zinc-700 hover:!border-slate-900 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
                                title="Tambah ke keranjang"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                              Stok {formatDecimal(stok)}
                            </span>
                            <div
                              className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 rounded-full px-1 py-0.5 border border-slate-200/80 dark:border-zinc-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const cartIdx = cart.findIndex((c) => c.produkId === p.id);
                                  if (cartIdx >= 0) updateCartQty(cartIdx, cart[cartIdx].qty - 1);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-3 h-3 text-slate-700 dark:text-zinc-200" />
                              </button>
                              <QtyStepperInput
                                value={inCart.qty}
                                widthClass="w-8"
                                onCommit={(nextQty) => {
                                  const cartIdx = cart.findIndex((c) => c.produkId === p.id);
                                  if (cartIdx >= 0) updateCartQty(cartIdx, nextQty);
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const cartIdx = cart.findIndex((c) => c.produkId === p.id);
                                  if (cartIdx >= 0) updateCartQty(cartIdx, cart[cartIdx].qty + 1);
                                }}
                                disabled={isStokPas}
                                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                  isStokPas
                                    ? "text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-40"
                                    : "hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                                }`}
                                title={isStokPas ? "Stok sudah pas/maksimal" : "Tambah"}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MOBILE FLOATING CART BAR ════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {cart.reduce((s, i) => s + Number(i.qty || 0), 0)} item di keranjang
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums truncate">
            {formatRupiah(grandTotal)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="h-11 px-5 rounded-[14px] text-white font-bold text-xs flex items-center gap-2 shrink-0 active:scale-95 shadow-sm"
          style={{ background: "var(--primary)" }}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Keranjang &amp; Bayar</span>
        </button>
      </div>

      {/* ═══ PANEL KANAN: Cart + Pembayaran (Drawer di Mobile, Sidebar di Tablet/Desktop) ═══ */}
      <div
        className={`${
          isMobileCartOpen
            ? "fixed inset-0 z-40 flex"
            : "hidden"
        } md:static md:flex md:w-[300px] lg:w-[320px] xl:w-[340px] shrink-0 flex-col h-full bg-white dark:bg-zinc-900 md:border-l md:border-slate-200/80 dark:md:border-zinc-800`}
      >
        {/* Mobile Cart Header Close Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            Keranjang Belanja ({cart.length})
          </span>
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(false)}
            className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>
        {/* Cart header with Member Dropdown & Barcode Scanner Button */}
        <div className="px-4 pt-3.5 pb-3 shrink-0 border-b border-slate-100 dark:border-zinc-800 relative space-y-2.5">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Pelanggan
            </p>
            <button
              onClick={() => setIsCustomerModalOpen(!isCustomerModalOpen)}
              className="w-full h-11 px-3.5 rounded-[14px] border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-750 transition-colors flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                <span className="truncate">
                  {selectedMember ? selectedMember.nama : "Pelanggan Umum"}
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isCustomerModalOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Tombol Scan Barcode di Header Keranjang */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full h-11 px-3 rounded-[14px] bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700"
            title="Scan kemasan barang langsung dengan kamera"
          >
            <Barcode className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
            <span>Scan barcode barang</span>
          </button>

          {/* Member Selection DROPDOWN (Replacing Popup Modal) */}
          {isCustomerModalOpen && (() => {
            const query = customerSearchQuery.trim().toLowerCase();
            const filteredMembers = members.filter((m) => {
              if (!query) return true;
              const matchNama = m.nama.toLowerCase().includes(query);
              const matchTelp = m.telepon ? m.telepon.toLowerCase().includes(query) : false;
              return matchNama || matchTelp;
            });
            const showUmum = !query || "pembeli umum".includes(query) || "umum".includes(query);

            return (
              <div className="absolute left-3 right-3 top-[102%] z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-zinc-700 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Pilih Pelanggan</span>
                  <button
                    onClick={() => {
                      setIsCustomerModalOpen(false);
                      setCustomerSearchQuery("");
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Input Pencarian Pelanggan */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Cari nama member atau no HP..."
                    autoFocus
                    className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#F0090F]/20 focus:border-[#F0090F]"
                  />
                  {customerSearchQuery && (
                    <button
                      onClick={() => setCustomerSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {/* Opsi Pembeli Umum */}
                  {showUmum && (
                    <button
                      onClick={() => {
                        setSelectedMember(null);
                        setIsCustomerModalOpen(false);
                        setCustomerSearchQuery("");
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        !selectedMember
                          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                          : "border-slate-200/80 dark:border-zinc-700/80 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-zinc-100">Pembeli Umum</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Tanpa fasilitas utang kasbon</p>
                      </div>
                      {!selectedMember && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Dipilih</span>
                      )}
                    </button>
                  )}

                  {/* List Member */}
                  {filteredMembers.map((m) => {
                    const isSelected = selectedMember?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setIsCustomerModalOpen(false);
                          setCustomerSearchQuery("");
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                            : "border-slate-200/80 dark:border-zinc-700/80 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-zinc-100">{m.nama}</p>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                            {m.telepon ? `${m.telepon} · ` : ""}Utang: {formatRupiah(m.saldoUtangCache)} · Limit: {formatRupiah(m.batasKasbon)}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Dipilih</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Empty state bila tidak ada hasil */}
                  {!showUmum && filteredMembers.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Tidak ada pelanggan yang cocok</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Cart items — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-zinc-700">
              <ShoppingBag className="w-10 h-10" />
              <p className="text-xs font-medium">Keranjang kosong</p>
              <p className="text-[10px] text-center leading-relaxed">
                Pilih barang dari katalog untuk memulai transaksi
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
              {cart.map((item, idx) => {
                const sat = item.availableSatuan?.find((s) => s.id === item.satuanProdukId);
                const faktor = sat?.faktorKeDasar ? Number(sat.faktorKeDasar) : 1;
                const otherBase = getProductCartQtyInBaseUnit(cart, item.produkId, idx);
                const isMaxForThis = (item.qty + 1) * faktor + otherBase > item.stokCache;

                return (
                  <div key={idx} className="py-3 space-y-2">
                    {/* Top row: Name + Line Total */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
                        {item.nama}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 shrink-0 tabular-nums">
                        {formatRupiah(Math.round(item.qty * item.hargaJual))}
                      </p>
                    </div>

                    {/* Bottom row: Unit Price + Stepper + Trash */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                          {formatRupiah(item.hargaJual)} / {item.namaSatuan}
                        </p>
                        {item.hargaNaik && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-bold">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Harga Naik
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5">
                          <button
                            onClick={() => updateCartQty(idx, item.qty - (item.qty <= 1 ? 0.25 : 1))}
                            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-slate-600 dark:text-zinc-400" />
                          </button>
                          <QtyStepperInput
                            value={item.qty}
                            widthClass="w-10"
                            onCommit={(nextQty) => updateCartQty(idx, nextQty)}
                          />
                          <button
                            onClick={() => updateCartQty(idx, item.qty + 1)}
                            disabled={isMaxForThis}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isMaxForThis
                                ? "text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-40"
                                : "hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                            }`}
                            title={isMaxForThis ? "Stok produk sudah pas/maksimal" : "Tambah"}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-slate-400 dark:text-zinc-500 hover:text-rose-500 transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary + actions */}
        <div className="shrink-0 px-5 pb-5 pt-3 space-y-3 border-t border-slate-100 dark:border-zinc-800">
          {/* Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">{formatRupiah(subtotal)}</span>
            </div>
            {pembulatan !== 0 && (
              <div className="flex justify-between">
                <span>Pembulatan</span>
                <span>{pembulatan > 0 ? "+" : ""}{formatRupiah(pembulatan)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Total</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          {/* Action Buttons: Kosongkan & Bayar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="h-11 px-4 rounded-[14px] font-semibold text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-750 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Kosongkan</span>
            </button>

            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0}
              className="flex-1 h-11 rounded-[14px] font-bold text-sm text-white shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              Bayar {cart.length > 0 ? formatRupiah(grandTotal) : ""}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL: Config Produk ═══════════════════════════════ */}
      {configProduct && (() => {
        const currentConfigSat = configProduct.satuanProduk.find((s) => s.id === configSatuanId) || configProduct.satuanProduk[0];
        const currentConfigFaktor = currentConfigSat?.faktorKeDasar ? Number(currentConfigSat.faktorKeDasar) : 1;
        const existingConfigIdx = cart.findIndex(
          (c) => c.produkId === configProduct.id && c.satuanProdukId === currentConfigSat?.id && c.note === configNote
        );
        const otherConfigBase = getProductCartQtyInBaseUnit(cart, configProduct.id, existingConfigIdx >= 0 ? existingConfigIdx : undefined);
        const remainingConfigBase = Math.max(0, Number(configProduct.stokCache) - otherConfigBase);
        const maxConfigAllowedQty = remainingConfigBase / currentConfigFaktor;
        const isConfigAtMax = configQty >= maxConfigAllowedQty;

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <CategoryIcon kategori={configProduct.kategori?.nama} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">{configProduct.nama}</h3>
                    <p className="text-xs text-slate-400">
                      Sisa Stok Tersedia: {formatDecimal(remainingConfigBase)} {configProduct.satuanDasar}
                    </p>
                  </div>
                </div>
                <button onClick={() => setConfigProduct(null)} className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Pilih Satuan</label>
                <div className="flex flex-wrap gap-2">
                  {configProduct.satuanProduk.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setConfigSatuanId(s.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        configSatuanId === s.id
                          ? "text-white border-transparent"
                          : "border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-300"
                      }`}
                      style={configSatuanId === s.id ? { background: "var(--primary)" } : {}}
                    >
                      {s.namaSatuan} · {formatRupiah(s.hargaJual)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Beli</label>
                  {isConfigAtMax && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      Maksimal ({formatDecimal(maxConfigAllowedQty)} {currentConfigSat?.namaSatuan})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-full flex items-center gap-2">
                    <button
                      onClick={() => setConfigQty(Math.max(0.25, configQty - (configQty <= 1 ? 0.25 : 1)))}
                      className="w-9 h-9 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-200 shadow-sm"
                    >
                      -
                    </button>
                    <NumberInput
                      min={0.25}
                      max={maxConfigAllowedQty}
                      emptyFallback={1}
                      value={configQty}
                      onChange={(val) => {
                        setConfigQty(Math.max(0.25, Math.min(val, maxConfigAllowedQty)));
                      }}
                      className="w-16 text-center bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => {
                        if (!isConfigAtMax) {
                          setConfigQty(Math.min(maxConfigAllowedQty, configQty + (configQty < 1 ? 0.25 : 1)));
                        }
                      }}
                      disabled={isConfigAtMax}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors ${
                        isConfigAtMax
                          ? "bg-slate-100 text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-40"
                          : "bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                      }`}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {[0.25, 0.5, 1, 2, 5]
                      .filter((amt) => amt <= maxConfigAllowedQty)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setConfigQty(amt)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 shrink-0"
                        >
                          {amt}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={configNote}
                  onChange={(e) => setConfigNote(e.target.value)}
                  placeholder="Contoh: bungkus terpisah"
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfigProduct(null)}
                  className="h-12 px-5 rounded-2xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddConfiguredProduct}
                  disabled={maxConfigAllowedQty <= 0 || configQty > maxConfigAllowedQty}
                  className="flex-1 h-12 rounded-2xl text-white font-bold text-xs shadow-md transition-colors hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
                  style={{ background: "var(--primary)" }}
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        );
      })()}



      {/* ═══ MODAL: Pembayaran ══════════════════════════════════ */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">Pembayaran</h3>
                <p className="text-xs text-slate-400">{selectedMember ? selectedMember.nama : "Pelanggan Umum"}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2">
              <p className="text-xs text-slate-400 mb-1">Total Tagihan</p>
              <span className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl">
              {(["TUNAI", "TRANSFER", "KASBON"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodeBayar(m)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    metodeBayar === m
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {m === "TUNAI" ? "Tunai" : m === "TRANSFER" ? "QRIS" : "Kasbon"}
                </button>
              ))}
            </div>

            {metodeBayar === "TUNAI" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Uang Diterima:</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400 dark:text-zinc-500 pointer-events-none select-none">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={uangDiterima ? uangDiterima.toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setUangDiterima(digits ? parseInt(digits, 10) : 0);
                      }}
                      placeholder="0"
                      className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-lg font-bold text-slate-900 dark:text-zinc-100 text-right focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#F0090F]"
                    />
                  </div>
                </div>
                {/* Quick Cash Chips: Uang Pas, 1.000, 5.000, 10.000, 20.000, 50.000, 100.000 */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUangDiterima(grandTotal)}
                    className="flex-1 min-w-[70px] py-1.5 px-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 text-center"
                  >
                    Uang Pas
                  </button>
                  {[1000, 5000, 10000, 20000, 50000, 100000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setUangDiterima(nom)}
                      className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      {formatRupiah(nom)}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <span className="text-xs font-bold text-slate-500">Kembalian:</span>
                  <span className={`text-lg font-extrabold ${isUangKurang ? "text-rose-500" : "text-emerald-600"}`}>
                    {isUangKurang ? "Kurang!" : formatRupiah(kembalian)}
                  </span>
                </div>
              </div>
            )}

            {metodeBayar === "TRANSFER" && (
              <div className="py-2 px-1 text-center space-y-3">
                {/* Toggle Mode Dinamis vs Statis */}
                <div className="inline-grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                  {(["DINAMIS", "STATIS"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setQrisMode(mode)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        qrisMode === mode
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {mode === "DINAMIS" ? "QRIS Dinamis" : "QRIS Statis"}
                    </button>
                  ))}
                </div>

                {/* Kotak QRIS (Klik untuk Perbesar) */}
                {(() => {
                  const hasStaticImg = Boolean(storeInfo?.qrisStaticImage);
                  const hasValidPayload = isValidQrisPayload(storeInfo?.qrisPayload);
                  const activeImg =
                    qrisMode === "DINAMIS"
                      ? hasValidPayload
                        ? qrisDataUrl
                        : null
                      : hasValidPayload
                      ? qrisDataUrl
                      : hasStaticImg
                      ? storeInfo.qrisStaticImage
                      : null;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsQrisZoomed(true)}
                        className="group relative w-52 h-52 max-w-[70vw] mx-auto bg-white p-4 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-md flex flex-col items-center justify-center overflow-hidden hover:border-slate-300 transition-all cursor-pointer"
                        title="Klik untuk memperbesar QRIS bagi konsumen"
                      >
                        {activeImg ? (
                          <img
                            src={activeImg}
                            alt={qrisMode === "DINAMIS" ? "QRIS Dinamis" : "QRIS Statis"}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        ) : (
                          <QrCode className="w-full h-full text-slate-800" />
                        )}
                      </button>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setIsQrisZoomed(true)}
                          className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-xs font-semibold text-slate-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Perbesar QRIS untuk Konsumen</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          {qrisMode === "DINAMIS"
                            ? "QRIS Pembayaran Dinamis"
                            : "QRIS Pembayaran Statis"}
                        </p>
                        {qrisMode === "DINAMIS" && !hasValidPayload ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 max-w-xs mx-auto leading-relaxed">
                            Kode QRIS toko belum diatur untuk nominal otomatis.{" "}
                            <Link href="/owner/pengaturan?tab=pembayaran" className="underline font-semibold">
                              Atur di Pengaturan
                            </Link>{" "}
                            atau gunakan mode <strong>QRIS Statis</strong>.
                          </p>
                        ) : qrisMode === "STATIS" && !hasStaticImg && !hasValidPayload ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 max-w-xs mx-auto leading-relaxed">
                            Foto/kode QRIS Statis belum diupload.{" "}
                            <Link href="/owner/pengaturan?tab=pembayaran" className="underline font-semibold">
                              Upload di Pengaturan Toko
                            </Link>
                            .
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                            {qrisMode === "DINAMIS"
                              ? `Nominal ${formatRupiah(grandTotal)} otomatis terisi saat konsumen scan via GoPay, OVO, Dana, ShopeePay, atau mobile banking.`
                              : "Konsumen scan kartu QRIS toko lalu memasukkan nominal tagihan secara manual."}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                    Bukti Transfer / QRIS <span className="text-rose-500">*Wajib</span>
                  </p>
                  <BuktiTransaksiUploader
                    source="kasir"
                    initialKey={transferBuktiKey}
                    onUploaded={({ key }) => setTransferBuktiKey(key)}
                    compact
                  />
                </div>
              </div>
            )}

            {metodeBayar === "KASBON" && (
              <div className="space-y-3 pt-1">
                {!selectedMember ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-3">
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      Kasbon hanya untuk pelanggan terdaftar!
                    </p>
                    {/* Search bar member Kasbon */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                      <input
                        type="text"
                        value={kasbonMemberSearch}
                        onChange={(e) => setKasbonMemberSearch(e.target.value)}
                        placeholder="Cari nama member atau no HP..."
                        className="w-full h-9 pl-8 pr-8 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-rose-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                      />
                      {kasbonMemberSearch && (
                        <button
                          type="button"
                          onClick={() => setKasbonMemberSearch("")}
                          aria-label="Hapus pencarian member"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Inline Member Selector inside Payment Modal */}
                    {(() => {
                      const q = kasbonMemberSearch.trim().toLowerCase();
                      const filteredKasbonMembers = members.filter((m) => {
                        if (!q) return true;
                        const matchNama = m.nama.toLowerCase().includes(q);
                        const matchTelp = m.telepon ? m.telepon.toLowerCase().includes(q) : false;
                        return matchNama || matchTelp;
                      });
                      return (
                        <div className="text-left space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Pilih salah satu member di bawah:</p>
                          {filteredKasbonMembers.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-4 bg-white/70 dark:bg-zinc-800/60 rounded-xl border border-dashed border-rose-200 dark:border-zinc-700">
                              Member &ldquo;{kasbonMemberSearch}&rdquo; tidak ditemukan
                            </p>
                          ) : (
                            filteredKasbonMembers.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMember(m);
                                  setKasbonMemberSearch("");
                                }}
                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-primary-500 text-left flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-zinc-100">{m.nama}</span>
                                  <span className="text-[10px] text-slate-400 block">Utang: {formatRupiah(m.saldoUtangCache)}</span>
                                </div>
                                <span className="text-[11px] font-bold text-primary-600">Pilih</span>
                              </button>
                            ))
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Member:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-zinc-100">{selectedMember.nama}</strong>
                        <button
                          type="button"
                          onClick={() => setSelectedMember(null)}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Ganti
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Kasbon Sebelumnya:</span><span className="text-rose-600 font-bold">{formatRupiah(selectedMember.saldoUtangCache)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-zinc-700 pt-2 font-bold">
                      <span>Total Setelah Ini:</span>
                      <span className="text-slate-900 dark:text-zinc-100">{formatRupiah(selectedMember.saldoUtangCache + grandTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {refillItems.length > 0 && (
              <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Konfirmasi Tabung Gas / Galon Kosong *Wajib
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Apakah tabung gas / galon kosong untuk{" "}
                      <span className="font-semibold">
                        {refillItems.map((it) => `${it.nama} (${formatDecimal(it.qty)} ${it.namaSatuan})`).join(", ")}
                      </span>{" "}
                      sudah dikembalikan?
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefillStatus("SUDAH")}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      refillStatus === "SUDAH"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-emerald-400"
                    }`}
                  >
                    ✓ Sudah Dikembalikan
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefillStatus("BELUM")}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      refillStatus === "BELUM"
                        ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-amber-400"
                    }`}
                  >
                    Belum Dikembalikan
                  </button>
                </div>
                {refillStatus === "BELUM" && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    Pastikan dicatat / pelanggan mengembalikan tabung atau galon kosong.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setIsPayModalOpen(false); setKasbonMemberSearch(""); }} className="h-12 px-5 rounded-2xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-800">
                Batal
              </button>
              <button
                type="button"
                disabled={
                  submitting ||
                  isUangKurang ||
                  (metodeBayar === "KASBON" && !selectedMember) ||
                  (metodeBayar === "TRANSFER" && !transferBuktiKey) ||
                  (refillItems.length > 0 && refillStatus === "PENDING")
                }
                onClick={() => handleCheckout()}
                className="flex-1 h-12 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-40 transition-all"
                style={{ background: "var(--primary)" }}
              >
                {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick QRIS Dinamis (Input Nominal -> Tampil Nominal di Atas QR, Input di Bawah) */}
      {isQuickQrisOpen && (() => {
        const canCloseQuickQris =
          !quickQrisConfirmed ||
          Boolean(quickQrisBuktiKey) ||
          quickQrisSecondsLeft === 0;
        const closeQuickQris = () => {
          if (!canCloseQuickQris) return;
          setIsQuickQrisOpen(false);
          if (quickQrisSecondsLeft === 0 && !quickQrisBuktiKey) {
            setQuickQrisConfirmed(false);
            setQuickQrisAmount(0);
            setQuickQrisSecondsLeft(60);
          }
        };

        return (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
          onClick={closeQuickQris}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1"
                  style={{
                    backgroundColor: "var(--primary-light, #FEE2E2)",
                    color: "var(--primary, #F0090F)",
                  }}
                >
                  Quick QRIS Dinamis
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                  {extractQrisMerchantName(storeInfo?.qrisPayload) || storeInfo?.namaToko || "Pembayaran QRIS"}
                </h3>
              </div>
              <button
                type="button"
                disabled={!canCloseQuickQris}
                onClick={closeQuickQris}
                className={`w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 shrink-0 transition-opacity ${
                  canCloseQuickQris
                    ? "hover:bg-slate-200 cursor-pointer"
                    : "opacity-35 cursor-not-allowed"
                }`}
                title={
                  canCloseQuickQris
                    ? "Tutup"
                    : "Upload bukti pembayaran atau tunggu timer selesai untuk menutup"
                }
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isValidQrisPayload(storeInfo?.qrisPayload) ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 py-3 leading-relaxed">
                  Kode QRIS Dinamis toko belum diatur.{" "}
                  <Link href="/owner/pengaturan?tab=pembayaran" className="underline font-semibold">
                    Atur di Pengaturan Pembayaran
                  </Link>
                  .
                </p>
              </div>
            ) : quickQrisConfirmed && quickQrisAmount > 0 ? (
              <div className="pt-1 pb-2 text-center space-y-4">
                {/* Output Nominal di Atas QR (Clean & Borderless) */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Total Tagihan
                  </p>
                  <p className="text-3xl font-black text-slate-900 dark:text-zinc-100 tabular-nums mt-0.5">
                    {formatRupiah(quickQrisAmount)}
                  </p>
                </div>

                {/* QR Code (Clean & Borderless) */}
                <div className="w-60 h-60 mx-auto bg-white p-2 rounded-2xl flex items-center justify-center">
                  {quickQrisDataUrl ? (
                    <img
                      src={quickQrisDataUrl}
                      alt="Quick QRIS Dinamis"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <QrCode className="w-32 h-32 text-slate-800 animate-pulse" />
                  )}
                </div>

                {/* Timer 1 Menit (60s) */}
                <div className="max-w-xs mx-auto space-y-1.5">
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                        quickQrisSecondsLeft === 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : quickQrisSecondsLeft <= 10
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {quickQrisSecondsLeft === 0
                        ? "Waktu selesai · Silakan upload bukti transfer"
                        : `Berlaku ${quickQrisSecondsLeft} detik`}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        quickQrisSecondsLeft === 0
                          ? "bg-emerald-500"
                          : quickQrisSecondsLeft <= 10
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${(quickQrisSecondsLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Tunjukkan ke konsumen untuk langsung scan (nominal otomatis terisi).
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-left space-y-2.5">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                    Bukti Transfer / QRIS <span className="text-rose-500">*Wajib</span>
                  </p>
                  <BuktiTransaksiUploader
                    source="quick-qris"
                    initialKey={quickQrisBuktiKey}
                    onUploaded={({ key }) => setQuickQrisBuktiKey(key)}
                    compact
                  />
                  <button
                    type="button"
                    disabled={!quickQrisBuktiKey || quickQrisSaving}
                    onClick={handleSaveQuickQris}
                    className="w-full h-11 rounded-2xl text-white font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer"
                    style={{ backgroundColor: "var(--primary, #F0090F)" }}
                  >
                    {quickQrisSaving
                      ? "Menyimpan ke Riwayat..."
                      : "Selesai & Simpan ke Riwayat"}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (quickQrisAmount > 0) {
                    setQuickQrisSecondsLeft(60);
                    setQuickQrisBuktiKey(null);
                    setQuickQrisConfirmed(true);
                  }
                }}
                className="space-y-3"
              >
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total yang harus dibayar
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={quickQrisAmount ? quickQrisAmount.toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const val = digits ? parseInt(digits, 10) : 0;
                      setQuickQrisAmount(val);
                    }}
                    placeholder="0"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 dark:bg-zinc-800 text-xl font-black text-right text-slate-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[5000, 10000, 20000, 50000, 100000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => setQuickQrisAmount((prev) => prev + addVal)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      +{addVal >= 1000 ? `${addVal / 1000}rb` : addVal}
                    </button>
                  ))}
                  {quickQrisAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuickQrisAmount(0)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={quickQrisAmount <= 0}
                  className="w-full h-11 rounded-2xl text-white font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer mt-1"
                  style={{ backgroundColor: "var(--primary, #F0090F)" }}
                >
                  Tampilkan QRIS
                </button>
              </form>
            )}
          </div>
        </div>
        );
      })()}

      {/* Modal Perbesar QRIS untuk Konsumen */}
      {isQrisZoomed && isPayModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setIsQrisZoomed(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1.5"
                  style={{
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  {qrisMode === "DINAMIS"
                    ? "QRIS Dinamis • Nominal Otomatis"
                    : "QRIS Statis • Input Nominal Manual"}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {extractQrisMerchantName(storeInfo?.qrisPayload) || storeInfo?.namaToko || "Scan QRIS"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrisZoomed(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 shrink-0"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 px-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Tagihan
              </p>
              <p className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                {formatRupiah(grandTotal)}
              </p>
            </div>

            {/* Kartu QRIS Digital Bersih */}
            <div className="relative mx-auto w-full max-w-[310px] rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
              {/* Dekorasi sudut QRIS merah */}
              <div className="pointer-events-none absolute top-0 left-0 w-16 h-3 bg-[#E11D2A] rounded-br-2xl" />
              <div className="pointer-events-none absolute bottom-0 right-0 w-24 h-3 bg-[#E11D2A] rounded-tl-2xl" />

              {/* Header QRIS */}
              <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900">QRIS</span>
                  <span className="text-[9px] leading-tight text-left text-slate-400 font-medium">
                    QR Code Standar<br />Pembayaran Nasional
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {qrisMode === "DINAMIS" ? "DINAMIS" : "STATIS"}
                </span>
              </div>

              {/* Nama Merchant */}
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide pt-2.5 pb-1 truncate">
                {extractQrisMerchantName(storeInfo?.qrisPayload) || storeInfo?.namaToko || "MERCHANT QRIS"}
              </p>

              {/* Gambar QR Code */}
              <div className="w-60 h-60 mx-auto flex items-center justify-center p-2">
                {(() => {
                  const hasStaticImg = Boolean(storeInfo?.qrisStaticImage);
                  const hasValidPayload = isValidQrisPayload(storeInfo?.qrisPayload);
                  const zoomedImg =
                    qrisMode === "DINAMIS"
                      ? hasValidPayload
                        ? qrisDataUrl
                        : null
                      : hasValidPayload
                      ? qrisDataUrl
                      : hasStaticImg
                      ? storeInfo.qrisStaticImage
                      : null;

                  return zoomedImg ? (
                    <img
                      src={zoomedImg}
                      alt="QRIS Konsumen"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <QrCode className="w-44 h-44 text-slate-800" />
                  );
                })()}
              </div>

              <p className="text-[10px] font-extrabold tracking-wider text-slate-700 pt-1">
                SATU QRIS UNTUK SEMUA
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {qrisMode === "DINAMIS"
                ? "Arahkan kamera aplikasi GoPay, OVO, Dana, ShopeePay, atau mobile banking ke QRIS di atas."
                : `Scan QRIS lalu masukkan nominal ${formatRupiah(grandTotal)} di aplikasi pembayaran Anda.`}
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsQrisZoomed(false)}
                className="h-12 px-5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIsQrisZoomed(false);
                  handleCheckout();
                }}
                className="flex-1 h-12 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-40 transition-all"
                style={{ background: "var(--primary)" }}
              >
                {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Riwayat Pesanan & Transaksi */}
      <RiwayatPesananModal
        isOpen={isRiwayatOpen}
        onClose={() => setIsRiwayatOpen(false)}
      />

      {/* Live Barcode Scanner Modal untuk Produk Sembako Indonesia */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* Struk Modal */}
      <StrukModal
        isOpen={isStrukOpen}
        onClose={() => setIsStrukOpen(false)}
        transaksi={completedTrx}
        storeInfo={storeInfo}
      />

      {/* Modal Pendaftaran Barcode Baru ke Produk yang Sudah Ada */}
      {unregisteredBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Barcode className="w-5 h-5" />
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-lg">
                    Barcode Belum Terdaftar
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Barcode <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{unregisteredBarcode}</span> tidak ditemukan. Pilih produk toko di bawah untuk mendaftarkannya:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnregisteredBarcode(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pencarian Produk */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Cari produk toko untuk barcode ini..."
                  className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ "--tw-ring-color": "var(--primary)" } as any}
                  autoFocus
                />
              </div>
            </div>

            {/* List Produk untuk Dihubungkan */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-2 pr-1 divide-y divide-slate-100 dark:divide-zinc-800/60">
              {products
                .filter((p) => {
                  if (!assignSearch.trim()) return true;
                  const q = assignSearch.toLowerCase();
                  return p.nama.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
                })
                .slice(0, 30)
                .map((prod) => {
                  const defaultSatuan = prod.satuanProduk.find((s) => s.isDefault) || prod.satuanProduk[0];
                  const harga = defaultSatuan?.hargaJual || 0;
                  const hasBarcode = !!prod.barcode;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={isAssigning}
                      onClick={() => handleAssignBarcodeToProduct(prod)}
                      className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-all flex items-center justify-between group disabled:opacity-50"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#F0090F] dark:group-hover:text-red-400 transition-colors truncate">
                          {prod.nama}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(harga)} / {defaultSatuan?.namaSatuan || prod.satuanDasar}
                          </span>
                          <span>•</span>
                          <span>Stok: {prod.stokCache} {prod.satuanDasar}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {hasBarcode ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono">
                            Ganti: {prod.barcode}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                            + Pasang Barcode
                          </span>
                        )}
                        <span
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all"
                          style={{ background: "var(--primary)" }}
                        >
                          Pilih
                        </span>
                      </div>
                    </button>
                  );
                })}

              {products.filter((p) => {
                if (!assignSearch.trim()) return true;
                const q = assignSearch.toLowerCase();
                return p.nama.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
              }).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada produk yang cocok dengan pencarian "{assignSearch}".
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setUnregisteredBarcode(null)}
                className="h-10 px-5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => handleCheckout("verified")}
        title="Otorisasi PIN Pemilik"
        description={`Diskon sebesar ${formatRupiah(diskonNominal)} melebihi batas staf (${formatRupiah(storeInfo.batasDiskonStaff || 0)}). Masukkan PIN Pemilik Toko.`}
      />

      {/* Konfirmasi Kosongkan Keranjang */}
      <ConfirmModal
        isOpen={isClearCartConfirmOpen}
        title="Kosongkan Keranjang?"
        description="Semua barang di keranjang pesanan saat ini akan dihapus."
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmClearCart}
        onCancel={() => setIsClearCartConfirmOpen(false)}
      />
    </div>
  );
}
