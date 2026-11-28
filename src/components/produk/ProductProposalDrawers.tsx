"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";
import { parseScan } from "@/lib/barcode";
import { formatDateTime, formatRupiah } from "@/lib/formatters";
import { detectBrandFromName } from "@/lib/brand-detector";

export interface ProposalProductTarget {
  id: string;
  sku?: string | null;
  nama: string;
  satuanDasar: string;
  satuanProduk: Array<{
    id: string;
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    isDefault: boolean;
  }>;
}

interface ProposalRecord {
  id: string;
  tipe: "PRODUK_BARU" | "UBAH_HARGA";
  status: "MENUNGGU" | "DISETUJUI" | "DITOLAK";
  produkId?: string | null;
  namaProduk: string;
  payloadJson: any;
  catatanPengaju?: string | null;
  catatanPeninjau?: string | null;
  ditinjauPada?: string | null;
  dibuatPada: string;
  diajukanOleh?: { id: string; nama: string; username: string; role: string } | null;
  ditinjauOleh?: { id: string; nama: string; username: string; role: string } | null;
}

interface CreateProposalDrawerProps {
  isOpen: boolean;
  mode: "PRODUK_BARU" | "UBAH_HARGA";
  initialBarcode?: string | null;
  targetProduct?: ProposalProductTarget | null;
  categories: Array<{ id: string; nama: string }>;
  onClose: () => void;
  onSubmitted: (msg: string) => void;
}

