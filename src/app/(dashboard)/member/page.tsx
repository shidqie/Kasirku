"use client";

import { useEffect, useState, useMemo } from "react";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  CreditCard,
  UserCheck,
  FileText,
  Phone,
  Check,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { formatMemberCode } from "@/lib/codification";
import { generateAllMembersPDF } from "@/lib/pdf-bon-member";
import { Pagination } from "@/components/shared/Pagination";
import { DataTable, DataTableHeader, DataTableHead, DataTableBody, DataTableEmpty } from "@/components/shared/DataTable";
import { TableSearchRow, TableFilterPills } from "@/components/shared/TableToolbar";

interface MemberItem {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  subMembers?: string[];
  batasKasbon: number;
  saldoUtangCache: number;
  sisaLimit: number;
  hasOldDebt: boolean;
  aktif: boolean;
}

type DebtFilter = "ALL" | "DEBT" | "CLEARED";

export default function MemberListPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDebt, setFilterDebt] = useState<DebtFilter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadingAllPdf, setDownloadingAllPdf] = useState(false);

  // Pagination & Selection PDF
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPdfSelectMode, setIsPdfSelectMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Modal Tambah Member (CREATE)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newTelepon, setNewTelepon] = useState("");
  const [newAlamat, setNewAlamat] = useState("");
  const [newSubMembers, setNewSubMembers] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState("");
  const [newSaldoAwal, setNewSaldoAwal] = useState<number>(0);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal Edit Member (UPDATE)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editTelepon, setEditTelepon] = useState("");
  const [editAlamat, setEditAlamat] = useState("");
  const [editSubMembers, setEditSubMembers] = useState<string[]>([]);
  const [editSubInput, setEditSubInput] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Hapus Member (DELETE)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<MemberItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/members?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search]);

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

  // Statistik Ringkasan Piutang
  const totalPelanggan = members.length;
  const totalPiutang = members.reduce((acc, m) => acc + (m.saldoUtangCache || 0), 0);
  const memberBerutang = members.filter((m) => (m.saldoUtangCache || 0) > 0).length;
  const memberLunas = totalPelanggan - memberBerutang;

  // Filter Data Berdasarkan Status Utang
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const debt = m.saldoUtangCache || 0;
      if (filterDebt === "DEBT") return debt > 0;
      if (filterDebt === "CLEARED") return debt <= 0;
      return true;
    });
  }, [members, filterDebt]);

  // 1. CREATE: Tambah Member Baru
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }

    setSubmittingAdd(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: newNama.trim(),
          telepon: newTelepon.trim() || null,
          alamat: newAlamat.trim() || null,
          subMembers: newSubMembers,
          batasKasbon: 1000000,
          saldoAwal: Number(newSaldoAwal),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftarkan pelanggan piutang");

      setSuccess(`Pelanggan "${newNama}" berhasil ditambahkan!`);
      setIsAddOpen(false);
      setNewNama("");
      setNewTelepon("");
      setNewAlamat("");
      setNewSubMembers([]);
      setNewSubInput("");
      setNewSaldoAwal(0);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 2. UPDATE: Edit Member
  const handleOpenEdit = (m: MemberItem) => {
    setEditingMember(m);
    setEditNama(m.nama);
    setEditTelepon(m.telepon || "");
    setEditAlamat(m.alamat || "");
    setEditSubMembers(Array.isArray(m.subMembers) ? m.subMembers : []);
    setEditSubInput("");
    setError(null);
    setIsEditOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editNama.trim()) {
      setError("Nama pelanggan tidak boleh kosong");
      return;
    }

    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editNama.trim(),
          telepon: editTelepon.trim() || null,
          alamat: editAlamat.trim() || null,
          subMembers: editSubMembers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui data pelanggan");

      setSuccess(`Data "${editNama}" berhasil diperbarui!`);
      setIsEditOpen(false);
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 3. DELETE: Hapus / Nonaktifkan Member
  const handleOpenDelete = (m: MemberItem) => {
    setDeletingMember(m);
    setError(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;
    setSubmittingDelete(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/members/${deletingMember.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pelanggan");

      setSuccess(data.message || `Data "${deletingMember.nama}" berhasil dihapus.`);
      setIsDeleteOpen(false);
      setDeletingMember(null);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
      setIsDeleteOpen(false);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const memberCodeMap = useMemo(() => {
    const sorted = [...members].sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
    const map: Record<string, string> = {};
    sorted.forEach((m: any, idx: number) => {
      map[m.id] = formatMemberCode(idx + 1);
    });
    return map;
  }, [members]);

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedMemberIds.includes(m.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredMembers.map((m) => m.id));
      setSelectedMemberIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedMemberIds, ...filteredMembers.map((m) => m.id)]);
      setSelectedMemberIds(Array.from(merged));
    }
  };

  const handleDownloadAllPDF = async () => {
    const targetMembers =
      selectedMemberIds.length > 0
        ? filteredMembers.filter((m) => selectedMemberIds.includes(m.id))
        : filteredMembers;

    if (targetMembers.length === 0) return;
    setDownloadingAllPdf(true);
    try {
      let storeInfo = { namaToko: "Toko Sembako" } as any;
      try {
        const sRes = await fetch("/api/settings");
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData?.settings) storeInfo = sData.settings;
        }
      } catch {}

      const filterLabel =
        selectedMemberIds.length > 0
          ? `${targetMembers.length} Pelanggan Terpilih`
          : filterDebt === "DEBT"
          ? "Punya Utang"
          : filterDebt === "CLEARED"
          ? "Lunas"
          : "Semua Pelanggan";

      const detailList = await Promise.all(
        targetMembers.map(async (m) => {
          try {
            const res = await fetch(`/api/members/${m.id}`);
            if (res.ok) {
              const d = await res.json();
              return d?.member || undefined;
            }
          } catch {}
          return undefined;
        })
      );

      await generateAllMembersPDF(
        targetMembers.map((m, i) => ({
          kode: memberCodeMap[m.id] || "MBR-0001",
          nama: m.nama,
          telepon: m.telepon,
          alamat: m.alamat,
          batasKasbon: m.batasKasbon,
          saldoUtangCache: m.saldoUtangCache,
          detail: detailList[i],
        })),
        storeInfo,
        filterLabel
      );

      if (isPdfSelectMode) {
        setIsPdfSelectMode(false);
        setSelectedMemberIds([]);
      }
    } catch (err: any) {
      setError(err?.message || "Gagal membuat PDF rekap pelanggan");
    } finally {
      setDownloadingAllPdf(false);
    }
  };

  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      <div className="shrink-0 space-y-2">
      {/* Header Utama Minimalis (Flat Editorial Style) */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Data Piutang &amp; Kasbon Pelanggan
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Kelola data pelanggan, pantau status kasbon, dan rincian mutasi piutang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          {!isPdfSelectMode ? (
            <>
              <button
                type="button"
                disabled={downloadingAllPdf || filteredMembers.length === 0}
                onClick={() => {
                  setSelectedMemberIds([]);
                  setIsPdfSelectMode(true);
                }}
                className="h-10 px-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 active:scale-95 disabled:opacity-40 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl transition-all text-xs cursor-pointer"
                title="Pilih pelanggan tertentu untuk diunduh ke PDF"
              >
                Pilih PDF
              </button>

              <button
                type="button"
                disabled={downloadingAllPdf || filteredMembers.length === 0}
                onClick={handleDownloadAllPDF}
                className="h-10 px-4 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 active:scale-95 disabled:opacity-40 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl transition-all text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{downloadingAllPdf ? "Membuat PDF..." : "Unduh PDF Semua"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsPdfSelectMode(false);
                  setSelectedMemberIds([]);
                }}
                className="h-10 px-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl transition-all text-xs cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={downloadingAllPdf || selectedMemberIds.length === 0}
                onClick={handleDownloadAllPDF}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white active:scale-95 disabled:opacity-40 font-semibold rounded-xl transition-all text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>
                  {downloadingAllPdf
                    ? "Membuat PDF..."
                    : `Unduh PDF Terpilih (${selectedMemberIds.length})`}
                </span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all text-xs cursor-pointer"
          >
            Tambah pelanggan
          </button>
        </div>
      </div>

      {/* Ringkasan 3 Kolom (Flat Editorial Style + Hairline Dividers) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-zinc-800 border-b border-slate-200 dark:border-zinc-800">
        <div className="py-5 sm:pr-6">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
            Total pelanggan
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
            {totalPelanggan}{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">orang</span>
          </p>
        </div>

        <div className="py-5 sm:px-6">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
            Total saldo piutang
          </span>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1 tabular-nums">
            {formatRupiah(totalPiutang)}
          </p>
        </div>

        <div className="py-5 sm:pl-6">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
            Pelanggan berutang
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
            {memberBerutang}{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
              dari {totalPelanggan} orang
            </span>
          </p>
        </div>
      </div>

      {/* Filter Tab Garis Bawah & Pencarian Minimalis */}
      <TableSearchRow
        value={search}
        onChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        placeholder="Cari nama atau no. HP pelanggan"
        onRefresh={fetchMembers}
        loading={loading}
      />

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <TableFilterPills
          value={filterDebt}
          onChange={(val) => {
            setFilterDebt(val);
            setCurrentPage(1);
          }}
          items={[
            { value: "ALL", label: "Semua", count: members.length },
            { value: "DEBT", label: "Punya utang", count: memberBerutang, accent: "amber" },
            { value: "CLEARED", label: "Lunas", count: memberLunas },
          ]}
        />
        {!loading && (
          <span className="text-slate-400 dark:text-zinc-500 text-[11px] tabular-nums shrink-0 pt-2">
            {Math.min(currentPage * pageSize, filteredMembers.length)} dari {filteredMembers.length} pelanggan
          </span>
        )}
      </div>

      {/* Toast Notification Popup di Pojok Kanan Atas */}
      <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full space-y-2.5 pointer-events-none">
        {success && (
          <div className="pointer-events-auto p-4 bg-white/95 backdrop-blur-md border border-emerald-200/90 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-900 mb-0.5">Berhasil!</p>
              <p className="text-slate-600 leading-relaxed font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="pointer-events-auto p-4 bg-white/95 backdrop-blur-md border border-rose-200/90 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-900 mb-0.5">Terjadi Kendala</p>
              <p className="text-slate-600 leading-relaxed font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Tabel Daftar Member Minimalist (Scrollable Internal, Sticky Header) */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* Mobile Card List (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Memuat data pelanggan...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              {search
                ? "Tidak ada pelanggan yang cocok dengan pencarian."
                : filterDebt === "DEBT"
                ? "Tidak ada pelanggan yang memiliki utang aktif saat ini."
                : "Belum ada data pelanggan piutang."}
            </div>
          ) : (
            paginatedMembers.map((m) => {
              const hasDebt = (m.saldoUtangCache || 0) > 0;
              return (
                <div key={m.id} className="py-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isPdfSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(m.id)}
                          onChange={() => toggleSelectMember(m.id)}
                          aria-label={`Pilih ${m.nama} untuk PDF`}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                        />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/member/${m.id}`}
                          className="font-semibold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2 truncate"
                        >
                          <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                            {memberCodeMap[m.id]}
                          </span>
                          <span className="truncate">{m.nama}</span>
                        </Link>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {m.telepon || "Tanpa No. HP"} {m.alamat ? `· ${m.alamat}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">Total utang</span>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          hasDebt ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {formatRupiah(m.saldoUtangCache || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/member/${m.id}`}
                      className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Detail Bon</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-amber-600 text-xs font-semibold flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(m)}
                      className="h-10 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DataTable className="hidden md:table">
            <DataTableHeader>
              <tr>
                {isPdfSelectMode && (
                  <DataTableHead className="pl-1 pr-2 w-9">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="Pilih semua pelanggan untuk PDF"
                      title="Pilih semua pelanggan"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </DataTableHead>
                )}
                <DataTableHead>Nama pelanggan</DataTableHead>
                <DataTableHead>No. HP / WA</DataTableHead>
                <DataTableHead>Alamat</DataTableHead>
                <DataTableHead align="right">Total utang</DataTableHead>
                <DataTableHead align="center">Aksi</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {loading ? (
                <TableSkeletonRows rows={6} cols={isPdfSelectMode ? 6 : 5} />
              ) : filteredMembers.length === 0 ? (
                <DataTableEmpty colSpan={isPdfSelectMode ? 6 : 5} className="py-12">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  {search
                    ? "Tidak ada pelanggan yang cocok dengan pencarian."
                    : filterDebt === "DEBT"
                    ? "Tidak ada pelanggan yang memiliki utang aktif saat ini."
                    : "Belum ada data pelanggan piutang."}
                </DataTableEmpty>
              ) : (
                paginatedMembers.map((m) => {
                  const hasDebt = (m.saldoUtangCache || 0) > 0;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150 group ${
                        selectedMemberIds.includes(m.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox Pilih PDF (tampil hanya saat mode pilih aktif) */}
                      {isPdfSelectMode && (
                        <td className="py-3.5 pl-1 pr-2 w-9">
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(m.id)}
                            onChange={() => toggleSelectMember(m.id)}
                            aria-label={`Pilih ${m.nama} untuk PDF`}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Nama Pelanggan */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/member/${m.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-2 truncate"
                          title={`Lihat detail ${m.nama}`}
                        >
                          <span className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
                            {memberCodeMap[m.id]}
                          </span>
                          <span className="truncate">{m.nama}</span>
                        </Link>
                      </td>

                      {/* No HP */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium font-mono text-[11px]">
                        {m.telepon ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-300" />
                            <span>{m.telepon}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Alamat */}
                      <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate" title={m.alamat || ""}>
                        {m.alamat || <span className="text-slate-300">-</span>}
                      </td>

                      {/* Total Utang */}
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {hasDebt ? (
                          <span className="font-bold text-rose-600 text-xs">
                            {formatRupiah(m.saldoUtangCache)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">
                            Rp 0
                          </span>
                        )}
                      </td>

                      {/* Tombol Aksi Minimalist Berwarna & Rata Tengah */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <Link
                            href={`/member/${m.id}`}
                            className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95"
                            title="Buka Rincian Nota Bon"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Detail Bon</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="h-7 px-2.5 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Edit Data Pelanggan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(m)}
                            className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Hapus Pelanggan"
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
            </DataTableBody>
          </DataTable>
      </div>

      {filteredMembers.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMembers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* SLIDE DRAWER TAMBAH DATA PIUTANG (CREATE) */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col font-sans drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                Tambah Pelanggan Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="field-label">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Contoh: Pak Slamet / Warung Berkah"
                    className="ctl"
                  />
                </div>

                <div>
                  <label className="field-label">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newTelepon}
                    onChange={(e) => setNewTelepon(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="ctl"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={3}
                    value={newAlamat}
                    onChange={(e) => setNewAlamat(e.target.value)}
                    placeholder="Alamat domisili atau toko pelanggan"
                    className="ctl-ta"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Saldo Awal Catatan Lama (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newSaldoAwal ? newSaldoAwal.toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setNewSaldoAwal(digits ? parseInt(digits, 10) : 0);
                      }}
                      placeholder="0"
                      className="ctl pl-10 font-semibold text-right"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Kosongkan atau isi 0 jika tidak ada piutang buku fisik lama
                  </span>
                </div>

                <div>
                  <label className="field-label">
                    Anggota Pengambil (Opsional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubInput}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = newSubInput.trim();
                          if (val && !newSubMembers.includes(val)) {
                            setNewSubMembers([...newSubMembers, val]);
                          }
                          setNewSubInput("");
                        }
                      }}
                      placeholder="Contoh: Istri / Pak Joko"
                      className="ctl flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newSubInput.trim();
                        if (val && !newSubMembers.includes(val)) {
                          setNewSubMembers([...newSubMembers, val]);
                        }
                        setNewSubInput("");
                      }}
                      className="px-3.5 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Tambah
                    </button>
                  </div>
                  {newSubMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {newSubMembers.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-medium"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => setNewSubMembers(newSubMembers.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-[14px] text-xs shadow-2xs transition-all duration-150 cursor-pointer"
                >
                  {submittingAdd ? "Menyimpan..." : "Simpan Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE DRAWER EDIT DATA PIUTANG (UPDATE) */}
      {isEditOpen && editingMember && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => {
            setIsEditOpen(false);
            setEditingMember(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col font-sans drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                Ubah Data Pelanggan
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingMember(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="field-label">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="ctl"
                  />
                </div>

                <div>
                  <label className="field-label">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editTelepon}
                    onChange={(e) => setEditTelepon(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="ctl"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={3}
                    value={editAlamat}
                    onChange={(e) => setEditAlamat(e.target.value)}
                    placeholder="Alamat domisili atau toko pelanggan"
                    className="ctl-ta"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Anggota Pengambil (Opsional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editSubInput}
                      onChange={(e) => setEditSubInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = editSubInput.trim();
                          if (val && !editSubMembers.includes(val)) {
                            setEditSubMembers([...editSubMembers, val]);
                          }
                          setEditSubInput("");
                        }
                      }}
                      placeholder="Contoh: Istri / Pak Joko"
                      className="ctl flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = editSubInput.trim();
                        if (val && !editSubMembers.includes(val)) {
                          setEditSubMembers([...editSubMembers, val]);
                        }
                        setEditSubInput("");
                      }}
                      className="px-3.5 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Tambah
                    </button>
                  </div>
                  {editSubMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editSubMembers.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-medium"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => setEditSubMembers(editSubMembers.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingMember(null);
                  }}
                  className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-[14px] text-xs shadow-2xs transition-all duration-150 cursor-pointer"
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS (DELETE) */}
      {isDeleteOpen && deletingMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-xl border border-slate-200/80 animate-in fade-in zoom-in-95 space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Data</h3>
                <p className="text-xs text-slate-500">{deletingMember.nama}</p>
              </div>
            </div>

            {deletingMember.saldoUtangCache > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pelanggan Memiliki Utang Aktif</span>
                </div>
                <p className="text-xs text-rose-600 leading-relaxed">
                  Member ini masih memiliki saldo utang sebesar{" "}
                  <strong>{formatRupiah(deletingMember.saldoUtangCache)}</strong>. Pelanggan tidak dapat
                  dihapus sebelum utang dilunasi atau disesuaikan ke Rp 0.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data pelanggan <strong>{deletingMember.nama}</strong>? Jika
                memiliki riwayat mutasi lama, akun akan dinonaktifkan secara aman.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeletingMember(null);
                }}
                className="w-1/2 h-9 bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingDelete || deletingMember.saldoUtangCache > 0}
                onClick={handleDeleteMember}
                className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 text-white font-medium rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                {submittingDelete ? "Menyimpan..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
