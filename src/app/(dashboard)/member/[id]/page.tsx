"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
} from "lucide-react";
import { formatRupiah, formatDateTime, formatDecimal, formatDayDate } from "@/lib/formatters";
import { generateBonMemberPDF } from "@/lib/pdf-bon-member";
import { PinModal } from "@/components/shared/PinModal";

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
  const [selectedBonToPay, setSelectedBonToPay] = useState<any>(null);
  const [submittingPay, setSubmittingPay] = useState(false);

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

    // Urutkan sesuai tanggal (ASC = Terlama -> Terbaru, DESC = Terbaru -> Terlama)
    list.sort((a, b) => {
      const timeA = a.dibuatPada.getTime();
      const timeB = b.dibuatPada.getTime();
      return sortOrder === "ASC" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [member, sortOrder]);

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

  const handleReconcile = async () => {
    if (!confirm("Jalankan audit rekonsiliasi saldo kasbon vs mutasi ledger?")) return;
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
      fetchMember();
    } catch (err: any) {
      setError(err.message);
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
      if (res.ok && Array.isArray(data)) {
        setMasterProducts(data);
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

  const handleSelectMasterProduct = (product: any) => {
    const defaultSatuan =
      product.satuanProduk?.find((s: any) => s.isDefault) ||
      product.satuanProduk?.[0] ||
      { namaSatuan: product.satuanDasar || "pcs", hargaJual: 0 };

    const newItem: ManualItemRow = {
      nama: product.nama,
      qty: 1,
      satuan: defaultSatuan.namaSatuan || product.satuanDasar || "pcs",
      harga: defaultSatuan.hargaJual || 0,
      subtotal: (defaultSatuan.hargaJual || 0) * 1,
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
      const res = await fetch(`/api/members/${memberId}/manual-kasbon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: manualTanggal ? new Date(manualTanggal).toISOString() : new Date().toISOString(),
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
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Memuat data rincian kasbon member...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Member tidak ditemukan.</p>
        <button onClick={() => router.push("/member")} className="mt-3 text-blue-600 font-bold">
          Kembali ke Daftar Member
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
    <div className="w-full pb-12 select-none">
      <div className="space-y-2">
      {/* Tombol Kembali */}
      <div className="pb-2">
        <button
          onClick={() => router.push("/member")}
          className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Member</span>
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
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-40 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Terima pembayaran utang</span>
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

              {/* Group 3: Owner Controls */}
              {currentUserRole === "OWNER" && (
                <div className="px-1.5 py-1 space-y-0.5">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Kontrol Owner
                  </span>
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setAdjustAmount(0);
                      setAdjustCatatan("");
                      setIsAdjustOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors font-semibold"
                  >
                    <Pencil className="w-4 h-4 text-amber-500" />
                    <span>Koreksi Saldo Manual</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleReconcile();
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors font-semibold"
                  >
                    <Scale className="w-4 h-4 text-indigo-500" />
                    <span>Rekonsiliasi Saldo Kasbon</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification Popup di Pojok Kanan Atas */}
      <div className="fixed top-5 right-5 z-50 max-w-sm w-full space-y-2.5 pointer-events-none">
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

      {/* Ringkasan 3 Kolom (Flat Editorial Style + Progress Bar Limit) */}
      <div className="py-6 border-b border-slate-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* 1. Nama member */}
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Nama member
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
              {member.nama}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {member.telepon || "Tanpa No HP"} {member.alamat ? `· ${member.alamat}` : ""}
            </p>
          </div>

          {/* 2. Limit semua maks + Progress Bar */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                Limit semua maks
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewLimitKasbon(limitMax);
                  setIsEditLimitOpen(true);
                }}
                className="text-xs text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-medium underline underline-offset-4 cursor-pointer"
              >
                Ubah limit
              </button>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
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
          <div>
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
      <div className="pt-2">
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
              onClick={() => setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))}
              className="pb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Klik untuk mengubah urutan tanggal nota"
            >
              <span>{sortOrder === "ASC" ? "Terlama dulu ↓" : "Terbaru dulu ↑"}</span>
            </button>
          )}
        </div>

        <div className="pt-1">
          {activeTab === "KASBON" && (
            <div>
              {allKasbonEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada transaksi kasbon yang tercatat.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Catat kasbon dari Kasir (POS) atau klik tombol &quot;Tambah Kasbon Manual&quot; di atas.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {/* Render Semua Bon Kasbon Sesuai Tanggal */}
                  {allKasbonEntries.map((bon: any, idx: number) => {
                    const bonNumber = sortOrder === "ASC" ? idx + 1 : allKasbonEntries.length - idx;
                    const isManual = bon.tipe === "MANUAL";
                    const cleanLabel = String(bon.label || "").replace(/^ID Bon:\s*/i, "");

                    return (
                      <div key={bon.id} className="py-6 space-y-4 font-sans">
                        {/* Header Info: Bon X · Hari, Tanggal | Diambil oleh | Diterima oleh */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                          <div className="sm:col-span-6">
                            <p className="font-semibold text-slate-900 dark:text-zinc-100">
                              Bon {bonNumber} · {formatDayDate(bon.dibuatPada)}
                            </p>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 block">
                              {cleanLabel}
                            </span>
                          </div>
                          <div className="sm:col-span-3">
                            <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">
                              Diambil oleh
                            </span>
                            <p className="font-medium text-slate-900 dark:text-zinc-100 mt-0.5">
                              {bon.pengambil}
                            </p>
                          </div>
                          <div className="sm:col-span-3 sm:text-right">
                            <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">
                              Diterima oleh
                            </span>
                            <p className="font-medium text-slate-900 dark:text-zinc-100 mt-0.5">
                              {bon.kasir}
                            </p>
                          </div>
                        </div>

                        {/* List Barang */}
                        <div className="space-y-1.5 text-xs pt-1">
                          {bon.items && bon.items.length > 0 ? (
                            bon.items.map((it: any, iIdx: number) => (
                              <div
                                key={it.id || iIdx}
                                className="flex justify-between items-baseline gap-4 py-0.5"
                              >
                                <div className="text-slate-900 dark:text-zinc-100">
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
                            <p className="text-slate-400 italic text-xs">- Tidak ada rincian item</p>
                          )}
                          {bon.keterangan && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic pt-1">
                              Catatan: &ldquo;{bon.keterangan}&rdquo;
                            </p>
                          )}
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
                                <span>Edit bon (PIN)</span>
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
                            className="text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-40 disabled:no-underline cursor-pointer"
                          >
                            Bayar bon ini
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "PEMBAYARAN" && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase font-sans tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">No. Bukti</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Nominal Bayar</th>
                  <th className="py-2.5 px-3">Diterima Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {(member.kasbonPembayaran || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-sans">
                      Belum ada riwayat pembayaran utang.
                    </td>
                  </tr>
                ) : (
                  member.kasbonPembayaran.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-2.5 px-3 font-bold text-[#F0090F]">{p.nomorBukti}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDateTime(p.dibuatPada)}</td>
                      <td className="py-2.5 px-3">{p.metode}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        {formatRupiah(p.jumlah)}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                        {p.kasir?.nama || "Kasir"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>

      {/* MODAL BAYAR UTANG (User Story D4) */}
      {isPayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Terima Pembayaran Utang</h3>
              <button
                type="button"
                onClick={() => {
                  setIsPayOpen(false);
                  setSelectedBonToPay(null);
                  setPayCatatan("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pelanggan: <strong>{member.nama}</strong> · Total Utang:{" "}
              <strong>{formatRupiah(member.saldoUtangCache)}</strong>
            </p>

            {selectedBonToPay && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Membayar Bon:</span>
                  <span className="font-bold text-[#F0090F]">{selectedBonToPay.label}</span>
                </div>
                <span className="font-extrabold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                  {formatRupiah(selectedBonToPay.sisa > 0 ? selectedBonToPay.sisa : selectedBonToPay.total)}
                </span>
              </div>
            )}

            <form onSubmit={handlePayDebtSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Jumlah Pembayaran (Rp)
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={payAmount ? payAmount.toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setPayAmount(digits ? parseInt(digits, 10) : 0);
                    }}
                    placeholder="0"
                    className="w-full pl-11 pr-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans font-bold text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPayMethod("TUNAI")}
                    className={`h-10 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === "TUNAI"
                        ? "bg-[#F0090F] text-white border-[#F0090F] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    TUNAI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("TRANSFER")}
                    className={`h-10 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === "TRANSFER"
                        ? "bg-[#F0090F] text-white border-[#F0090F] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    TRANSFER
                  </button>
                </div>
              </div>

              {payMethod === "TUNAI" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                    Uang Diterima dari Pelanggan (Rp)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
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
                      className="w-full pl-11 pr-3.5 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-sans font-bold text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-sans font-bold mt-2 text-slate-700">
                    <span>Kembalian:</span>
                    <span className="text-emerald-600 font-black">{formatRupiah(payKembalian)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Titip lewat tetangga"
                  value={payCatatan}
                  onChange={(e) => setPayCatatan(e.target.value)}
                  className="w-full mt-1.5 px-3.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-sans"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayOpen(false);
                    setSelectedBonToPay(null);
                    setPayCatatan("");
                  }}
                  className="w-1/2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPay || payAmount <= 0}
                  className="w-1/2 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submittingPay ? "Menyimpan..." : "Simpan Bayar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL KOREKSI SALDO (User Story D7: Khusus Owner) */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Koreksi Saldo Kasbon (Owner)</h3>
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

      {/* MODAL TAMBAH KASBON MANUAL DENGAN RINCIAN */}
      {isManualKasbonOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          {/* Datalist Bantuan Input Cepat dari Master Produk */}
          <datalist id="kasbon-items-suggestion">
            {masterProducts.map((p) => (
              <option key={p.id} value={p.nama} />
            ))}
            <option value="Beras Ramos 5kg" />
            <option value="Beras Pandan Wangi 5kg" />
            <option value="Minyak Goreng 1L" />
            <option value="Minyak Goreng 2L" />
            <option value="Gula Pasir 1kg" />
            <option value="Telur Ayam 1kg" />
            <option value="Terigu Segitiga Biru 1kg" />
            <option value="Mie Instan Goreng" />
            <option value="Mie Instan Kuah" />
            <option value="Kopi Kapal Api Sachet" />
            <option value="Susu Kental Manis Kaleng" />
            <option value="Gas LPG 3kg" />
            <option value="Galon Air Mineral" />
            <option value="Rokok Surya 16" />
            <option value="Rokok Sampoerna Mild" />
            <option value="Sabun Cuci Piring" />
          </datalist>

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

          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col font-sans">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-slate-800" />
                  <span>Tambah Kasbon Manual</span>
                </h3>
                <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Pelanggan: <strong className="text-slate-800">{member.nama}</strong></span>
                  <span>·</span>
                  <span>
                    Limit:{" "}
                    {member.batasKasbon > 0 ? (
                      <span className="font-semibold text-slate-700">
                        Sisa {formatRupiah(member.sisaLimit)} (dari {formatRupiah(member.batasKasbon)})
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
                        Bebas / Tanpa Plafon Limit
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsManualKasbonOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualKasbon} className="flex-1 overflow-y-auto space-y-4 py-3.5 pr-1">
              {/* Header Info Transaksi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualTanggal}
                    onChange={(e) => setManualTanggal(e.target.value)}
                    className="w-full px-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Nama Pengambil *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pak Joko / Istri"
                    value={manualPengambil}
                    onChange={(e) => setManualPengambil(e.target.value)}
                    className="w-full px-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Kasir Pencatat
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUserName}
                    className="w-full px-3 h-8.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                  />
                </div>
              </div>

              {/* Bar Pencarian Cepat Produk Master */}
              <div ref={quickSearchRef} className="relative">
                <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/90 rounded-2xl p-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="🔍 Cari & tambah produk dari data master (nama atau barcode)..."
                      value={quickProductSearch}
                      onFocus={() => {
                        fetchMasterProducts();
                        setIsQuickProductDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setQuickProductSearch(e.target.value);
                        setIsQuickProductDropdownOpen(true);
                      }}
                      className="w-full pl-9 pr-8 h-9 bg-white border border-blue-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
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
                </div>

                {/* Dropdown Hasil Pencarian Master Produk */}
                {isQuickProductDropdownOpen && quickProductSearch.trim() && (
                  <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 font-sans">
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
                        const defaultSatuan =
                          p.satuanProduk?.find((s: any) => s.isDefault) ||
                          p.satuanProduk?.[0] ||
                          { namaSatuan: p.satuanDasar || "pcs", hargaJual: 0 };

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectMasterProduct(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50/80 rounded-xl flex items-center justify-between text-xs transition-colors group cursor-pointer border border-transparent hover:border-blue-100"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-blue-600">
                                {p.nama}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {p.kategori?.nama ? `${p.kategori.nama} · ` : ""}
                                {p.barcode ? `Barcode: ${p.barcode} · ` : ""}
                                Satuan: <span className="font-medium text-slate-600">{defaultSatuan.namaSatuan || p.satuanDasar}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0 pl-3">
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 block">
                                {formatRupiah(defaultSatuan.hargaJual)}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                                <Plus className="w-3 h-3" /> Tambah
                              </span>
                            </div>
                          </button>
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
                      <div className="py-5 text-center text-xs text-slate-400">
                        Produk &quot;{quickProductSearch}&quot; tidak ditemukan di master data. Anda tetap dapat mengetik manual langsung di tabel.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tabel Rincian Belanja Barang yang Rapi & Jelas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Barang Belanja ({manualItems.length} Baris)
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
                        {manualItems.map((item, idx) => {
                          const isLast = idx === manualItems.length - 1;
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
                                  onChange={(e) => handleManualItemChange(idx, "nama", e.target.value)}
                                  className="w-full px-2.5 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  step="any"
                                  min={0.1}
                                  required
                                  value={item.qty}
                                  onChange={(e) => handleManualItemChange(idx, "qty", e.target.value)}
                                  className="w-full px-2 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  required
                                  list="kasbon-units-suggestion"
                                  value={item.satuan}
                                  onChange={(e) => handleManualItemChange(idx, "satuan", e.target.value)}
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
                                        if (isLast) handleAddManualItem();
                                      }
                                    }}
                                    onChange={(e) => {
                                      const digits = e.target.value.replace(/\D/g, "");
                                      handleManualItemChange(idx, "harga", digits ? parseInt(digits, 10) : 0);
                                    }}
                                    className="w-full pl-7 pr-2 h-8 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-right font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 text-xs">
                                {formatRupiah(item.subtotal)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {manualItems.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveManualItem(idx)}
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
                      onClick={handleAddManualItem}
                      className="h-7 px-3 bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all duration-150 active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tambah Baris Barang</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Total item: <strong className="text-slate-700">{manualItems.length}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Belanja Kasbon */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Belanja Kasbon
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {manualItems.filter((i) => i.nama.trim()).length} barang terisi · Otomatis menambah saldo utang kasbon member
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                    {formatRupiah(totalManualBelanja)}
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
                  placeholder="Contoh: Titip ke anaknya, diambil sore hari"
                  value={manualCatatan}
                  onChange={(e) => setManualCatatan(e.target.value)}
                  className="w-full px-3 h-8.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex gap-2.5 pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsManualKasbonOpen(false)}
                  className="w-1/3 h-10 bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingManual || totalManualBelanja <= 0}
                  className="w-2/3 h-10 bg-slate-900 hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-medium rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submittingManual ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <span>Simpan Kasbon Manual</span>
                      {totalManualBelanja > 0 && (
                        <span className="font-bold text-blue-200">
                          · {formatRupiah(totalManualBelanja)}
                        </span>
                      )}
                    </>
                  )}
                </button>
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
                    Nama Pengambil *
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
                                <input
                                  type="number"
                                  step="any"
                                  min={0.1}
                                  required
                                  value={item.qty}
                                  onChange={(e) => handleEditItemChange(idx, "qty", e.target.value)}
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
    </div>
  );
}