export function CreateProposalDrawer({
  isOpen,
  mode,
  initialBarcode,
  targetProduct,
  categories,
  onClose,
  onSubmitted,
}: CreateProposalDrawerProps) {
  const [nama, setNama] = useState("");
  const [merek, setMerek] = useState("");
  const [merekTouched, setMerekTouched] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [satuanDasar, setSatuanDasar] = useState("pcs");
  const [stokMinimum, setStokMinimum] = useState(0);
  const [satuanList, setSatuanList] = useState<
    Array<{ namaSatuan: string; faktorKeDasar: number; hargaJual: number; isDefault: boolean }>
  >([{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 0, isDefault: true }]);

  const [priceRows, setPriceRows] = useState<
    Array<{
      satuanId: string;
      namaSatuan: string;
      faktorKeDasar: number;
      hargaLama: number;
      hargaBaru: number;
      isDefault: boolean;
    }>
  >([]);

  const [catatanPengaju, setCatatanPengaju] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCatatanPengaju("");

    if (mode === "PRODUK_BARU") {
      setNama("");
      setMerek("");
      setMerekTouched(false);
      setBarcode(initialBarcode?.trim() || "");
      setKategoriId("");
      setSatuanDasar("pcs");
      setStokMinimum(0);
      setSatuanList([{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 0, isDefault: true }]);
    } else if (targetProduct) {
      setPriceRows(
        targetProduct.satuanProduk.map((s) => ({
          satuanId: s.id,
          namaSatuan: s.namaSatuan,
          faktorKeDasar: Number(s.faktorKeDasar),
          hargaLama: s.hargaJual,
          hargaBaru: s.hargaJual,
          isDefault: s.isDefault,
        }))
      );
    }
  }, [isOpen, mode, initialBarcode, targetProduct]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "PRODUK_BARU") {
        if (nama.trim().length < 2) {
          throw new Error("Nama produk minimal 2 karakter");
        }
        if (satuanList.some((s) => !s.namaSatuan.trim() || s.faktorKeDasar <= 0)) {
          throw new Error("Semua satuan dan nilai konversi wajib valid");
        }

        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipe: "PRODUK_BARU",
            catatanPengaju: catatanPengaju.trim() || undefined,
            payload: {
              nama: nama.trim(),
              merek: merek.trim() || null,
              kategoriId: kategoriId || null,
              barcode: barcode.trim() || null,
              satuanDasar: satuanDasar.trim() || "pcs",
              stokMinimum: Number(stokMinimum) || 0,
              satuanList: satuanList.map((s, idx) => ({
                namaSatuan: s.namaSatuan.trim(),
                faktorKeDasar: Number(s.faktorKeDasar),
                hargaJual: Math.round(Number(s.hargaJual) || 0),
                isDefault: satuanList.some((u) => u.isDefault) ? s.isDefault : idx === 0,
              })),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengirim pengajuan produk");
        onSubmitted(data.message || "Pengajuan produk baru berhasil dikirim");
        onClose();
      } else if (targetProduct) {
        const changed = priceRows.filter((r) => r.hargaBaru !== r.hargaLama);
        if (changed.length === 0) {
          throw new Error("Ubah minimal satu harga jual sebelum mengirim pengajuan");
        }

        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipe: "UBAH_HARGA",
            catatanPengaju: catatanPengaju.trim() || undefined,
            payload: {
              produkId: targetProduct.id,
              perubahan: changed.map((r) => ({
                satuanId: r.satuanId,
                namaSatuan: r.namaSatuan,
                faktorKeDasar: r.faktorKeDasar,
                hargaLama: r.hargaLama,
                hargaBaru: Math.round(Number(r.hargaBaru) || 0),
                isDefault: r.isDefault,
              })),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengirim pengajuan perubahan harga");
        onSubmitted(data.message || "Pengajuan perubahan harga berhasil dikirim");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Gagal mengirim pengajuan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                {mode === "PRODUK_BARU" ? "Ajukan Produk Baru" : "Ajukan Perubahan Harga"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Menunggu persetujuan Kepala Toko atau Pemilik sebelum aktif di katalog.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {mode === "PRODUK_BARU" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    Nama produk *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNama(val);
                      if (!merekTouched) {
                        setMerek(detectBrandFromName(val) || "");
                      }
                    }}
                    placeholder="Contoh: Indomie Goreng Spesial"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    Merek (terisi otomatis bila dikenali)
                  </label>
                  <input
                    type="text"
                    value={merek}
                    onChange={(e) => {
                      setMerek(e.target.value);
                      setMerekTouched(true);
                    }}
                    placeholder="Otomatis dari nama atau isi manual"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Barcode (opsional)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Scan / ketik"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        title="Scan barcode dengan kamera"
                        className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Kategori
                    </label>
                    <Dropdown
                      variant="underline"
                      ariaLabel="Pilih kategori pengajuan"
                      value={kategoriId}
                      onChange={setKategoriId}
                      placeholder="-- Tanpa Kategori --"
                      options={[
                        { value: "", label: "-- Tanpa Kategori --" },
                        ...categories.map((c) => ({ value: c.id, label: c.nama })),
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Satuan dasar *
                    </label>
                    <input
                      type="text"
                      required
                      value={satuanDasar}
                      onChange={(e) => setSatuanDasar(e.target.value)}
                      placeholder="pcs / kg / botol"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Stok minimum
                    </label>
                    <NumberInput
                      min={0}
                      value={stokMinimum}
                      onChange={setStokMinimum}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Satuan &amp; usulan harga jual
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSatuanList([
                          ...satuanList,
                          { namaSatuan: "", faktorKeDasar: 1, hargaJual: 0, isDefault: false },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah satuan</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {satuanList.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 grid grid-cols-12 gap-2 items-center"
                      >
                        <input
                          type="text"
                          placeholder="Satuan"
                          value={s.namaSatuan}
                          onChange={(e) => {
                            const next = [...satuanList];
                            next[idx].namaSatuan = e.target.value;
                            setSatuanList(next);
                          }}
                          className="col-span-4 h-8 px-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs"
                        />
                        <NumberInput
                          min={0.001}
                          value={s.faktorKeDasar}
                          onChange={(val) => {
                            const next = [...satuanList];
                            next[idx].faktorKeDasar = val;
                            setSatuanList(next);
                          }}
                          className="col-span-3 h-8 px-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs"
                        />
                        <NumberInput
                          min={0}
                          value={s.hargaJual}
                          onChange={(val) => {
                            const next = [...satuanList];
                            next[idx].hargaJual = val;
                            setSatuanList(next);
                          }}
                          className="col-span-4 h-8 px-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs text-right tabular-nums"
                        />
                        <div className="col-span-1 flex justify-end">
                          {satuanList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSatuanList(satuanList.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              targetProduct && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {targetProduct.nama}
                    </div>
                    {targetProduct.sku && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SKU: {targetProduct.sku}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Usulan harga jual per satuan
                    </label>
                    {priceRows.map((row, idx) => (
                      <div
                        key={row.satuanId}
                        className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {row.namaSatuan} (isi {row.faktorKeDasar})
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            Saat ini: {formatRupiah(row.hargaLama)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">Harga diajukan (Rp)</span>
                          <NumberInput
                            min={0}
                            value={row.hargaBaru}
                            onChange={(val) => {
                              const next = [...priceRows];
                              next[idx].hargaBaru = val;
                              setPriceRows(next);
                            }}
                            className="w-36 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-bold text-right tabular-nums"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Catatan untuk Kepala Toko / Pemilik (opsional)
              </label>
              <textarea
                rows={2}
                value={catatanPengaju}
                onChange={(e) => setCatatanPengaju(e.target.value)}
                placeholder="Alasan / keterangan pengajuan..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] h-10 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Mengirim..." : "Kirim Pengajuan"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(raw) => {
          const parsed = parseScan(raw);
          setBarcode(parsed.type === "product" ? parsed.code : raw.trim());
          setIsScannerOpen(false);
        }}
      />
    </>
  );
}

interface ProposalReviewDrawerProps {
  isOpen: boolean;
  canApprove: boolean;
  onClose: () => void;
  onReviewed: (msg: string) => void;
}

export function ProposalReviewDrawer({
  isOpen,
  canApprove,
  onClose,
  onReviewed,
}: ProposalReviewDrawerProps) {
  const [statusFilter, setStatusFilter] = useState<"MENUNGGU" | "ALL" | "DISETUJUI" | "DITOLAK">(
    canApprove ? "MENUNGGU" : "ALL"
  );
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchProposals = async (filter = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pengajuan");
      setProposals(data.proposals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProposals(statusFilter);
    }
  }, [isOpen, statusFilter]);

  if (!isOpen) return null;

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatanPeninjau: notes[id]?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses pengajuan");
      onReviewed(data.message);
      await fetchProposals(statusFilter);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {canApprove ? "Persetujuan Pengajuan Kasir" : "Riwayat Pengajuan Saya"}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {canApprove
                ? "Tinjau pengajuan produk baru dan usulan perubahan harga dari kasir."
                : "Pantau status pengajuan produk baru dan ubah harga Anda."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { value: "MENUNGGU", label: "Menunggu" },
              { value: "ALL", label: "Semua" },
              { value: "DISETUJUI", label: "Disetujui" },
              { value: "DITOLAK", label: "Ditolak" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">Memuat pengajuan...</p>
          ) : proposals.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Tidak ada pengajuan untuk filter ini.
            </p>
          ) : (
            proposals.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 bg-white dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200">
                      {p.tipe === "PRODUK_BARU" ? "Produk Baru" : "Ubah Harga"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "MENUNGGU"
                          ? "bg-amber-50 text-amber-700"
                          : p.status === "DISETUJUI"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {p.status === "MENUNGGU" && <Clock className="w-3 h-3" />}
                      {p.status === "DISETUJUI" && <CheckCircle2 className="w-3 h-3" />}
                      {p.status === "DITOLAK" && <XCircle className="w-3 h-3" />}
                      <span>{p.status}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(p.dibuatPada)}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    {p.namaProduk}
                  </div>
                  {p.diajukanOleh && (
                    <div className="text-[11px] text-slate-500">
                      Pengaju: {p.diajukanOleh.nama} (@{p.diajukanOleh.username})
                    </div>
                  )}
                </div>

                {p.tipe === "PRODUK_BARU" && p.payloadJson && (
                  <div className="text-[11px] text-slate-600 dark:text-zinc-300 space-y-1 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-lg">
                    {p.payloadJson.barcode && (
                      <div>
                        Barcode: <span className="font-mono">{p.payloadJson.barcode}</span>
                      </div>
                    )}
                    <div>Satuan dasar: {p.payloadJson.satuanDasar}</div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(p.payloadJson.satuanList || []).map((u: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium tabular-nums"
                        >
                          {u.namaSatuan} · {formatRupiah(u.hargaJual)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {p.tipe === "UBAH_HARGA" && p.payloadJson && (
                  <div className="text-[11px] text-slate-600 dark:text-zinc-300 space-y-1 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-lg">
                    {(p.payloadJson.perubahan || []).map((c: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between tabular-nums">
                        <span className="font-semibold">{c.namaSatuan}</span>
                        <span>
                          <span className="line-through text-slate-400 mr-1.5">
                            {formatRupiah(c.hargaLama ?? 0)}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {formatRupiah(c.hargaBaru)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {p.catatanPengaju && (
                  <p className="text-[11px] text-slate-500 italic">
                    &ldquo;{p.catatanPengaju}&rdquo;
                  </p>
                )}

                {p.status === "MENUNGGU" && canApprove && (
                  <div className="pt-1 space-y-2 border-t border-slate-100 dark:border-zinc-800">
                    <input
                      type="text"
                      value={notes[p.id] || ""}
                      onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                      placeholder="Catatan peninjau (opsional)"
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-[11px] bg-white dark:bg-zinc-900"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={processingId === p.id}
                        onClick={() => handleAction(p.id, "reject")}
                        className="flex-1 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        disabled={processingId === p.id}
                        onClick={() => handleAction(p.id, "approve")}
                        className="flex-[2] h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui &amp; Terapkan</span>
                      </button>
                    </div>
                  </div>
                )}

                {p.status !== "MENUNGGU" && (
                  <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-zinc-800 pt-2">
                    Ditinjau oleh{" "}
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">
                      {p.ditinjauOleh?.nama || "-"}
                    </span>
                    {p.catatanPeninjau ? ` · "${p.catatanPeninjau}"` : ""}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
