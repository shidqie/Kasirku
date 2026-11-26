"use client";

import { Fragment, useEffect, useState, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { DetailPageSkeleton } from "@/components/shared/Skeleton";
import { NumberInput } from "@/components/shared/NumberInput";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Share2,
  Receipt,
  Scale,
  CheckCircle,
  AlertCircle,
  Pencil,
  Plus,
  Trash2,
  ShoppingBag,
  FileText,
  X,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Lock,
  Search,
  Check,
  CreditCard,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { formatRupiah, formatDateTime, formatDecimal, formatDayDate } from "@/lib/formatters";
import { generateBonMemberPDF } from "@/lib/pdf-bon-member";
import { PinModal } from "@/components/shared/PinModal";
import { Pagination } from "@/components/shared/Pagination";

interface ManualItemRow {
  nama: string;
  qty: number;
  satuan: string;
  harga: number;
  subtotal: number;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>({ namaToko: "Toko Sembako Berkah" });
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");
  const [currentUserName, setCurrentUserName] = useState<string>("Kasir");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"KASBON" | "PEMBAYARAN">("KASBON");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [expandedBonIds, setExpandedBonIds] = useState<Record<string, boolean>>({});
  const [bonPage, setBonPage] = useState(1);
  const [bonPageSize, setBonPageSize] = useState(10);
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);

  const toggleExpandBon = (id: string) => {
    setExpandedBonIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Centralized Action Menu State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss Toast Notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modal Bayar Utang (User Story D4)
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [payUangDiterima, setPayUangDiterima] = useState<number>(0);
  const [payCatatan, setPayCatatan] = useState<string>("");
  const [payBuktiUrl, setPayBuktiUrl] = useState<string | null>(null);
  const [previewBuktiUrl, setPreviewBuktiUrl] = useState<string | null>(null);
  const [selectedBonToPay, setSelectedBonToPay] = useState<any>(null);
  const [submittingPay, setSubmittingPay] = useState(false);

  const handleBuktiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File bukti pembayaran harus berupa gambar (JPG/PNG/WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPayBuktiUrl(canvas.toDataURL("image/jpeg", 0.8));
        } else {
          setPayBuktiUrl(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Modal PIN Otorisasi Edit Bon
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [bonToEdit, setBonToEdit] = useState<any>(null);

  // Modal Edit Kasbon Manual
  const [isEditBonOpen, setIsEditBonOpen] = useState(false);
  const [editMutasiId, setEditMutasiId] = useState<string>("");
  const [editTanggal, setEditTanggal] = useState<string>("");
  const [editPengambil, setEditPengambil] = useState<string>("");
  const [editCatatan, setEditCatatan] = useState<string>("");
  const [editItems, setEditItems] = useState<ManualItemRow[]>([
    { nama: "", qty: 1, satuan: "pcs", harga: 0, subtotal: 0 },
  ]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Koreksi Saldo (User Story D7: Khusus Owner)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustCatatan, setAdjustCatatan] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Modal Tambah Kasbon Manual
  const [isManualKasbonOpen, setIsManualKasbonOpen] = useState(false);
  const [manualTanggal, setManualTanggal] = useState<string>("");
  const [manualPengambil, setManualPengambil] = useState<string>("");
  const [isPengambilDropdownOpen, setIsPengambilDropdownOpen] = useState(false);
  const pengambilDropdownRef = useRef<HTMLDivElement>(null);
  const [manualCatatan, setManualCatatan] = useState<string>("");
  const [manualItems, setManualItems] = useState<ManualItemRow[]>([
    { nama: "", qty: 1, satuan: "pcs", harga: 0, subtotal: 0 },
  ]);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Master Produk State untuk Pencarian di Kasbon Manual
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [loadingMasterProducts, setLoadingMasterProducts] = useState(false);
  const [quickProductSearch, setQuickProductSearch] = useState("");
  const [isQuickProductDropdownOpen, setIsQuickProductDropdownOpen] = useState(false);
  const quickSearchRef = useRef<HTMLDivElement>(null);

  // Modal Ubah Batas Limit Kasbon Member
  const [isEditLimitOpen, setIsEditLimitOpen] = useState(false);
  const [newLimitKasbon, setNewLimitKasbon] = useState<number>(1000000);
  const [submittingLimit, setSubmittingLimit] = useState(false);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLimit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batasKasbon: Number(newLimitKasbon) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui limit kasbon");

      setSuccess(`Batas limit kasbon berhasil diubah menjadi ${formatRupiah(newLimitKasbon)}!`);
      setIsEditLimitOpen(false);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingLimit(false);
    }
  };

  useEffect(() => {
    const handleQuickSearchClickOutside = (e: MouseEvent) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target as Node)) {
        setIsQuickProductDropdownOpen(false);
      }
      if (pengambilDropdownRef.current && !pengambilDropdownRef.current.contains(e.target as Node)) {
        setIsPengambilDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleQuickSearchClickOutside);
    return () => document.removeEventListener("mousedown", handleQuickSearchClickOutside);
  }, []);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const [mRes, sRes, uRes] = await Promise.all([
        fetch(`/api/members/${memberId}`),
        fetch("/api/settings"),
        fetch("/api/auth/me"),
      ]);

      const mData = await mRes.json();
      const sData = await sRes.json();
      const uData = await uRes.json();

      if (mRes.ok) setMember(mData.member);
      if (sRes.ok) setStoreInfo(sData.settings || {});
      if (uRes.ok) {
        setCurrentUserRole(uData.user?.role || "STAFF");
        setCurrentUserName(uData.user?.nama || "Kasir");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) fetchMember();
  }, [memberId]);

  // Gabungkan dan urutkan seluruh nota kasbon (Kasir POS + Kasbon Manual) sesuai tanggal
  // HARUS diletakkan sebelum early return agar tidak melanggar aturan Hooks React!
  const allKasbonEntries = useMemo(() => {
    if (!member) return [];
    const list: any[] = [];

    // 1. Transaksi Kasbon dari POS Kasir
    for (const trx of member.transaksi || []) {
      const subtotal = trx.subtotal || trx.total || 0;
      const bayarDp = 0;
      const sisa = trx.total || subtotal;
      const totalAkhir = trx.total || subtotal;

      list.push({
        id: trx.id,
        tipe: "POS",
        dibuatPada: new Date(trx.dibuatPada),
        label: "ID Bon: " + (trx.nomorStruk || "POS"),
        pengambil: member.nama,
        kasir: trx.kasir?.nama || "Kasir",
        items: (trx.items || []).map((it: any) => ({
          id: it.id,
          nama: it.namaSnapshot,
          qty: Number(it.qty),
          satuan: it.satuanSnapshot || "pcs",
          harga: it.hargaJualSnapshot,
          subtotal: it.subtotal,
        })),
        subtotal,
        bayarDp,
        sisa,
        total: totalAkhir,
      });
    }

    // 2. Kasbon Manual
    const manualList = (member.kasbonMutasi || []).filter(
      (m: any) => m.tipe === "KASBON" && (!m.transaksiId || m.catatan?.includes("BON MANUAL"))
    );

    for (const m of manualList) {
      let parsedData: any = null;
      if (m.catatan && m.catatan.includes("|| JSON:")) {
        try {
          parsedData = JSON.parse(m.catatan.split("|| JSON:")[1]);
        } catch {}
      }

      const subtotal = parsedData?.items
        ? parsedData.items.reduce((acc: number, item: any) => acc + (item.subtotal || 0), 0)
        : m.jumlah;
      const bayarDp = parsedData?.bayarDp || 0;
      const sisa = Math.max(0, subtotal - bayarDp);
      const totalAkhir = m.jumlah || sisa;

      const items = parsedData?.items && parsedData.items.length > 0
        ? parsedData.items.map((it: any, idx: number) => ({
            id: `${m.id}-${idx}`,
            nama: it.nama,
            qty: Number(it.qty),
            satuan: it.satuan || "pcs",
            harga: it.harga,
            subtotal: it.subtotal,
          }))
        : [
            {
              id: `${m.id}-0`,
              nama: m.catatan?.split("||")[0] || "Belanja warung",
              qty: 1,
              satuan: "transaksi",
              harga: m.jumlah,
              subtotal: m.jumlah,
            },
          ];

      list.push({
        id: m.id,
        tipe: "MANUAL",
        dibuatPada: new Date(m.dibuatPada),
        label: "ID Bon: #" + m.id.slice(-6).toUpperCase(),
        pengambil: parsedData?.pengambil || member.nama,
        kasir: parsedData?.kasir || m.user?.nama || "Kasir",
        items,
        keterangan: parsedData?.keterangan,
        subtotal,
        bayarDp,
        sisa,
        total: totalAkhir,
      });
    }

    // Kelompokkan kasbon pada tanggal yang sama menjadi 1 Bon (per tanggal),
    // dengan setiap transaksi/pengambilan tampil per jam di dalam detail Bon.
    const getLocalDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const groupedMap = new Map<string, any[]>();
    for (const entry of list) {
      const key = getLocalDateKey(entry.dibuatPada);
      const bucket = groupedMap.get(key) || [];
      bucket.push(entry);
      groupedMap.set(key, bucket);
    }

    const groupedList = Array.from(groupedMap.entries()).map(([dateKey, subs]) => {
      const sortedSubs = [...subs].sort(
        (a, b) => a.dibuatPada.getTime() - b.dibuatPada.getTime()
      );
      return {
        id: dateKey,
        tipe: sortedSubs.length === 1 ? sortedSubs[0].tipe : "GROUPED",
        dibuatPada: sortedSubs[0].dibuatPada,
        label:
          sortedSubs.length === 1
            ? sortedSubs[0].label
            : `${sortedSubs.length} pengambilan`,
        pengambil: Array.from(new Set(sortedSubs.map((s) => s.pengambil))).join(", "),
        kasir: Array.from(new Set(sortedSubs.map((s) => s.kasir))).join(", "),
        subEntries: sortedSubs,
        items: sortedSubs.flatMap((s) => s.items || []),
        subtotal: sortedSubs.reduce((sum, s) => sum + (s.subtotal || 0), 0),
        bayarDp: sortedSubs.reduce((sum, s) => sum + (s.bayarDp || 0), 0),
        sisa: sortedSubs.reduce((sum, s) => sum + (s.sisa || 0), 0),
        total: sortedSubs.reduce((sum, s) => sum + (s.total || 0), 0),
      };
    });

    // Urutkan sesuai tanggal (ASC = Terlama -> Terbaru, DESC = Terbaru -> Terlama)
    groupedList.sort((a, b) => {
      const timeA = a.dibuatPada.getTime();
      const timeB = b.dibuatPada.getTime();
      return sortOrder === "ASC" ? timeA - timeB : timeB - timeA;
    });

    return groupedList;
  }, [member, sortOrder]);

  // Hitung status pembayaran tiap bon secara FIFO berdasarkan saldo utang member saat ini
  const bonStatusMap = useMemo(() => {
    const map: Record<string, "LUNAS" | "CICIL" | "BELUM_LUNAS"> = {};
    if (!member || allKasbonEntries.length === 0) return map;

    if (Number(member.saldoUtangCache || 0) <= 0) {
      for (const b of allKasbonEntries) map[b.id] = "LUNAS";
      return map;
    }

    const chronological = [...allKasbonEntries].sort(
      (a, b) => a.dibuatPada.getTime() - b.dibuatPada.getTime()
    );
    const totalAllBons = chronological.reduce(
      (sum, b) => sum + (b.sisa > 0 ? b.sisa : b.total),
      0
    );
    let remainingPaid = Math.max(0, totalAllBons - Number(member.saldoUtangCache || 0));

    for (const b of chronological) {
      const bonAmt = b.sisa > 0 ? b.sisa : b.total;
      if (bonAmt <= 0 || remainingPaid >= bonAmt) {
        map[b.id] = "LUNAS";
        remainingPaid = Math.max(0, remainingPaid - bonAmt);
      } else if (remainingPaid > 0) {
        map[b.id] = "CICIL";
        remainingPaid = 0;
      } else {
        map[b.id] = "BELUM_LUNAS";
      }
    }
    return map;
  }, [member, allKasbonEntries]);

  // User Story D6: Kirim Ringkasan ke WhatsApp Member
  const handleShareWhatsApp = () => {
    if (!member) return;

    const text = `*${storeInfo.namaToko.toUpperCase()}*\nInformasi Tagihan Kasbon Member\n----------------------------------\nYth. Kak *${
      member.nama
    }*,\n\nBerikut ringkasan saldo utang kasbon belanja Anda saat ini:\n• *Total Tagihan: ${formatRupiah(
      member.saldoUtangCache
    )}*\n• Batas Limit: ${formatRupiah(member.batasKasbon)}\n• Sisa Limit: ${formatRupiah(
      member.sisaLimit
    )}\n----------------------------------\nPembayaran dapat dilakukan langsung di kasir toko atau transfer.\n${
      storeInfo.footerStruk || "Terima kasih atas kepercayaannya."
    }`;

    const phone = member.telepon ? member.telepon.replace(/^0/, "62").replace(/\D/g, "") : "";
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
  };

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    if (payMethod === "TRANSFER" && !payBuktiUrl) {
      setError("Bukti pembayaran wajib diupload untuk metode Transfer / QRIS.");
      return;
    }

    setSubmittingPay(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${memberId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jumlah: payAmount,
          metode: payMethod,
          uangDiterima: payMethod === "TUNAI" ? payUangDiterima : payAmount,
          catatan: payCatatan.trim() || undefined,
          buktiUrl: payBuktiUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat pembayaran");

      setSuccess(
        `Pembayaran Rp ${formatRupiah(payAmount)} berhasil dicatat (No: ${
          data.result.bukti.nomorBukti
        }).`
      );
      setIsPayOpen(false);
      setSelectedBonToPay(null);
      setPayCatatan("");
      setPayBuktiUrl(null);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleAdjustDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustAmount === 0 || !adjustCatatan.trim()) return;

    setSubmittingAdjust(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${memberId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jumlah: adjustAmount,
          catatan: adjustCatatan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengoreksi saldo");

      setSuccess("Koreksi saldo kasbon berhasil disimpan.");
      setIsAdjustOpen(false);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const handleReconcile = () => {
    setIsReconcileOpen(true);
  };

  const confirmReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/members/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal rekonsiliasi");

      if (data.result.selisihDitemukan) {
        setSuccess("Rekonsiliasi mendeteksi selisih dan berhasil memulihkan saldo cache!");
      } else {
        setSuccess("Saldo utang kasbon 100% konsisten dengan mutasi ledger.");
      }
      setIsReconcileOpen(false);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
      setIsReconcileOpen(false);
    } finally {
      setReconciling(false);
    }
  };

  // ─── Download PDF Bon Piutang ──────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!member) return;
    try {
      await generateBonMemberPDF(member, storeInfo);
    } catch (err: any) {
      console.error("Gagal generate PDF:", err);
      setError("Gagal mengunduh dokumen PDF bon: " + (err?.message || "Terjadi kesalahan"));
    }
  };

  // Helper Fetch Master Produk untuk Kasbon Manual
  const fetchMasterProducts = async () => {
    if (masterProducts.length > 0) return;
    try {
      setLoadingMasterProducts(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.products;
      if (res.ok && Array.isArray(list)) {
        setMasterProducts(list);
      }
    } catch (err) {
      console.error("Gagal load master products:", err);
    } finally {
      setLoadingMasterProducts(false);
    }
  };

  // Helper Form Tambah Kasbon Manual
  const handleOpenManualKasbon = () => {
    const today = new Date().toISOString().split("T")[0];
    setManualTanggal(today);
    setManualPengambil(member.nama);
    setManualCatatan("");
    setManualItems([{ nama: "", qty: 1, satuan: "pcs", harga: 0, subtotal: 0 }]);
    setQuickProductSearch("");
    setIsQuickProductDropdownOpen(false);
    setError(null);
    fetchMasterProducts();
    setIsManualKasbonOpen(true);
  };

  const handleSelectMasterProduct = (product: any, selectedSatuan?: any) => {
    const chosenSatuan =
      selectedSatuan ||
      product.satuanProduk?.find((s: any) => s.isDefault) ||
      product.satuanProduk?.[0] ||
      { namaSatuan: product.satuanDasar || "pcs", hargaJual: 0 };

    const newItem: ManualItemRow = {
      nama: product.nama,
      qty: 1,
      satuan: chosenSatuan.namaSatuan || product.satuanDasar || "pcs",
      harga: chosenSatuan.hargaJual || 0,
      subtotal: (chosenSatuan.hargaJual || 0) * 1,
    };

    // Jika baris pertama masih kosong, ganti; jika sudah ada isinya, tambahkan baris baru
    if (
      manualItems.length === 1 &&
      !manualItems[0].nama.trim() &&
      manualItems[0].harga === 0
    ) {
      setManualItems([newItem]);
    } else {
      setManualItems([...manualItems, newItem]);
    }

    setQuickProductSearch("");
    setIsQuickProductDropdownOpen(false);
  };

  const handleAddManualItem = () => {
    setManualItems([
      ...manualItems,
      { nama: "", qty: 1, satuan: "pcs", harga: 0, subtotal: 0 },
    ]);
  };

  const handleRemoveManualItem = (index: number) => {
    if (manualItems.length <= 1) return;
    setManualItems(manualItems.filter((_, idx) => idx !== index));
  };

  const handleManualItemChange = (index: number, field: keyof ManualItemRow, val: any) => {
    const updated = [...manualItems];
    const row = { ...updated[index], [field]: val };

    // Auto-fill harga dan satuan jika nama yang diketik cocok dengan data master produk
    if (field === "nama" && masterProducts.length > 0) {
      const matched = masterProducts.find(
        (p) => p.nama.toLowerCase() === (val || "").toLowerCase().trim()
      );
      if (matched) {
        const defSatuan =
          matched.satuanProduk?.find((s: any) => s.isDefault) ||
          matched.satuanProduk?.[0] ||
          { namaSatuan: matched.satuanDasar || "pcs", hargaJual: 0 };
        row.satuan = defSatuan.namaSatuan || row.satuan;
        row.harga = defSatuan.hargaJual || row.harga;
        row.subtotal = Math.round(row.qty * (row.harga || 0));
      }
    }

    if (field === "qty" || field === "harga") {
      const q = field === "qty" ? parseFloat(val || "0") : row.qty;
      const h = field === "harga" ? parseInt(val || "0", 10) : row.harga;
      row.subtotal = Math.round(q * h);
    }

    updated[index] = row;
    setManualItems(updated);
  };

  const totalManualBelanja = manualItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);

  const handleSubmitManualKasbon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPengambil.trim()) {
      setError("Nama pengambil belanja wajib diisi");
      return;
    }

    for (const it of manualItems) {
      if (!it.nama.trim()) {
        setError("Nama barang tidak boleh kosong");
        return;
      }
      if (it.qty <= 0) {
        setError("Jumlah (qty) barang harus lebih dari 0");
        return;
      }
    }

    if (totalManualBelanja <= 0) {
      setError("Total belanja kasbon harus lebih dari Rp 0");
      return;
    }

    setSubmittingManual(true);
    setError(null);
    setSuccess(null);

    try {
      let tanggalIso = new Date().toISOString();
      if (manualTanggal) {
        const now = new Date();
        const [yr, mo, dy] = manualTanggal.split("-").map(Number);
        const combined = new Date(
          yr,
          (mo || 1) - 1,
          dy || 1,
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        );
        tanggalIso = combined.toISOString();
      }

      const res = await fetch(`/api/members/${memberId}/manual-kasbon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: tanggalIso,
          pengambil: manualPengambil.trim(),
          catatan: manualCatatan.trim() || undefined,
          items: manualItems.map((it) => ({
            nama: it.nama.trim(),
            qty: Number(it.qty),
            satuan: it.satuan.trim() || "pcs",
            harga: Number(it.harga),
            subtotal: Number(it.subtotal),
          })),
          total: totalManualBelanja,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat kasbon manual");

      setSuccess(`Kasbon manual sebesar ${formatRupiah(totalManualBelanja)} berhasil ditambahkan ke ${member.nama}!`);
      setIsManualKasbonOpen(false);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  // Aksi Pembayaran Bon Spesifik
  const handleOpenPayForBon = (bon: any) => {
    const amountToPay = bon.sisa > 0 ? bon.sisa : bon.total;
    setPayAmount(amountToPay);
    setPayUangDiterima(amountToPay);
    setPayCatatan(`Pembayaran ${bon.label}`);
    setSelectedBonToPay(bon);
    setIsPayOpen(true);
  };

  // Aksi Permintaan Edit Bon (Memerlukan PIN)
  const handleRequestEditBon = (bon: any) => {
    setBonToEdit(bon);
    setIsPinModalOpen(true);
  };

  // Callback setelah PIN Owner terverifikasi
  const handlePinVerifiedForEdit = () => {
    if (!bonToEdit) return;
    setEditMutasiId(bonToEdit.id);
    const d = bonToEdit.dibuatPada instanceof Date ? bonToEdit.dibuatPada : new Date(bonToEdit.dibuatPada);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setEditTanggal(`${year}-${month}-${day}`);
    setEditPengambil(bonToEdit.pengambil || member?.nama || "");
    setEditCatatan(bonToEdit.keterangan || "");
    setEditItems(
      (bonToEdit.items || []).map((it: any) => ({
        nama: it.nama,
        qty: Number(it.qty) || 1,
        satuan: it.satuan || "pcs",
        harga: Number(it.harga) || 0,
        subtotal: Number(it.subtotal) || 0,
      }))
    );
    setIsEditBonOpen(true);
  };

  const handleAddEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      { nama: "", qty: 1, satuan: "pcs", harga: 0, subtotal: 0 },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length === 1) return;
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (index: number, field: keyof ManualItemRow, val: any) => {
    setEditItems((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: val };
      if (field === "qty" || field === "harga") {
        row.subtotal = Number(row.qty || 0) * Number(row.harga || 0);
      }
      updated[index] = row;
      return updated;
    });
  };

  const totalEditBelanja = editItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);

  const handleSubmitEditBon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPengambil.trim()) {
      setError("Nama pengambil belanja wajib diisi");
      return;
    }

    for (const it of editItems) {
      if (!it.nama.trim()) {
        setError("Nama barang tidak boleh kosong");
        return;
      }
      if (it.qty <= 0) {
        setError("Jumlah (qty) barang harus lebih dari 0");
        return;
      }
    }

    if (totalEditBelanja <= 0) {
      setError("Total belanja bon harus lebih dari Rp 0");
      return;
    }

    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${memberId}/manual-kasbon`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutasiId: editMutasiId,
          tanggal: editTanggal ? new Date(editTanggal).toISOString() : undefined,
          pengambil: editPengambil.trim(),
          catatan: editCatatan.trim() || undefined,
          items: editItems.map((it) => ({
            nama: it.nama.trim(),
            qty: Number(it.qty),
            satuan: it.satuan.trim() || "pcs",
            harga: Number(it.harga),
            subtotal: Number(it.subtotal),
          })),
          total: totalEditBelanja,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui nota bon");

      setSuccess(`Nota ${bonToEdit?.label || "Bon"} berhasil diperbarui!`);
      setIsEditBonOpen(false);
      setBonToEdit(null);
      fetchMember();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!member) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Member tidak ditemukan.</p>
        <button onClick={() => router.push("/member")} className="mt-3 text-blue-600 font-bold">
          Kembali ke Daftar Pelanggan
        </button>
      </div>
    );
  }

  const payKembalian =
    payMethod === "TUNAI" && payUangDiterima >= payAmount ? payUangDiterima - payAmount : 0;

  const limitMax = member.batasKasbon > 0 ? member.batasKasbon : 1000000;
  const sisaLimit = Math.max(0, limitMax - member.saldoUtangCache);
  const limitUsagePct = Math.min(100, Math.round((member.saldoUtangCache / limitMax) * 100));

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      <div className="shrink-0 space-y-2">
      {/* Tombol Kembali */}
      <div className="pb-2">
        <button
          onClick={() => router.push("/member")}
          className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Pelanggan</span>
        </button>
      </div>

      {/* Header Profil Member (Flat Editorial Style) */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            {member.nama}
          </h2>
          <p className="text-xs font-sans text-slate-500 dark:text-zinc-400 mt-1">
            No. HP: {member.telepon || "-"} · Alamat: {member.alamat || "-"}
          </p>
        </div>

        {/* Centralized Action Buttons */}
        <div className="flex items-center gap-2.5 relative" ref={actionMenuRef}>
          {/* Primary Action: Terima pembayaran utang */}
          <button
            disabled={member.saldoUtangCache <= 0}
            onClick={() => {
              setPayAmount(member.saldoUtangCache);
              setPayUangDiterima(member.saldoUtangCache);
              setIsPayOpen(true);
            }}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Terima Pembayaran</span>
          </button>

          {/* Centralized Action Menu Button */}
          <button
            onClick={() => setIsActionMenuOpen((prev) => !prev)}
            className="h-10 px-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Menu Aksi Terpusat"
          >
            <span>Aksi &amp; kelola</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isActionMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Centralized Dropdown Menu */}
          {isActionMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2 divide-y divide-slate-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-150">
              {/* Group 1: Kasbon */}
              <div className="px-1.5 py-1 space-y-0.5">
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                  Transaksi Kasbon
                </span>
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleOpenManualKasbon();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors font-semibold"
                >
                  <Plus className="w-4 h-4 text-[#F0090F]" />
                  <span>Tambah Kasbon Manual</span>
                </button>
              </div>

              {/* Group 2: Dokumen & Komunikasi */}
              <div className="px-1.5 py-1 space-y-0.5">
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                  Dokumen & Komunikasi
                </span>
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleDownloadPDF();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors font-semibold"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Unduh Rincian Bon (PDF)</span>
                </button>
                <button
                  disabled={!member.telepon || !member.telepon.trim()}
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleShareWhatsApp();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors font-semibold disabled:opacity-40"
                >
                  <Share2 className="w-4 h-4 text-emerald-500" />
                  <span>Kirim Rincian via WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification Popup di Pojok Kanan Atas */}
      <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full space-y-2.5 pointer-events-none">
        {success && (
          <div className="pointer-events-auto p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 dark:border-emerald-800/40">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-zinc-100 mb-0.5">Berhasil!</p>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="pointer-events-auto p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-rose-200/90 dark:border-rose-800/60 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100 dark:border-rose-800/40">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-zinc-100 mb-0.5">Terjadi Kendala</p>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Ringkasan 3 Kolom (Flat Editorial Style + Hairline Dividers) */}
      <div className="border-b border-slate-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-zinc-800 items-start">
          {/* 1. Nama member */}
          <div className="py-5 md:pr-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Nama Pelanggan
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
              {member.nama}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {member.telepon || "Tanpa No HP"} {member.alamat ? `· ${member.alamat}` : ""}
            </p>
          </div>

          {/* 2. Limit semua maks + Progress Bar */}
          <div className="py-5 md:px-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                Limit Kasbon
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewLimitKasbon(limitMax);
                  setIsEditLimitOpen(true);
                }}
                className="text-xs text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-medium underline underline-offset-4 cursor-pointer"
              >
                Ubah Limit Kasbon
              </button>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
              {formatRupiah(limitMax)}
            </p>
            <div className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-300"
                style={{ width: `${limitUsagePct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5">
              Sisa limit{" "}
              <strong className="text-slate-800 dark:text-zinc-200 font-semibold tabular-nums">
                {formatRupiah(sisaLimit)}
              </strong>
            </p>
          </div>

          {/* 3. Total hutang */}
          <div className="py-5 md:pl-6">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Total hutang
            </span>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1 tabular-nums">
              {formatRupiah(member.saldoUtangCache)}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {member.saldoUtangCache > 0 ? "Belum lunas" : "Lunas"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Underline & Sort Toolbar */}
      <div className="pt-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("KASBON")}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "KASBON"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Rincian nota
            </button>
            <button
              onClick={() => setActiveTab("PEMBAYARAN")}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "PEMBAYARAN"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Riwayat pembayaran
            </button>
          </div>

          {activeTab === "KASBON" && allKasbonEntries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setBonPage(1);
              }}
              className="pb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Klik untuk mengubah urutan tanggal nota"
            >
              <span>{sortOrder === "ASC" ? "Terlama dulu ↓" : "Terbaru dulu ↑"}</span>
            </button>
          )}
        </div>
      </div>
      </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1">
          {activeTab === "KASBON" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {allKasbonEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada transaksi kasbon yang tercatat.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Catat kasbon dari Kasir (POS) atau klik tombol &quot;Tambah Kasbon Manual&quot; di atas.
                  </p>
                </div>
              ) : (
                <>
                <div className="flex-1 min-h-0 overflow-auto">
                  {/* Mobile Card List (< md) */}
                  <div className="md:hidden space-y-2.5 py-2">
                    {allKasbonEntries
                      .slice((bonPage - 1) * bonPageSize, bonPage * bonPageSize)
                      .map((bon: any, idx: number) => {
                        const globalIdx = (bonPage - 1) * bonPageSize + idx;
                        const bonNumber = sortOrder === "ASC" ? globalIdx + 1 : allKasbonEntries.length - globalIdx;
                        const cleanLabel = String(bon.label || "").replace(/^ID Bon:\s*/i, "");
                        const isExpanded = !!expandedBonIds[bon.id];
                        const totalBarang = Array.isArray(bon.items) ? bon.items.length : 0;
                        const payStatus = bonStatusMap[bon.id] || "BELUM_LUNAS";

                        return (
                          <div
                            key={bon.id}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpandBon(bon.id)}
                              className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                                    Bon {bonNumber}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {cleanLabel}
                                  </span>
                                  {payStatus === "LUNAS" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                                      Lunas
                                    </span>
                                  ) : payStatus === "CICIL" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/80">
                                      Cicilan
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80">
                                      Belum Lunas
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {formatDayDate(bon.dibuatPada)} · {totalBarang} barang
                                </p>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 tabular-nums">
                                  {formatRupiah(bon.sisa > 0 ? bon.sisa : bon.total)}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2.5 bg-slate-50/60 dark:bg-zinc-900/60">
                                {(bon.subEntries || [bon]).map((sub: any, sIdx: number) => {
                                  const subJam = new Date(sub.dibuatPada).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                  return (
                                    <div
                                      key={sub.id || sIdx}
                                      className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 p-3 space-y-2 text-xs"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                                        <span>
                                          Diambil oleh <strong>{sub.pengambil}</strong> · Jam {subJam} WIB
                                        </span>
                                        <span className="text-slate-400">Kasir: {sub.kasir}</span>
                                      </div>
                                      <div className="space-y-1">
                                        {(sub.items || []).map((it: any, iIdx: number) => (
                                          <div key={it.id || iIdx} className="flex justify-between gap-2">
                                            <span className="text-slate-800 dark:text-zinc-200">
                                              {it.nama}{" "}
                                              <span className="text-slate-400">
                                                ({formatDecimal(it.qty)} {it.satuan})
                                              </span>
                                            </span>
                                            <span className="font-semibold tabular-nums shrink-0">
                                              {formatRupiah(it.subtotal)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-xs text-slate-500">
                                    Sisa: <strong className="text-rose-600">{formatRupiah(bon.sisa)}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={member.saldoUtangCache <= 0}
                                    onClick={() => handleOpenPayForBon(bon)}
                                    className="h-9 px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                                  >
                                    Bayar bon ini
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <table className="hidden md:table w-full text-left text-xs text-slate-600 dark:text-zinc-300">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                      <tr>
                        <th className="py-3 pr-4">ID Bon</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4 text-center">Total List Barang</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                      {allKasbonEntries
                        .slice((bonPage - 1) * bonPageSize, bonPage * bonPageSize)
                        .map((bon: any, idx: number) => {
                        const globalIdx = (bonPage - 1) * bonPageSize + idx;
                        const bonNumber = sortOrder === "ASC" ? globalIdx + 1 : allKasbonEntries.length - globalIdx;
                        const isManual = bon.tipe === "MANUAL";
                        const cleanLabel = String(bon.label || "").replace(/^ID Bon:\s*/i, "");
                        const isExpanded = !!expandedBonIds[bon.id];
                        const totalBarang = Array.isArray(bon.items) ? bon.items.length : 0;
                        const payStatus = bonStatusMap[bon.id] || "BELUM_LUNAS";

                        return (
                          <Fragment key={bon.id}>
                            <tr
                              onClick={() => toggleExpandBon(bon.id)}
                              className={`hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150 cursor-pointer ${
                                isExpanded ? "bg-slate-50/80 dark:bg-zinc-800/50" : ""
                              }`}
                            >
                              <td className="py-3.5 pr-4">
                                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                  Bon {bonNumber}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 ml-1.5">
                                  {cleanLabel}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                                <span>{formatDayDate(bon.dibuatPada)}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-600 dark:text-zinc-300 tabular-nums">
                                {totalBarang > 0 ? `${totalBarang} barang` : "-"}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums whitespace-nowrap">
                                {formatRupiah(bon.sisa > 0 ? bon.sisa : bon.total)}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {payStatus === "LUNAS" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                                    Lunas
                                  </span>
                                ) : payStatus === "CICIL" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/80">
                                    Cicilan
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80">
                                    Belum Lunas
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandBon(bon.id);
                                  }}
                                  className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold transition-colors inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <span>{isExpanded ? "Tutup" : "Detail"}</span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-zinc-900/60">
                                <td colSpan={6} className="px-3 sm:px-4 py-4">
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                    className="space-y-3"
                                  >
                                    <div className="space-y-2.5">
                                      {(bon.subEntries || [bon]).map((sub: any, sIdx: number) => {
                                        const subJam = new Date(sub.dibuatPada).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        });
                                        const subCode = String(sub.label || "").replace(/^ID Bon:\s*/i, "");

                                        return (
                                          <div
                                            key={sub.id || sIdx}
                                            className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 p-3.5 space-y-2.5"
                                          >
                                            {/* Header Pengambilan: Pengambil, Jam, Kode & Kasir */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 text-xs">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-slate-400 text-[11px]">
                                                  Diambil oleh
                                                </span>
                                                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                                  {sub.pengambil}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-slate-600 dark:text-zinc-300 tabular-nums">
                                                  Jam {subJam} WIB
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                                                {subCode && (
                                                  <span className="font-mono text-slate-400 dark:text-zinc-500">
                                                    {subCode}
                                                  </span>
                                                )}
                                                <span>·</span>
                                                <span>
                                                  Kasir:{" "}
                                                  <strong className="font-medium text-slate-700 dark:text-zinc-300">
                                                    {sub.kasir}
                                                  </strong>
                                                </span>
                                              </div>
                                            </div>

                                            {/* List Barang per Pengambilan */}
                                            <div className="divide-y divide-slate-100/80 dark:divide-zinc-800/80 text-xs">
                                              {sub.items && sub.items.length > 0 ? (
                                                sub.items.map((it: any, iIdx: number) => (
                                                  <div
                                                    key={it.id || iIdx}
                                                    className="flex justify-between items-baseline gap-4 py-1.5 first:pt-0 last:pb-0"
                                                  >
                                                    <div className="text-slate-900 dark:text-zinc-100 min-w-0">
                                                      <span className="font-medium">{it.nama}</span>
                                                      <span className="text-slate-500 dark:text-zinc-400 ml-1.5">
                                                        {formatDecimal(it.qty)} {it.satuan} @ {formatRupiah(it.harga)}
                                                      </span>
                                                    </div>
                                                    <span className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">
                                                      {formatRupiah(it.subtotal)}
                                                    </span>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-slate-400 italic text-xs py-1">
                                                  - Tidak ada rincian item
                                                </p>
                                              )}
                                            </div>

                                            {(sub.keterangan || (bon.subEntries?.length > 1)) && (
                                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px]">
                                                <div className="text-slate-500 dark:text-zinc-400 italic">
                                                  {sub.keterangan ? `Catatan: "${sub.keterangan}"` : ""}
                                                </div>
                                                {bon.subEntries?.length > 1 && (
                                                  <div className="text-slate-500 dark:text-zinc-400 tabular-nums">
                                                    Subtotal pengambilan:{" "}
                                                    <strong className="text-slate-800 dark:text-zinc-200">
                                                      {formatRupiah(sub.sisa > 0 ? sub.sisa : sub.total)}
                                                    </strong>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Ringkasan Perhitungan */}
                                    <div className="pt-2 space-y-1.5 text-xs max-w-xs ml-auto">
                                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                                          {formatRupiah(bon.subtotal)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                                        <span>Bayar DP</span>
                                        <span className="font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                                          {formatRupiah(bon.bayarDp)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800">
                                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-500">
                                          Sisa
                                        </span>
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-500 tabular-nums">
                                          {formatRupiah(bon.sisa)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Footer Aksi Bon */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                                      <div>
                                        {isManual ? (
                                          <button
                                            type="button"
                                            onClick={() => handleRequestEditBon(bon)}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 cursor-pointer"
                                          >
                                            <Lock className="w-3 h-3 text-amber-500" />
                                            <span>Edit Bon (PIN Owner)</span>
                                          </button>
                                        ) : (
                                          <span className="text-slate-500 dark:text-zinc-400">
                                            Transaksi POS Kasir
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        disabled={member.saldoUtangCache <= 0}
                                        onClick={() => handleOpenPayForBon(bon)}
                                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 disabled:opacity-40 disabled:no-underline cursor-pointer"
                                      >
                                        Bayar bon ini
                                      </button>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="shrink-0">
                  <Pagination
                    currentPage={bonPage}
                    totalItems={allKasbonEntries.length}
                    pageSize={bonPageSize}
                    onPageChange={setBonPage}
                    onPageSizeChange={setBonPageSize}
                  />
                </div>
                </>
              )}
            </div>
          )}

          {activeTab === "PEMBAYARAN" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
                <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-3 pr-4">No. Bukti</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 text-right">Nominal Bayar</th>
                    <th className="py-3 px-4">Diterima Kasir</th>
                    <th className="py-3 pl-4 text-center whitespace-nowrap">Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                  {(member.kasbonPembayaran || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                        Belum ada riwayat pembayaran utang.
                      </td>
                    </tr>
                  ) : (
                    (member.kasbonPembayaran || [])
                      .slice((payPage - 1) * payPageSize, payPage * payPageSize)
                      .map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                        <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-zinc-100 font-mono">
                          {p.nomorBukti}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                          {formatDateTime(p.dibuatPada)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300">
                          {p.metode}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                          {formatRupiah(p.jumlah)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-zinc-200">
                          {p.kasir?.nama || "Kasir"}
                        </td>
                        <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                          {p.buktiUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewBuktiUrl(p.buktiUrl)}
                              className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold transition-colors inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {(member.kasbonPembayaran || []).length > 0 && (
              <div className="shrink-0">
                <Pagination
                  currentPage={payPage}
                  totalItems={(member.kasbonPembayaran || []).length}
                  pageSize={payPageSize}
                  onPageChange={setPayPage}
                  onPageSizeChange={setPayPageSize}
                />
              </div>
            )}
            </div>
          )}
        </div>

      {/* SLIDE DRAWER BAYAR UTANG (User Story D4) */}
      {isPayOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => {
            setIsPayOpen(false);
            setSelectedBonToPay(null);
            setPayCatatan("");
            setPayBuktiUrl(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col font-sans drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Terima Pembayaran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{member.nama}</span>
                  {" · "}
                  <span>Total Utang: <strong className="text-rose-600">{formatRupiah(member.saldoUtangCache)}</strong></span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPayOpen(false);
                  setSelectedBonToPay(null);
                  setPayCatatan("");
                  setPayBuktiUrl(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {selectedBonToPay && (
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500">
                      Membayar <strong className="text-slate-800 dark:text-zinc-200">{selectedBonToPay.label}</strong>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                      {formatRupiah(selectedBonToPay.sisa > 0 ? selectedBonToPay.sisa : selectedBonToPay.total)}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-slate-500">
                      Jumlah bayar
                    </label>
                    <span className="text-[11px] text-slate-400">Bisa dicicil</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={payAmount ? payAmount.toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        const val = digits ? parseInt(digits, 10) : 0;
                        setPayAmount(val);
                        setPayUangDiterima(val);
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 text-sm font-bold text-right focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Tombol cepat Cicilan / Lunas */}
                  {(() => {
                    const baseTarget = selectedBonToPay
                      ? Math.min(
                          member.saldoUtangCache,
                          selectedBonToPay.sisa > 0 ? selectedBonToPay.sisa : selectedBonToPay.total
                        )
                      : member.saldoUtangCache;
                    const presets = [
                      { label: "25%", amount: Math.max(1000, Math.round((baseTarget * 0.25) / 500) * 500) },
                      { label: "50%", amount: Math.max(1000, Math.round((baseTarget * 0.5) / 500) * 500) },
                      { label: "Lunas", amount: member.saldoUtangCache },
                    ].filter((p, i, arr) => p.amount > 0 && p.amount <= member.saldoUtangCache && arr.findIndex((x) => x.amount === p.amount) === i);

                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {presets.map((p) => {
                          const isSelected = payAmount === p.amount;
                          return (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => {
                                setPayAmount(p.amount);
                                setPayUangDiterima(p.amount);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                                  : "bg-slate-50/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 hover:bg-slate-100"
                              }`}
                            >
                              {p.label} · {formatRupiah(p.amount)}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {payAmount > member.saldoUtangCache && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1.5">
                      Nominal melebihi total utang ({formatRupiah(member.saldoUtangCache)})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1.5">
                    Metode pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPayMethod("TUNAI")}
                      className={`h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        payMethod === "TUNAI"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                      }`}
                    >
                      Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("TRANSFER")}
                      className={`h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        payMethod === "TRANSFER"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                      }`}
                    >
                      Transfer / QRIS
                    </button>
                  </div>
                </div>

                {payMethod === "TUNAI" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-medium text-slate-500">
                        Uang diterima
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Kembalian:{" "}
                        <strong className="text-emerald-600">{formatRupiah(payKembalian)}</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={payUangDiterima ? payUangDiterima.toLocaleString("id-ID") : ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          setPayUangDiterima(digits ? parseInt(digits, 10) : 0);
                        }}
                        placeholder="0"
                        className="w-full pl-10 pr-3.5 h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1.5">
                    Catatan (opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Titip lewat tetangga"
                    value={payCatatan}
                    onChange={(e) => setPayCatatan(e.target.value)}
                    className="w-full px-3.5 h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-slate-500">
                      Bukti pembayaran{" "}
                      {payMethod === "TRANSFER" ? (
                        <span className="text-rose-500">*</span>
                      ) : (
                        "(opsional)"
                      )}
                    </label>
                    {payMethod === "TRANSFER" && !payBuktiUrl && (
                      <span className="text-[11px] text-rose-500 font-medium">
                        Wajib untuk Transfer / QRIS
                      </span>
                    )}
                  </div>
                  {payBuktiUrl ? (
                    <div className="relative rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-50/70 dark:bg-zinc-800 p-2 flex items-center gap-3">
                      <img
                        src={payBuktiUrl}
                        alt="Bukti pembayaran"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-200 truncate">
                          Foto bukti terpasang
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPayBuktiUrl(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus bukti"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex items-center justify-center gap-2 h-10 px-3 border border-dashed rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        payMethod === "TRANSFER"
                          ? "border-rose-300 hover:border-rose-400 bg-rose-50/30 text-rose-600"
                          : "border-slate-300 dark:border-zinc-700 hover:border-slate-400 bg-slate-50/40 dark:bg-zinc-800/60 hover:bg-slate-50 text-slate-500 dark:text-zinc-300"
                      }`}
                    >
                      <Upload className={`w-3.5 h-3.5 ${payMethod === "TRANSFER" ? "text-rose-400" : "text-slate-400"}`} />
                      <span>Upload foto bukti</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBuktiFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900 shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sisa utang setelah bayar</span>
                  <span
                    className={`font-bold tabular-nums ${
                      member.saldoUtangCache - payAmount <= 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatRupiah(Math.max(0, member.saldoUtangCache - payAmount))}
                    {payAmount > 0 && member.saldoUtangCache - payAmount > 0 ? " (Cicilan)" : ""}
                  </span>
                </div>
                <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayOpen(false);
                    setSelectedBonToPay(null);
                    setPayCatatan("");
                    setPayBuktiUrl(null);
                  }}
                  className="w-1/2 h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingPay ||
                    payAmount <= 0 ||
                    payAmount > member.saldoUtangCache ||
                    (payMethod === "TRANSFER" && !payBuktiUrl)
                  }
                  className="w-1/2 h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  {submittingPay
                    ? "Menyimpan..."
                    : payAmount > 0 && payAmount < member.saldoUtangCache
                    ? "Simpan Cicilan"
                    : "Simpan Bayar"}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BUKTI PEMBAYARAN */}
      {previewBuktiUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewBuktiUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800">Bukti Pembayaran</h4>
              <button
                type="button"
                onClick={() => setPreviewBuktiUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewBuktiUrl}
              alt="Bukti pembayaran"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-100 bg-slate-50"
            />
          </div>
        </div>
      )}


      {/* MODAL KOREKSI SALDO (User Story D7: Khusus Owner) */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Koreksi Saldo Piutang</h3>
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Gunakan angka positif (+) untuk menambah utang, atau angka minus (-) untuk memotong utang.
            </p>

            <form onSubmit={handleAdjustDebtSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Nilai Penyesuaian (+ / -) Rp
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={
                      adjustAmount === 0
                        ? ""
                        : adjustAmount < 0
                        ? `-${Math.abs(adjustAmount).toLocaleString("id-ID")}`
                        : adjustAmount.toLocaleString("id-ID")
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const isNeg = val.includes("-");
                      const digits = val.replace(/\D/g, "");
                      const num = digits ? parseInt(digits, 10) : 0;
                      setAdjustAmount(isNeg ? -num : num);
                    }}
                    placeholder="0 (ketik - untuk mengurangi)"
                    className="w-full pl-11 pr-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Alasan Koreksi (Wajib)
                </label>
                <input
                  type="text"
                  required
                  value={adjustCatatan}
                  onChange={(e) => setAdjustCatatan(e.target.value)}
                  placeholder="Contoh: Kesalahan catat bon fisik"
                  className="w-full mt-1.5 px-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust || adjustAmount === 0 || !adjustCatatan.trim()}
                  className="w-1/2 h-11 bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingAdjust ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE DRAWER TAMBAH KASBON MANUAL DENGAN RINCIAN */}
      {isManualKasbonOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setIsManualKasbonOpen(false)}
        >
          <datalist id="kasbon-units-suggestion">
            <option value="pcs" />
            <option value="kg" />
            <option value="bks" />
            <option value="dus" />
            <option value="btl" />
            <option value="ltr" />
            <option value="pak" />
            <option value="renteng" />
            <option value="sak" />
            <option value="tabung" />
            <option value="ikat" />
            <option value="kaleng" />
          </datalist>

          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-2xl shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col font-sans drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Tambah Kasbon Manual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{member.nama}</span>
                  {" · "}
                  {member.batasKasbon > 0 ? (
                    <span>Sisa limit {formatRupiah(member.sisaLimit)}</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Tanpa batas limit</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualKasbonOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualKasbon} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Info Transaksi */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={manualTanggal}
                      onChange={(e) => setManualTanggal(e.target.value)}
                      className="ctl-sm font-medium"
                    />
                  </div>

                  <div ref={pengambilDropdownRef} className="relative">
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Anggota Pengambil <span className="text-rose-500">*</span>
                    </label>
                    {member.subMembers && member.subMembers.length > 0 &&
                    [member.nama, ...member.subMembers].includes(manualPengambil) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsPengambilDropdownOpen((prev) => !prev)}
                          className="ctl-sm flex items-center justify-between text-left font-medium cursor-pointer"
                        >
                          <span className="truncate">{manualPengambil}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                              isPengambilDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isPengambilDropdownOpen && (
                          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100">
                            {[member.nama, ...member.subMembers].map((nameOption: string) => {
                              const isSelected = manualPengambil === nameOption;
                              return (
                                <button
                                  key={nameOption}
                                  type="button"
                                  onClick={() => {
                                    setManualPengambil(nameOption);
                                    setIsPengambilDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-semibold"
                                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                                  }`}
                                >
                                  <span className="truncate">{nameOption}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                </button>
                              );
                            })}
                            <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setManualPengambil("");
                                setIsPengambilDropdownOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              Ketik nama lain...
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Pak Joko"
                          value={manualPengambil}
                          onChange={(e) => setManualPengambil(e.target.value)}
                          className="ctl-sm pr-8 font-medium"
                        />
                        {member.subMembers && member.subMembers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualPengambil(member.nama);
                              setIsPengambilDropdownOpen(true);
                            }}
                            title="Pilih dari daftar"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Kasir
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUserName}
                      className="ctl-sm bg-slate-50 dark:bg-zinc-800/60 text-slate-500"
                    />
                  </div>
                </div>

                {/* Pencarian Cepat Produk Master */}
                <div ref={quickSearchRef} className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari produk dari data master (nama atau barcode)..."
                      value={quickProductSearch}
                      onFocus={() => {
                        fetchMasterProducts();
                        setIsQuickProductDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setQuickProductSearch(e.target.value);
                        setIsQuickProductDropdownOpen(true);
                      }}
                      className="w-full pl-9 pr-8 h-9 bg-slate-50/80 dark:bg-zinc-800 focus:bg-white border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    {quickProductSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickProductSearch("");
                          setIsQuickProductDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Hasil Pencarian Master Produk */}
                  {isQuickProductDropdownOpen && quickProductSearch.trim() && (
                    <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 p-1 font-sans">
                      {masterProducts
                        .filter((p) => {
                          const q = quickProductSearch.toLowerCase().trim();
                          return (
                            p.nama?.toLowerCase().includes(q) ||
                            p.barcode?.toLowerCase().includes(q) ||
                            p.kategori?.nama?.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 20)
                        .map((p) => {
                          const satuanList =
                            Array.isArray(p.satuanProduk) && p.satuanProduk.length > 0
                              ? p.satuanProduk
                              : [{ id: "default", namaSatuan: p.satuanDasar || "pcs", hargaJual: 0 }];

                          if (satuanList.length === 1) {
                            const s = satuanList[0];
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectMasterProduct(p, s)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-xs transition-colors group cursor-pointer"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600">
                                    {p.nama}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {s.namaSatuan || p.satuanDasar}
                                    {p.barcode ? ` · ${p.barcode}` : ""}
                                  </p>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 shrink-0 pl-3">
                                  {formatRupiah(s.hargaJual)}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <div
                              key={p.id}
                              className="px-3 py-2 hover:bg-slate-50/70 dark:hover:bg-zinc-800/60 rounded-lg text-xs transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="font-semibold text-slate-800 dark:text-zinc-100">
                                  {p.nama}
                                </p>
                                {p.barcode && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {p.barcode}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {satuanList.map((s: any, sIdx: number) => (
                                  <button
                                    key={s.id || sIdx}
                                    type="button"
                                    onClick={() => handleSelectMasterProduct(p, s)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-950/50 text-slate-700 hover:text-blue-600 dark:text-zinc-300 border border-slate-200/80 hover:border-blue-200 text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  >
                                    <span>{s.namaSatuan || p.satuanDasar}</span>
                                    <span className="font-bold text-slate-900 dark:text-zinc-100">
                                      {formatRupiah(s.hargaJual)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                      {masterProducts.filter((p) => {
                        const q = quickProductSearch.toLowerCase().trim();
                        return (
                          p.nama?.toLowerCase().includes(q) ||
                          p.barcode?.toLowerCase().includes(q) ||
                          p.kategori?.nama?.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400">
                          Produk tidak ditemukan. Ketik manual di tabel di bawah.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Catatan Tambahan (di bawah search bar) */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Titip ke anaknya, diambil sore hari"
                    value={manualCatatan}
                    onChange={(e) => setManualCatatan(e.target.value)}
                    className="ctl-sm"
                  />
                </div>

                {/* Daftar Barang Belanja */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Daftar Barang ({manualItems.length})
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Tekan Enter di kolom harga untuk tambah baris
                    </span>
                  </div>

                  <div className="border border-slate-200/90 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-medium text-slate-400">
                          <tr>
                            <th className="py-2 px-3 font-medium">Barang</th>
                            <th className="py-2 px-1.5 w-16 text-center font-medium">Qty</th>
                            <th className="py-2 px-1.5 w-20 text-center font-medium">Satuan</th>
                            <th className="py-2 px-2 w-28 text-right font-medium">Harga</th>
                            <th className="py-2 px-3 w-24 text-right font-medium">Subtotal</th>
                            <th className="py-2 px-1.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {manualItems.map((item, idx) => {
                            const isLast = idx === manualItems.length - 1;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nama barang..."
                                    value={item.nama}
                                    onChange={(e) => handleManualItemChange(idx, "nama", e.target.value)}
                                    className="w-full px-2.5 h-8 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none transition-colors"
                                  />
                                </td>
                                <td className="py-2 px-1">
                                  <NumberInput
                                    min={0.1}
                                    emptyFallback={1}
                                    required
                                    value={item.qty}
                                    onChange={(val) => handleManualItemChange(idx, "qty", String(val))}
                                    className="w-full px-1.5 h-8 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg text-xs font-semibold text-center text-slate-800 dark:text-zinc-100 focus:outline-none transition-colors"
                                  />
                                </td>
                                <td className="py-2 px-1">
                                  <input
                                    type="text"
                                    required
                                    list="kasbon-units-suggestion"
                                    value={item.satuan}
                                    onChange={(e) => handleManualItemChange(idx, "satuan", e.target.value)}
                                    className="w-full px-1.5 h-8 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg text-xs text-center text-slate-600 dark:text-zinc-300 focus:outline-none transition-colors"
                                  />
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      Rp
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      required
                                      placeholder="0"
                                      value={item.harga ? item.harga.toLocaleString("id-ID") : ""}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          if (isLast) handleAddManualItem();
                                        }
                                      }}
                                      onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "");
                                        handleManualItemChange(idx, "harga", digits ? parseInt(digits, 10) : 0);
                                      }}
                                      className="w-full pl-6 pr-2 h-8 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg text-xs text-right font-semibold text-slate-800 dark:text-zinc-100 focus:outline-none transition-colors"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-800 dark:text-zinc-200 text-xs">
                                  {formatRupiah(item.subtotal)}
                                </td>
                                <td className="py-2 px-1.5 text-center">
                                  {manualItems.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveManualItem(idx)}
                                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                                      title="Hapus baris"
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

                    <div className="px-3 py-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="h-7 px-2.5 text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Baris</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">Total Belanja Kasbon</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">
                      ({manualItems.filter((i) => i.nama.trim()).length} barang)
                    </span>
                  </div>
                  <span className="text-lg font-black text-slate-900 dark:text-zinc-100 tabular-nums">
                    {formatRupiah(totalManualBelanja)}
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsManualKasbonOpen(false)}
                    className="w-1/3 h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManual || totalManualBelanja <= 0}
                    className="w-2/3 h-10 bg-slate-900 hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold rounded-xl text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submittingManual ? "Menyimpan..." : "Simpan Kasbon Manual"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH LIMIT KASBON MEMBER */}
      {isEditLimitOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Ubah Batas Limit Kasbon</span>
              </h3>
              <button
                onClick={() => setIsEditLimitOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Atur plafon maksimal kasbon belanja untuk <strong>{member.nama}</strong>. Standar toko adalah <strong>Rp 1.000.000</strong>.
            </p>

            <form onSubmit={handleUpdateLimit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Plafon Batas Kasbon (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newLimitKasbon ? newLimitKasbon.toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setNewLimitKasbon(digits ? parseInt(digits, 10) : 0);
                    }}
                    placeholder="1.000.000"
                    className="w-full pl-10 pr-3.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tombol preset cepat */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                {[500000, 1000000, 2000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewLimitKasbon(preset)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md text-[10px] font-medium text-slate-600 transition-colors"
                  >
                    {formatRupiah(preset)}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditLimitOpen(false)}
                  className="w-1/2 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingLimit}
                  className="w-1/2 h-9 bg-slate-900 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white font-medium rounded-xl text-xs shadow-2xs transition-all"
                >
                  {submittingLimit ? "Menyimpan..." : "Simpan Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PIN VERIFICATION */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
        }}
        onSuccess={handlePinVerifiedForEdit}
        title="Otorisasi PIN Pemilik"
        description="Mengubah data dan rincian nota bon memerlukan PIN Pemilik Toko untuk menjaga integritas pembukuan piutang."
      />

      {/* MODAL EDIT KASBON MANUAL (DENGAN PIN OWNER) */}
      {isEditBonOpen && bonToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-600" />
                  <span>Edit Rincian Nota Bon ({bonToEdit.label})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pelanggan: <strong className="text-slate-800">{member.nama}</strong> · Memerlukan otorisasi PIN Pemilik Toko
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditBonOpen(false);
                  setBonToEdit(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditBon} className="flex-1 overflow-y-auto space-y-4 py-3.5 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full px-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Anggota Pengambil *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPengambil}
                    onChange={(e) => setEditPengambil(e.target.value)}
                    className="w-full px-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tabel Rincian Belanja Edit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Barang Belanja ({editItems.length} Baris)
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    💡 Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-700">Enter</kbd> di kolom harga untuk tambah baris
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[560px]">
                      <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center text-slate-400 font-mono">#</th>
                          <th className="py-2.5 px-3">Nama Barang</th>
                          <th className="py-2.5 px-2 w-20 text-center">Jumlah</th>
                          <th className="py-2.5 px-2 w-24 text-center">Satuan</th>
                          <th className="py-2.5 px-3 w-32 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {editItems.map((item, idx) => {
                          const isLast = idx === editItems.length - 1;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  required
                                  list="kasbon-items-suggestion"
                                  placeholder="Nama barang..."
                                  value={item.nama}
                                  onChange={(e) => handleEditItemChange(idx, "nama", e.target.value)}
                                  className="w-full px-2.5 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <NumberInput
                                  min={0.1}
                                  emptyFallback={1}
                                  required
                                  value={item.qty}
                                  onChange={(val) => handleEditItemChange(idx, "qty", String(val))}
                                  className="w-full px-2 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  required
                                  list="kasbon-units-suggestion"
                                  value={item.satuan}
                                  onChange={(e) => handleEditItemChange(idx, "satuan", e.target.value)}
                                  className="w-full px-2 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-center text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                                    Rp
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    placeholder="0"
                                    value={item.harga ? item.harga.toLocaleString("id-ID") : ""}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (isLast) handleAddEditItem();
                                      }
                                    }}
                                    onChange={(e) => {
                                      const digits = e.target.value.replace(/\D/g, "");
                                      handleEditItemChange(idx, "harga", digits ? parseInt(digits, 10) : 0);
                                    }}
                                    className="w-full pl-7 pr-2 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-right font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 text-xs">
                                {formatRupiah(item.subtotal)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {editItems.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditItem(idx)}
                                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors mx-auto"
                                    title="Hapus baris ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="w-7 h-7 block" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Tombol Tambah Baris */}
                  <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleAddEditItem}
                      className="h-7 px-3 bg-white hover:bg-amber-50 hover:text-amber-600 border border-slate-200 hover:border-amber-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all duration-150 active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tambah Baris Barang</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Total item: <strong className="text-slate-700">{editItems.length}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Belanja */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                    Total Belanja Bon Baru
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Saldo utang member akan disesuaikan otomatis dengan selisih nominal baru.
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-black text-amber-900 tabular-nums">
                    {formatRupiah(totalEditBelanja)}
                  </span>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Perubahan atas permintaan pengambil"
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className="w-full px-3 h-8.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditBonOpen(false);
                    setBonToEdit(null);
                  }}
                  className="w-1/3 h-10 bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || totalEditBelanja <= 0}
                  className="w-2/3 h-10 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-medium rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Perubahan Bon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isReconcileOpen}
        title="Audit Rekonsiliasi Kasbon?"
        description="Sistem akan membandingkan saldo kasbon pelanggan dengan seluruh mutasi ledger."
        confirmText="Ya, Jalankan Audit"
        variant="default"
        loading={reconciling}
        onConfirm={confirmReconcile}
        onCancel={() => !reconciling && setIsReconcileOpen(false)}
      />
    </div>
  );
}
