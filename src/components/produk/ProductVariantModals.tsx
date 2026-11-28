"use client";

import { useEffect, useState } from "react";
import {
  X,
  Plus,
  Copy,
  Trash2,
  ScanBarcode,
  Split,
  Layers,
} from "lucide-react";
import { buildVariantFullName } from "@/lib/product-grouping";
import { formatDecimal } from "@/lib/formatters";
import { NumberInput } from "@/components/shared/NumberInput";
import { Dropdown } from "@/components/shared/Dropdown";
import { BarcodeScannerModal } from "@/components/kasir/BarcodeScannerModal";

interface CategoryOption {
  id: string;
  nama: string;
}

export interface VariantRowDraft {
  variantName: string;
  barcode: string;
  hargaJual: number;
  hargaBeli: number;
  stokAwal: number;
}

export function VariantGroupFormModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  onSuccess: (message: string) => void;
}) {
  const [namaInduk, setNamaInduk] = useState("");
  const [brand, setBrand] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [satuanDasar, setSatuanDasar] = useState("pcs");
  const [stokMinimum, setStokMinimum] = useState(5);
  const [rows, setRows] = useState<VariantRowDraft[]>([
    { variantName: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
    { variantName: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
  ]);
  const [scanRowIdx, setScanRowIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNamaInduk("");
      setBrand("");
      setKategoriId("");
      setSatuanDasar("pcs");
      setStokMinimum(5);
      setRows([
        { variantName: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
        { variantName: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
      ]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateRow = (idx: number, patch: Partial<VariantRowDraft>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { variantName: "", barcode: "", hargaJual: 0, hargaBeli: 0, stokAwal: 0 },
    ]);
  };

  const duplicateRow = (idx: number) => {
    const src = rows[idx];
    setRows((prev) => [
      ...prev.slice(0, idx + 1),
      { ...src, variantName: `${src.variantName} (2)`.trim(), barcode: "" },
      ...prev.slice(idx + 1),
    ]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyFromFirst = () => {
    const first = rows[0];
    if (!first) return;
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === 0 ? r : { ...r, hargaJual: first.hargaJual, hargaBeli: first.hargaBeli }
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaInduk.trim()) {
      setError("Nama produk induk wajib diisi");
      return;
    }
    const validRows = rows.filter((r) => r.variantName.trim());
    if (validRows.length === 0) {
      setError("Isi minimal 1 nama varian/rasa");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/product-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaInduk.trim(),
          brand: brand.trim() || null,
          kategoriId: kategoriId || null,
          variants: validRows.map((r) => ({
            variantName: r.variantName.trim(),
            barcode: r.barcode.trim() || null,
            satuanDasar: satuanDasar.trim() || "pcs",
            stokMinimum: Number(stokMinimum) || 0,
            stokAwal: Number(r.stokAwal) || 0,
            satuanList: [
              {
                namaSatuan: satuanDasar.trim() || "pcs",
                faktorKeDasar: 1,
                hargaJual: Math.round(r.hargaJual || 0),
                hargaBeli: Math.round(r.hargaBeli || 0),
                isDefault: true,
              },
            ],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan produk varian");
      onSuccess(data.message || "Produk varian berhasil dibuat");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Tambah Produk Bervarian
              </h3>
              <p className="text-[11px] text-slate-400">
                Satu grup induk (mis. Cimory Fresh Milk) dengan banyak rasa/ukuran dan barcode masing-masing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Induk Produk *
                </label>
                <input
                  type="text"
                  value={namaInduk}
                  onChange={(e) => setNamaInduk(e.target.value)}
                  placeholder="Misal: Cimory Fresh Milk"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Brand / Merek (Opsional)
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Misal: Cimory"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Kategori
                </label>
                <div className="border border-slate-200 dark:border-zinc-700 rounded-xl px-3 h-9 flex items-center bg-white dark:bg-zinc-800">
                  <Dropdown
                    searchable
                    variant="underline"
                    className="w-full"
                    value={kategoriId}
                    onChange={setKategoriId}
                    placeholder="Pilih kategori..."
                    options={[
                      { value: "", label: "Tanpa Kategori" },
                      ...categories.map((c) => ({ value: c.id, label: c.nama })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Satuan Dasar
                </label>
                <input
                  type="text"
                  value={satuanDasar}
                  onChange={(e) => setSatuanDasar(e.target.value)}
                  placeholder="pcs / botol"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Stok Minimum
                </label>
                <NumberInput
                  min={0}
                  emptyFallback={0}
                  value={stokMinimum}
                  onChange={setStokMinimum}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>

            {/* Tabel Varian */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  Daftar Varian ({rows.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyFromFirst}
                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin harga dari varian pertama</span>
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="h-8 px-3 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah baris</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Nama Varian / Rasa *</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3 text-right">Harga Jual</th>
                      <th className="py-2.5 px-3 text-right">Harga Beli</th>
                      <th className="py-2.5 px-3 text-right">Stok Awal</th>
                      <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {rows.map((r, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.variantName}
                            onChange={(e) => updateRow(idx, { variantName: e.target.value })}
                            placeholder="Cokelat / Matcha 250ml"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                          />
                          {namaInduk.trim() && r.variantName.trim() && (
                            <p className="text-[10px] text-slate-400 mt-1 px-0.5 truncate">
                              → {buildVariantFullName(namaInduk, r.variantName)}
                            </p>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={r.barcode}
                              onChange={(e) => updateRow(idx, { barcode: e.target.value })}
                              placeholder="Scan/ketik"
                              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => setScanRowIdx(idx)}
                              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                              title="Scan barcode varian ini"
                            >
                              <ScanBarcode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-2">
                          <NumberInput
                            rupiah
                            min={0}
                            emptyFallback={0}
                            value={r.hargaJual}
                            onChange={(val) => updateRow(idx, { hargaJual: val })}
                            className="w-28 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <NumberInput
                            rupiah
                            min={0}
                            emptyFallback={0}
                            value={r.hargaBeli}
                            onChange={(val) => updateRow(idx, { hargaBeli: val })}
                            className="w-28 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <NumberInput
                            min={0}
                            emptyFallback={0}
                            value={r.stokAwal}
                            onChange={(val) => updateRow(idx, { stokAwal: val })}
                            className="w-20 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right tabular-nums"
                          />
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => duplicateRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Duplikat baris"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Menyimpan..." : "Simpan Semua Varian"}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScannerModal
        isOpen={scanRowIdx !== null}
        onClose={() => setScanRowIdx(null)}
        onScanSuccess={(barcode) => {
          if (scanRowIdx !== null) {
            updateRow(scanRowIdx, { barcode: barcode.trim() });
          }
          setScanRowIdx(null);
        }}
      />
    </div>
  );
}

export function SplitProductModal({
  product,
  categories,
  onClose,
  onSuccess,
}: {
  product: {
    id: string;
    nama: string;
    stokCache: string | number;
    satuanDasar: string;
    kategori?: { id: string; nama: string } | null;
    satuanProduk: { hargaJual: number; hargaBeli: number; isDefault?: boolean }[];
  } | null;
  categories: CategoryOption[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [brand, setBrand] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [variants, setVariants] = useState<VariantRowDraft[]>([]);
  const [scanRowIdx, setScanRowIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const totalStok = Math.max(0, Number(product.stokCache ?? 0));
    const defSatuan =
      product.satuanProduk.find((s) => s.isDefault) || product.satuanProduk[0];
    const defaultJual = defSatuan?.hargaJual ?? 0;
    const defaultBeli = defSatuan?.hargaBeli ?? 0;

    // Coba deteksi otomatis jika nama mengandung "/" (mis. "Cimory Matcha / Cokelat")
    let guessedGroup = product.nama;
    let guessedVariants = ["Varian 1", "Varian 2"];
    if (product.nama.includes("/")) {
      const parts = product.nama.split("/").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const firstWords = parts[0].split(/\s+/);
        if (firstWords.length > 1) {
          guessedGroup = firstWords[0];
          guessedVariants = [firstWords.slice(1).join(" "), ...parts.slice(1)];
        } else {
          guessedVariants = parts;
        }
      }
    }

    const half = Math.floor(totalStok / guessedVariants.length);
    const rem = totalStok - half * guessedVariants.length;

    setGroupName(guessedGroup);
    setBrand(guessedGroup.split(/\s+/)[0] || "");
    setKategoriId(product.kategori?.id || "");
    setVariants(
      guessedVariants.map((vn, idx) => ({
        variantName: vn,
        barcode: "",
        hargaJual: defaultJual,
        hargaBeli: defaultBeli,
        stokAwal: idx === 0 ? half + rem : half,
      }))
    );
    setError(null);
  }, [product]);

  if (!product) return null;

  const totalInputStok = variants.reduce((s, v) => s + (Number(v.stokAwal) || 0), 0);

  const updateRow = (idx: number, patch: Partial<VariantRowDraft>) => {
    setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = variants.filter((v) => v.variantName.trim());
    if (valid.length < 2) {
      setError("Minimal pecah menjadi 2 varian");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: groupName.trim(),
          brand: brand.trim() || null,
          kategoriId: kategoriId || null,
          variants: valid.map((v) => ({
            variantName: v.variantName.trim(),
            barcode: v.barcode.trim() || null,
            stokAwal: Number(v.stokAwal) || 0,
            hargaJual: Math.round(v.hargaJual || 0),
            hargaBeli: Math.round(v.hargaBeli || 0),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memecah produk");
      onSuccess(data.message || "Produk berhasil dipecah menjadi varian");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Pecah Produk Menjadi Varian
              </h3>
              <p className="text-[11px] text-slate-400">
                Sumber: <strong>{product.nama}</strong> · Stok saat ini:{" "}
                <strong>
                  {formatDecimal(Number(product.stokCache))} {product.satuanDasar}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Induk *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Kategori
                </label>
                <div className="border border-slate-200 dark:border-zinc-700 rounded-xl px-3 h-9 flex items-center bg-white dark:bg-zinc-800">
                  <Dropdown
                    searchable
                    variant="underline"
                    className="w-full"
                    value={kategoriId}
                    onChange={setKategoriId}
                    options={[
                      { value: "", label: "Tanpa Kategori" },
                      ...categories.map((c) => ({ value: c.id, label: c.nama })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                Pembagian Varian &amp; Stok (Total input: {formatDecimal(totalInputStok)}{" "}
                {product.satuanDasar})
              </span>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      variantName: "",
                      barcode: "",
                      hargaJual: prev[0]?.hargaJual ?? 0,
                      hargaBeli: prev[0]?.hargaBeli ?? 0,
                      stokAwal: 0,
                    },
                  ])
                }
                className="h-7 px-2.5 rounded-lg bg-blue-50 text-blue-600 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah varian</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 items-center"
                >
                  <div className="sm:col-span-4">
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      Nama Varian
                    </label>
                    <input
                      type="text"
                      value={v.variantName}
                      onChange={(e) => updateRow(idx, { variantName: e.target.value })}
                      placeholder="Matcha / Cokelat"
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      Barcode
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={v.barcode}
                        onChange={(e) => updateRow(idx, { barcode: e.target.value })}
                        placeholder="Opsional"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setScanRowIdx(idx)}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <ScanBarcode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      Stok ({product.satuanDasar})
                    </label>
                    <NumberInput
                      min={0}
                      emptyFallback={0}
                      value={v.stokAwal}
                      onChange={(val) => updateRow(idx, { stokAwal: val })}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-right tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    {variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Memecah..." : "Pecah Jadi Varian"}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScannerModal
        isOpen={scanRowIdx !== null}
        onClose={() => setScanRowIdx(null)}
        onScanSuccess={(barcode) => {
          if (scanRowIdx !== null) {
            updateRow(scanRowIdx, { barcode: barcode.trim() });
          }
          setScanRowIdx(null);
        }}
      />
    </div>
  );
}
