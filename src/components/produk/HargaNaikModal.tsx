"use client";

import { useMemo, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { Dropdown } from "@/components/shared/Dropdown";
import { RupiahInput } from "@/components/shared/RupiahInput";
import { formatRupiah } from "@/lib/formatters";

interface SatuanLite {
  id: string;
  namaSatuan: string;
  faktorKeDasar: number | string;
  hargaJual: number;
  hargaBeli: number;
  isDefault: boolean;
}

export interface HargaNaikProductItem {
  id: string;
  nama: string;
  kategoriId?: string | null;
  kategori?: { id: string; nama: string } | null;
  satuanDasar: string;
  satuanProduk: SatuanLite[];
}

interface KategoriLite {
  id: string;
  nama: string;
}

interface HargaNaikModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: HargaNaikProductItem[];
  categories: KategoriLite[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function hitungHargaBaru(
  current: number,
  faktor: number,
  mode: "FIXED" | "PERCENT",
  amount: number,
  roundTo: 0 | 100 | 500
): number {
  let next =
    mode === "FIXED"
      ? current + Math.round(amount * faktor)
      : Math.round(current * (1 + amount / 100));
  if (roundTo > 0) {
    next = Math.ceil(next / roundTo) * roundTo;
  }
  return Math.max(0, next);
}

export function HargaNaikModal({
  isOpen,
  onClose,
  products,
  categories,
  onSuccess,
  onError,
}: HargaNaikModalProps) {
  const [scope, setScope] = useState<"SINGLE" | "CATEGORY" | "ALL">("SINGLE");
  const [produkId, setProdukId] = useState<string>("");
  const [kategoriId, setKategoriId] = useState<string>("");
  const [mode, setMode] = useState<"FIXED" | "PERCENT">("FIXED");
  const [amount, setAmount] = useState<number>(500);
  const [percentText, setPercentText] = useState<string>("5");
  const [roundTo, setRoundTo] = useState<0 | 100 | 500>(500);
  const [includeHargaBeli, setIncludeHargaBeli] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const effectiveAmount = mode === "FIXED" ? amount : Number(percentText) || 0;

  const targetProducts = useMemo(() => {
    if (scope === "SINGLE") {
      return products.filter((p) => p.id === produkId);
    }
    if (scope === "CATEGORY") {
      if (!kategoriId) return [];
      return products.filter(
        (p) => (p.kategoriId ?? p.kategori?.id) === kategoriId
      );
    }
    return products;
  }, [kategoriId, produkId, products, scope]);

  const previewItems = useMemo(() => {
    if (effectiveAmount <= 0) return [];
    return targetProducts.slice(0, 6).map((p) => {
      const def =
        p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
      const faktor = Number(def?.faktorKeDasar) || 1;
      const oldPrice = def?.hargaJual ?? 0;
      const newPrice = hitungHargaBaru(
        oldPrice,
        faktor,
        mode,
        effectiveAmount,
        mode === "PERCENT" ? roundTo : 0
      );
      return {
        id: p.id,
        nama: p.nama,
        satuan: def?.namaSatuan || p.satuanDasar,
        oldPrice,
        newPrice,
      };
    });
  }, [effectiveAmount, mode, roundTo, targetProducts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetProducts.length === 0) {
      onError("Pilih produk atau kategori terlebih dahulu.");
      return;
    }
    if (effectiveAmount <= 0) {
      onError("Masukkan nominal atau persentase kenaikan yang valid.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          produkId: scope === "SINGLE" ? produkId : undefined,
          kategoriId: scope === "CATEGORY" ? kategoriId : undefined,
          mode,
          amount: effectiveAmount,
          roundTo: mode === "PERCENT" ? roundTo : 0,
          includeHargaBeli,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menaikkan harga");

      onSuccess(data.message || "Harga produk berhasil dinaikkan");
      onClose();
    } catch (err: any) {
      onError(err?.message || "Terjadi kesalahan saat menaikkan harga");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 drawer-panel"
      >
        {/* Header Minimalis */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">
              Naikkan Harga
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              Perbarui harga jual dengan cepat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="harga-naik-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 px-6 py-6 space-y-7 overflow-y-auto"
        >
          {/* 1. Target Produk (Underline Tabs) */}
          <div className="space-y-3.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
              Target
            </span>
            <div className="flex items-center gap-5 border-b border-slate-200 dark:border-zinc-800 text-xs">
              {[
                { id: "SINGLE", label: "1 Produk" },
                { id: "CATEGORY", label: "Per Kategori" },
                { id: "ALL", label: "Semua Produk" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setScope(t.id as "SINGLE" | "CATEGORY" | "ALL")}
                  className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                    scope === t.id
                      ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                      : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {scope === "SINGLE" && (
              <div className="pt-1">
                <Dropdown
                  variant="underline"
                  searchable
                  className="w-full"
                  ariaLabel="Pilih produk yang naik harga"
                  placeholder="Cari & pilih produk..."
                  searchPlaceholder="Ketik nama barang..."
                  value={produkId}
                  onChange={setProdukId}
                  options={products.map((p) => {
                    const def =
                      p.satuanProduk.find((s) => s.isDefault) || p.satuanProduk[0];
                    return {
                      value: p.id,
                      label: p.nama,
                      hint: def ? formatRupiah(def.hargaJual) : undefined,
                    };
                  })}
                />
              </div>
            )}

            {scope === "CATEGORY" && (
              <div className="pt-1">
                <Dropdown
                  variant="underline"
                  searchable
                  className="w-full"
                  ariaLabel="Pilih kategori yang naik harga"
                  placeholder="Pilih kategori..."
                  searchPlaceholder="Cari kategori..."
                  value={kategoriId}
                  onChange={setKategoriId}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.nama,
                  }))}
                />
              </div>
            )}
          </div>

          {/* 2. Besaran Kenaikan */}
          <div className="space-y-3.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
              Kenaikan
            </span>
            <div className="flex items-center gap-5 border-b border-slate-200 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setMode("FIXED")}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  mode === "FIXED"
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                }`}
              >
                Nominal (+ Rp)
              </button>
              <button
                type="button"
                onClick={() => setMode("PERCENT")}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  mode === "PERCENT"
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                }`}
              >
                Persentase (+ %)
              </button>
            </div>

            {mode === "FIXED" ? (
              <div className="pt-1 space-y-3">
                <div className="relative flex items-center">
                  <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 select-none pointer-events-none mr-2">
                    Rp
                  </span>
                  <RupiahInput
                    prefix=""
                    value={amount}
                    onChange={setAmount}
                    placeholder="0"
                    containerClassName="flex-1"
                    className="w-full h-9 px-0 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-base font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  />
                </div>
                <div className="flex items-center gap-3.5 text-xs">
                  {[500, 1000, 2000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`cursor-pointer transition-colors ${
                        amount === preset
                          ? "text-slate-900 dark:text-white font-semibold underline underline-offset-4"
                          : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      +{formatRupiah(preset)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Satuan grosir/renceng otomatis mengikuti faktor konversi.
                </p>
              </div>
            ) : (
              <div className="pt-1 space-y-3">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      step="0.5"
                      value={percentText}
                      onChange={(e) => setPercentText(e.target.value)}
                      className="w-full h-10 pr-6 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-base font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-900 dark:focus:border-white"
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      %
                    </span>
                  </div>
                  <Dropdown
                    variant="underline"
                    searchable={false}
                    className="w-full"
                    ariaLabel="Pembulatan harga"
                    value={String(roundTo)}
                    onChange={(v) => setRoundTo(Number(v) as 0 | 100 | 500)}
                    options={[
                      { value: "500", label: "Bulatkan Rp 500" },
                      { value: "100", label: "Bulatkan Rp 100" },
                      { value: "0", label: "Tanpa pembulatan" },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {["5", "10", "15", "20"].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPercentText(pct)}
                      className={`cursor-pointer transition-colors ${
                        percentText === pct
                          ? "text-slate-900 dark:text-white font-semibold underline underline-offset-4"
                          : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Opsi Harga Beli */}
          <label className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeHargaBeli}
              onChange={(e) => setIncludeHargaBeli(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Naikkan harga beli (modal) juga</span>
          </label>

          {/* 3. Pratinjau Minimalis */}
          {previewItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <div className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                Pratinjau ({targetProducts.length} produk)
              </div>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between text-xs gap-3"
                  >
                    <span className="text-slate-700 dark:text-zinc-300 truncate">
                      {item.nama}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <span className="text-slate-400 line-through">
                        {formatRupiah(item.oldPrice)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(item.newPrice)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {targetProducts.length > 6 && (
                <p className="text-[11px] text-slate-400">
                  +{targetProducts.length - 6} produk lainnya
                </p>
              )}
            </div>
          )}
        </form>

        {/* Footer Minimalis */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="harga-naik-form"
            disabled={submitting || targetProducts.length === 0 || effectiveAmount <= 0}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            {submitting ? "Menyimpan..." : "Terapkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
