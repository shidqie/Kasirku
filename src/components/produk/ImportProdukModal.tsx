"use client";

import { useRef, useState } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";

interface ParsedSatuan {
  namaSatuan: string;
  faktorKeDasar: number;
  hargaBeli: number;
  hargaJual: number;
  isDefault: boolean;
}

interface ParsedProduct {
  nama: string;
  kategori: string;
  barcode: string;
  satuanDasar: string;
  stok: number;
  stokMinimum: number;
  satuanList: ParsedSatuan[];
  error?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; nama: string; reason: string }[];
}

interface ImportProdukModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;
  if (tabCount > commaCount && tabCount > semiCount) return "\t";
  return semiCount > commaCount ? ";" : ",";
}

function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = clean.split("\n")[0] || "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field.trim());
        field = "";
      } else if (ch === "\n") {
        row.push(field.trim());
        if (row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function parseNumberId(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val
    .replace(/rp/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function ImportProdukModal({
  isOpen,
  onClose,
  onImported,
}: ImportProdukModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName(null);
    setParsedProducts([]);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      ["Nama Produk", "Kategori", "Barcode", "Satuan", "Isi", "Harga Beli", "Harga Jual", "Stok", "Stok Minimum"],
      ["Indomie Goreng", "Makanan", "089686010101", "pcs", "1", "2700", "3200", "40", "10"],
      ["Indomie Goreng", "Makanan", "089686010101", "dus", "40", "105000", "122000", "40", "10"],
      ["Aqua 600ml", "Minuman", "8886008101053", "botol", "1", "2500", "3500", "24", "6"],
    ];
    const csv = templateRows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-import-produk.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (file: File) => {
    setParseError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Format file harus .csv (Comma-Separated Values). Gunakan tombol Download Template CSV atau Save As CSV dari Excel.");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) {
        setParseError("File CSV kosong atau tidak memiliki baris data.");
        return;
      }

      const headers = rows[0].map(normalizeHeader);
      const findCol = (candidates: string[]) =>
        headers.findIndex((h) => candidates.some((c) => h.includes(c)));

      const idxNama = findCol(["namaproduk", "nama"]);
      const idxKategori = findCol(["kategori"]);
      const idxBarcode = findCol(["barcode", "ean"]);
      const idxSatuan = findCol(["satuan", "unit"]);
      const idxIsi = findCol(["isi", "faktor", "konversi"]);
      const idxHargaBeli = findCol(["hargabeli", "beli", "modal", "hpp"]);
      const idxHargaJual = findCol(["hargajual", "jual", "harga"]);
      const idxStok = findCol(["stok", "qty"]);
      const idxStokMin = findCol(["stokminimum", "minimum", "minstok"]);

      if (idxNama === -1) {
        setParseError("Kolom 'Nama Produk' tidak ditemukan di baris header CSV.");
        return;
      }

      // Kelompokkan berdasarkan Nama Produk (case-insensitive) agar multi-satuan tergabung
      const grouped = new Map<string, ParsedProduct>();

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const nama = (r[idxNama] || "").trim();
        if (!nama) continue;

        const kategori = idxKategori >= 0 ? (r[idxKategori] || "").trim() : "";
        const barcode = idxBarcode >= 0 ? (r[idxBarcode] || "").trim() : "";
        const namaSatuan = (idxSatuan >= 0 ? r[idxSatuan] : "")?.trim() || "pcs";
        const isi = idxIsi >= 0 ? Math.max(0.001, parseNumberId(r[idxIsi], 1)) : 1;
        const hargaBeli = idxHargaBeli >= 0 ? Math.max(0, Math.round(parseNumberId(r[idxHargaBeli], 0))) : 0;
        const hargaJual = idxHargaJual >= 0 ? Math.round(parseNumberId(r[idxHargaJual], 0)) : 0;
        const stok = idxStok >= 0 ? Math.max(0, parseNumberId(r[idxStok], 0)) : 0;
        const stokMinimum = idxStokMin >= 0 ? Math.max(0, parseNumberId(r[idxStokMin], 0)) : 0;

        const key = nama.toLowerCase();
        const existing = grouped.get(key);

        if (!existing) {
          const itemError = hargaJual < 0 ? "Harga jual negatif" : undefined;
          grouped.set(key, {
            nama,
            kategori,
            barcode,
            satuanDasar: isi === 1 ? namaSatuan : "pcs",
            stok,
            stokMinimum,
            satuanList: [
              {
                namaSatuan,
                faktorKeDasar: isi,
                hargaBeli,
                hargaJual,
                isDefault: isi === 1,
              },
            ],
            error: itemError,
          });
        } else {
          if (!existing.barcode && barcode) existing.barcode = barcode;
          if (!existing.kategori && kategori) existing.kategori = kategori;
          if (isi === 1) existing.satuanDasar = namaSatuan;

          const dupSatuan = existing.satuanList.find(
            (s) => s.namaSatuan.toLowerCase() === namaSatuan.toLowerCase()
          );
          if (!dupSatuan) {
            existing.satuanList.push({
              namaSatuan,
              faktorKeDasar: isi,
              hargaBeli,
              hargaJual,
              isDefault: false,
            });
          }
        }
      }

      const list = Array.from(grouped.values()).map((p) => {
        if (!p.satuanList.some((s) => s.isDefault) && p.satuanList.length > 0) {
          p.satuanList[0].isDefault = true;
          p.satuanDasar = p.satuanList[0].namaSatuan;
        }
        return p;
      });

      if (list.length === 0) {
        setParseError("Tidak ada baris produk yang valid untuk diimport.");
        return;
      }

      setFileName(file.name);
      setParsedProducts(list);
    } catch {
      setParseError("Gagal membaca file CSV. Pastikan encoding UTF-8 dan format valid.");
    }
  };

  const handleImport = async () => {
    const validItems = parsedProducts.filter((p) => !p.error);
    if (validItems.length === 0) return;

    setImporting(true);
    setParseError(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          items: validItems.map((p) => ({
            nama: p.nama,
            kategori: p.kategori || null,
            barcode: p.barcode || null,
            satuanDasar: p.satuanDasar,
            stok: p.stok,
            stokMinimum: p.stokMinimum,
            satuanList: p.satuanList,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimport produk");

      const resResult: ImportResult = {
        created: data.created || 0,
        updated: data.updated || 0,
        skipped: data.skipped || 0,
        errors: data.errors || [],
      };
      setResult(resResult);
      onImported(resResult);
    } catch (err: any) {
      setParseError(err?.message || "Gagal mengimport data");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              DATA MASTER
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              Import Data Produk
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {/* Panduan + Template */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
            <div className="text-slate-500 dark:text-zinc-400 leading-relaxed">
              Unggah file <strong className="text-slate-800 dark:text-zinc-200">.csv</strong> (kompatibel juga dengan file hasil <strong className="text-slate-800 dark:text-zinc-200">Download Excel</strong>).
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template CSV</span>
            </button>
          </div>

          {/* Dropzone Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processFile(f);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-slate-200 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500"
              }`}
            >
              {fileName ? (
                <div className="flex flex-col items-center gap-1.5">
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                  <p className="font-semibold text-slate-900 dark:text-zinc-100">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {parsedProducts.length} produk siap diproses · Klik untuk ganti file
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-7 h-7 text-slate-400" />
                  <p className="font-semibold text-slate-700 dark:text-zinc-200">
                    Pilih atau seret file CSV ke sini
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Kolom: Nama Produk, Kategori, Barcode, Satuan, Isi, Harga Beli, Harga Jual, Stok
                  </p>
                </div>
              )}
            </div>
          </div>

          {parseError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Opsi Duplikat */}
          {parsedProducts.length > 0 && !result && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                Jika nama atau barcode produk sudah terdaftar:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("skip")}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    mode === "skip"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                      : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-xs">Lewati</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "skip" ? "text-slate-300 dark:text-zinc-600" : "text-slate-400"}`}>
                    Hanya tambah produk baru
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("update")}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    mode === "update"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                      : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-xs">Perbarui</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "update" ? "text-slate-300 dark:text-zinc-600" : "text-slate-400"}`}>
                    Ubah kategori, harga &amp; satuan
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Hasil Import */}
          {result && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import Selesai</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-emerald-600">{result.created}</p>
                    <p className="text-[11px] text-slate-500">Ditambahkan</p>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-blue-600">{result.updated}</p>
                    <p className="text-[11px] text-slate-500">Diperbarui</p>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-slate-600 dark:text-zinc-300">{result.skipped}</p>
                    <p className="text-[11px] text-slate-500">Dilewati</p>
                  </div>
                </div>
              </div>

              {result.skipped > 0 && result.created === 0 && result.updated === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start justify-between gap-3">
                  <span>
                    Semua produk dilewati karena sudah terdaftar. Pilih mode <strong>Perbarui</strong> jika ingin mengubah kategori, harga, atau satuan produk yang sudah ada.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("update");
                      setResult(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 cursor-pointer"
                  >
                    Ubah ke Perbarui
                  </button>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1.5">
                  <p className="font-semibold text-rose-700 dark:text-rose-300">
                    {result.errors.length} produk gagal diimport:
                  </p>
                  <ul className="space-y-1 text-[11px] text-rose-600 dark:text-rose-400 max-h-36 overflow-y-auto">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>
                        #{e.index} <strong>{e.nama}</strong>: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Preview Tabel */}
          {parsedProducts.length > 0 && !result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Preview Data ({parsedProducts.length} produk)</span>
              </div>
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Produk</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3 text-right">Harga Jual</th>
                      <th className="py-2 px-3 text-right">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {parsedProducts.slice(0, 100).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40">
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-900 dark:text-zinc-100">{p.nama}</p>
                          <p className="text-[11px] text-slate-400">
                            {p.satuanList.length} satuan
                            {p.barcode ? ` · ${p.barcode}` : ""}
                          </p>
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-zinc-400">
                          {p.kategori || "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
                          {formatRupiah(p.satuanList[0]?.hargaJual ?? 0)}
                          <span className="text-[11px] font-normal text-slate-400">
                            /{p.satuanList[0]?.namaSatuan}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-zinc-300 tabular-nums">
                          {formatDecimal(p.stok)} {p.satuanDasar}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedProducts.length > 100 && (
                  <div className="py-2 px-3 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800">
                    Menampilkan 100 dari {parsedProducts.length} produk...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {result ? "Tutup" : "Batal"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedProducts.length === 0}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengimport...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import {parsedProducts.length > 0 ? `${parsedProducts.length} Produk` : ""}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
