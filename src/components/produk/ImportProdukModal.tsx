"use client";

import { useMemo, useRef, useState } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { formatRupiah, formatDecimal } from "@/lib/formatters";
import { DataTable, DataTableHeader, DataTableHead, DataTableBody, DataTableRow } from "@/components/shared/DataTable";

interface ExistingProductRef {
  id: string;
  nama: string;
  barcode: string | null;
  satuanDasar: string;
  stokCache: string | number;
  kategori: { id: string; nama: string } | null;
  satuanProduk: {
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    hargaBeli: number;
  }[];
}

interface ExistingCategoryRef {
  id: string;
  nama: string;
}

interface ParsedSatuan {
  namaSatuan: string;
  faktorKeDasar: number;
  hargaBeli: number;
  hargaJual: number;
  isDefault: boolean;
}

interface ParsedProduct {
  rowNumbers: number[];
  nama: string;
  groupName?: string;
  variantName?: string;
  kategori: string;
  barcode: string;
  satuanDasar: string;
  stok: number;
  stokMinimum: number;
  satuanList: ParsedSatuan[];
  errors: string[];
}

type PreviewStatus = "BARU" | "DUPLIKAT" | "PERBARUI" | "INVALID";

interface PreviewRow extends ParsedProduct {
  status: PreviewStatus;
  matchedProduct?: ExistingProductRef;
  changes: string[];
}

export interface ImportReportEntry {
  no: number;
  nama: string;
  barcode: string;
  kategori: string;
  status: "DITAMBAHKAN" | "DIPERBARUI" | "DUPLIKAT" | "GAGAL";
  keterangan: string;
}

export interface ImportResult {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; nama: string; reason: string }[];
  duplicates?: { index: number; nama: string; barcode: string }[];
  reportEntries?: ImportReportEntry[];
}

interface ImportProdukModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts?: ExistingProductRef[];
  existingCategories?: ExistingCategoryRef[];
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

function parseStrictNumber(val: string | undefined): { value: number; valid: boolean } {
  if (val === undefined || val.trim() === "") return { value: 0, valid: true };
  const cleaned = val
    .replace(/rp/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { value: NaN, valid: false };
  }
  const num = Number(cleaned);
  return { value: num, valid: Number.isFinite(num) };
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function ImportProdukModal({
  isOpen,
  onClose,
  existingProducts = [],
  existingCategories = [],
  onImported,
}: ImportProdukModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [allowCreateCategory, setAllowCreateCategory] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Hitung preview dengan status & diff perubahan secara realtime mengikuti mode
  const previewData = useMemo(() => {
    const existingByBarcode = new Map<string, ExistingProductRef>();
    const existingByName = new Map<string, ExistingProductRef>();
    for (const ep of existingProducts) {
      if (ep.barcode) existingByBarcode.set(ep.barcode.trim(), ep);
      existingByName.set(ep.nama.trim().toLowerCase(), ep);
    }

    const existingCatNames = new Set(
      existingCategories.map((c) => c.nama.trim().toLowerCase())
    );
    const newCategorySet = new Set<string>();

    // Cek barcode ganda antar produk berbeda di file
    const fileBarcodeOwner = new Map<string, string>();
    for (const p of parsedProducts) {
      if (p.barcode) {
        const prev = fileBarcodeOwner.get(p.barcode);
        if (!prev) fileBarcodeOwner.set(p.barcode, p.nama.toLowerCase());
      }
    }

    const rows: PreviewRow[] = parsedProducts.map((p) => {
      const rowErrors = [...p.errors];

      if (p.barcode) {
        const owner = fileBarcodeOwner.get(p.barcode);
        if (owner && owner !== p.nama.toLowerCase()) {
          rowErrors.push(`Barcode '${p.barcode}' ganda di dalam file CSV`);
        }
      }

      if (p.kategori && !existingCatNames.has(p.kategori.toLowerCase())) {
        newCategorySet.add(p.kategori);
        if (!allowCreateCategory) {
          rowErrors.push(`Kategori '${p.kategori}' belum terdaftar`);
        }
      }

      if (rowErrors.length > 0) {
        return {
          ...p,
          errors: rowErrors,
          status: "INVALID",
          changes: [],
        };
      }

      const matched =
        (p.barcode ? existingByBarcode.get(p.barcode) : undefined) ??
        existingByName.get(p.nama.toLowerCase());

      if (!matched) {
        return {
          ...p,
          status: "BARU",
          changes: [],
        };
      }

      if (mode === "skip") {
        return {
          ...p,
          status: "DUPLIKAT",
          matchedProduct: matched,
          changes: [],
        };
      }

      // Mode update: hitung ringkasan perubahan harga & info
      const changes: string[] = [];
      const oldKat = matched.kategori?.nama || "Umum";
      if (p.kategori && p.kategori.toLowerCase() !== oldKat.toLowerCase()) {
        changes.push(`Kategori: ${oldKat} → ${p.kategori}`);
      }
      if (p.barcode && p.barcode !== (matched.barcode || "")) {
        changes.push(`Barcode: ${matched.barcode || "-"} → ${p.barcode}`);
      }
      for (const u of p.satuanList) {
        const oldUnit = matched.satuanProduk.find(
          (su) => su.namaSatuan.toLowerCase() === u.namaSatuan.toLowerCase()
        );
        if (!oldUnit) {
          changes.push(`+ Satuan ${u.namaSatuan}: ${formatRupiah(u.hargaJual)}`);
        } else {
          if (oldUnit.hargaJual !== u.hargaJual) {
            changes.push(
              `Jual (${u.namaSatuan}): ${formatRupiah(oldUnit.hargaJual)} → ${formatRupiah(u.hargaJual)}`
            );
          }
          if (oldUnit.hargaBeli !== u.hargaBeli) {
            changes.push(
              `Beli (${u.namaSatuan}): ${formatRupiah(oldUnit.hargaBeli)} → ${formatRupiah(u.hargaBeli)}`
            );
          }
        }
      }
      if (changes.length === 0) {
        changes.push("Tidak ada perubahan nilai");
      }

      return {
        ...p,
        status: "PERBARUI",
        matchedProduct: matched,
        changes,
      };
    });

    const stats = {
      total: rows.length,
      baru: rows.filter((r) => r.status === "BARU").length,
      duplikat: rows.filter((r) => r.status === "DUPLIKAT").length,
      perbarui: rows.filter((r) => r.status === "PERBARUI").length,
      invalid: rows.filter((r) => r.status === "INVALID").length,
      newCategories: Array.from(newCategorySet),
    };

    return { rows, stats };
  }, [parsedProducts, existingProducts, existingCategories, mode, allowCreateCategory]);

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
    // Susunan 9 kolom sesuai spesifikasi; barcode dikutip sebagai teks agar nol di depan terjaga
    const templateRows = [
      ["Nama Produk", "group_name", "variant_name", "Kategori", "Barcode", "Satuan", "Isi", "Harga Beli", "Harga Jual", "Stok", "Stok Minimum"],
      ["Indomie Goreng", "", "", "Makanan", "089686010101", "pcs", "1", "2700", "3200", "40", "10"],
      ["Indomie Goreng", "", "", "Makanan", "089686010101", "dus", "40", "105000", "122000", "40", "10"],
      ["Cimory Fresh Milk Cokelat", "Cimory Fresh Milk", "Cokelat", "Susu & Olahan Susu", "8993001001", "botol", "1", "5500", "7000", "24", "6"],
      ["Cimory Fresh Milk Matcha", "Cimory Fresh Milk", "Matcha", "Susu & Olahan Susu", "8993001002", "botol", "1", "5500", "7000", "20", "6"],
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

  const handleDownloadReport = () => {
    if (!result?.reportEntries || result.reportEntries.length === 0) return;
    const headers = ["No", "Nama Produk", "Barcode", "Kategori", "Status", "Keterangan"];
    const rows = [
      headers,
      ...result.reportEntries.map((r) => [
        String(r.no),
        r.nama,
        r.barcode,
        r.kategori,
        r.status,
        r.keterangan,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-import-produk-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (file: File) => {
    setParseError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Format file harus .csv. Gunakan tombol Download Template atau Save As CSV dari Excel.");
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
      const findCol = (candidates: string[]) => {
        for (const c of candidates) {
          const exact = headers.findIndex((h) => h === c);
          if (exact !== -1) return exact;
        }
        for (const c of candidates) {
          const partial = headers.findIndex((h) => h.includes(c));
          if (partial !== -1) return partial;
        }
        return -1;
      };

      const idxNama = findCol(["namaproduk", "nama"]);
      const idxGroupName = findCol(["groupname", "namagrup", "induk", "group"]);
      const idxVariantName = findCol(["variantname", "namavarian", "varian", "rasa", "variant"]);
      const idxKategori = findCol(["kategori"]);
      const idxBarcode = findCol(["barcode", "ean"]);
      const idxSatuan = findCol(["satuan", "unit"]);
      const idxIsi = findCol(["isi", "faktor", "konversi"]);
      const idxHargaBeli = findCol(["hargabeli", "beli", "modal", "hpp"]);
      const idxHargaJual = findCol(["hargajual", "jual", "harga"]);
      const idxStok = findCol(["stok"]);
      const idxStokMin = findCol(["stokminimum", "minimum", "minstok"]);

      if (idxNama === -1) {
        setParseError("Kolom 'Nama Produk' tidak ditemukan di baris header CSV.");
        return;
      }

      const grouped = new Map<string, ParsedProduct>();

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 1;
        const groupName = idxGroupName >= 0 ? (r[idxGroupName] || "").trim() : "";
        const variantName = idxVariantName >= 0 ? (r[idxVariantName] || "").trim() : "";
        const rawNama = (r[idxNama] || "").trim();
        const nama = rawNama || (groupName && variantName ? `${groupName} ${variantName}` : groupName);
        const kategori = idxKategori >= 0 ? (r[idxKategori] || "").trim() : "";
        // Barcode diperlakukan murni sebagai teks agar angka 0 di depan tidak hilang
        const barcode = idxBarcode >= 0 ? (r[idxBarcode] || "").trim() : "";
        const namaSatuan = (idxSatuan >= 0 ? r[idxSatuan] : "")?.trim() || "";

        const isiParsed = idxIsi >= 0 ? parseStrictNumber(r[idxIsi] || "1") : { value: 1, valid: true };
        const beliParsed = idxHargaBeli >= 0 ? parseStrictNumber(r[idxHargaBeli]) : { value: 0, valid: true };
        const jualParsed = idxHargaJual >= 0 ? parseStrictNumber(r[idxHargaJual]) : { value: 0, valid: true };
        const stokParsed = idxStok >= 0 ? parseStrictNumber(r[idxStok]) : { value: 0, valid: true };
        const minParsed = idxStokMin >= 0 ? parseStrictNumber(r[idxStokMin]) : { value: 0, valid: true };

        const rowErrors: string[] = [];
        if (!nama) rowErrors.push(`Baris ${rowNum}: Nama produk wajib diisi`);
        if (!namaSatuan) rowErrors.push(`Baris ${rowNum}: Satuan wajib diisi`);
        if (!isiParsed.valid || isiParsed.value <= 0) rowErrors.push(`Baris ${rowNum}: Isi satuan harus > 0`);
        if (!beliParsed.valid || beliParsed.value < 0) rowErrors.push(`Baris ${rowNum}: Harga beli tidak valid`);
        if (!jualParsed.valid || jualParsed.value < 0) rowErrors.push(`Baris ${rowNum}: Harga jual tidak valid`);
        if (!stokParsed.valid || stokParsed.value < 0) rowErrors.push(`Baris ${rowNum}: Stok tidak boleh negatif`);
        if (!minParsed.valid || minParsed.value < 0) rowErrors.push(`Baris ${rowNum}: Stok minimum tidak boleh negatif`);

        const key = nama ? nama.toLowerCase() : `__empty_row_${rowNum}`;
        const existing = grouped.get(key);

        if (!existing) {
          grouped.set(key, {
            rowNumbers: [rowNum],
            nama: nama || `(Baris ${rowNum} tanpa nama)`,
            groupName: groupName || undefined,
            variantName: variantName || undefined,
            kategori,
            barcode,
            satuanDasar: isiParsed.value === 1 && namaSatuan ? namaSatuan : namaSatuan || "pcs",
            stok: stokParsed.valid ? Math.max(0, stokParsed.value) : 0,
            stokMinimum: minParsed.valid ? Math.max(0, minParsed.value) : 0,
            satuanList: [
              {
                namaSatuan: namaSatuan || "pcs",
                faktorKeDasar: isiParsed.valid && isiParsed.value > 0 ? isiParsed.value : 1,
                hargaBeli: beliParsed.valid ? Math.max(0, Math.round(beliParsed.value)) : 0,
                hargaJual: jualParsed.valid ? Math.max(0, Math.round(jualParsed.value)) : 0,
                isDefault: isiParsed.value === 1,
              },
            ],
            errors: rowErrors,
          });
        } else {
          existing.rowNumbers.push(rowNum);
          existing.errors.push(...rowErrors);
          if (!existing.barcode && barcode) existing.barcode = barcode;
          if (!existing.kategori && kategori) existing.kategori = kategori;
          if (isiParsed.value === 1 && namaSatuan) existing.satuanDasar = namaSatuan;

          const dupSatuan = existing.satuanList.find(
            (s) => s.namaSatuan.toLowerCase() === (namaSatuan || "pcs").toLowerCase()
          );
          if (!dupSatuan) {
            existing.satuanList.push({
              namaSatuan: namaSatuan || "pcs",
              faktorKeDasar: isiParsed.valid && isiParsed.value > 0 ? isiParsed.value : 1,
              hargaBeli: beliParsed.valid ? Math.max(0, Math.round(beliParsed.value)) : 0,
              hargaJual: jualParsed.valid ? Math.max(0, Math.round(jualParsed.value)) : 0,
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
        setParseError("Tidak ada baris produk yang terbaca dari file CSV.");
        return;
      }

      setFileName(file.name);
      setParsedProducts(list);
    } catch {
      setParseError("Gagal membaca file CSV. Pastikan encoding UTF-8 dan format valid.");
    }
  };

  const handleImport = async () => {
    const validRows = previewData.rows.filter((r) => r.status !== "INVALID");
    if (validRows.length === 0) return;

    setImporting(true);
    setParseError(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          allowCreateCategory,
          items: validRows.map((p) => ({
            nama: p.nama,
            groupName: p.groupName || null,
            variantName: p.variantName || null,
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
        totalProcessed: data.totalProcessed ?? validRows.length,
        created: data.created || 0,
        updated: data.updated || 0,
        skipped: data.skipped || 0,
        errors: data.errors || [],
        duplicates: data.duplicates || [],
        reportEntries: data.reportEntries || [],
      };
      setResult(resResult);
      onImported(resResult);
    } catch (err: any) {
      setParseError(err?.message || "Gagal mengimport data");
    } finally {
      setImporting(false);
    }
  };

  const validCount = previewData.rows.filter((r) => r.status !== "INVALID").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              DATA MASTER · TOKO GAGAN
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
              Unggah file <strong className="text-slate-800 dark:text-zinc-200">.csv</strong>. Barcode dibaca sebagai teks agar angka 0 di depan tetap aman.
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Pilihan Metode Import */}
          {!result && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                1. Pilih Metode Import
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("skip")}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    mode === "skip"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                      : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-xs">A. Import Produk Baru (Default)</p>
                  <p className={`text-[11px] mt-0.5 ${mode === "skip" ? "text-slate-300 dark:text-zinc-600" : "text-slate-400"}`}>
                    Tambah barang baru saja. Barcode/produk lama dilewati tanpa diubah.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("update")}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    mode === "update"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                      : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-xs">B. Import &amp; Update Produk</p>
                  <p className={`text-[11px] mt-0.5 ${mode === "update" ? "text-slate-300 dark:text-zinc-600" : "text-slate-400"}`}>
                    Tambah produk baru &amp; perbarui harga/kategori produk lama. Stok berjalan tetap.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Upload CSV */}
          {!result && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                2. Upload File CSV
              </p>
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
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500"
                }`}
              >
                {fileName ? (
                  <div className="flex flex-col items-center gap-1">
                    <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                    <p className="font-semibold text-slate-900 dark:text-zinc-100">{fileName}</p>
                    <p className="text-[11px] text-slate-400">
                      {previewData.stats.total} produk terbaca · Klik untuk ganti file
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-7 h-7 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-zinc-200">
                      Pilih atau seret file CSV ke sini
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Kolom: Nama Produk, Kategori, Barcode, Satuan, Isi, Harga Beli, Harga Jual, Stok, Stok Minimum
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {parseError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Persetujuan Kategori Baru */}
          {previewData.stats.newCategories.length > 0 && !result && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCreateCategory}
                onChange={(e) => setAllowCreateCategory(e.target.checked)}
                className="mt-0.5 rounded border-amber-400"
              />
              <div className="text-amber-800 dark:text-amber-300">
                <p className="font-semibold">
                  Ditemukan {previewData.stats.newCategories.length} kategori baru belum terdaftar:
                </p>
                <p className="text-[11px] mt-0.5">
                  {previewData.stats.newCategories.join(", ")} — Setujui pembuatan otomatis saat import.
                </p>
              </div>
            </label>
          )}

          {/* Preview Sebelum Import */}
          {previewData.rows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                  <p className="text-base font-bold text-slate-900 dark:text-zinc-100">{previewData.stats.total}</p>
                  <p className="text-[10px] text-slate-500">Total Data</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <p className="text-base font-bold text-emerald-600">{previewData.stats.baru}</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">Produk Baru</p>
                </div>
                {mode === "skip" ? (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                    <p className="text-base font-bold text-amber-600">{previewData.stats.duplikat}</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">Duplikat</p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                    <p className="text-base font-bold text-blue-600">{previewData.stats.perbarui}</p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-300">Akan Diperbarui</p>
                  </div>
                )}
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
                  <p className="text-base font-bold text-rose-600">{previewData.stats.invalid}</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-300">Tidak Valid</p>
                </div>
              </div>

              {previewData.stats.invalid > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {previewData.stats.invalid} data tidak valid akan dilewati secara otomatis saat konfirmasi import.
                  </span>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto">
                <DataTable>
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>Produk</DataTableHead>
                      <DataTableHead>Status</DataTableHead>
                      <DataTableHead align="right">Harga Jual</DataTableHead>
                      <DataTableHead align="right">Stok</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {previewData.rows.slice(0, 100).map((p, idx) => (
                      <DataTableRow key={idx} className="align-top">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900 dark:text-zinc-100">{p.nama}</p>
                          <p className="text-[11px] text-slate-400">
                            {p.kategori || "Umum"} · {p.satuanList.length} satuan
                            {p.barcode ? ` · ${p.barcode}` : ""}
                          </p>
                          {p.status === "INVALID" && p.errors.length > 0 && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                              {p.errors[0]}
                            </p>
                          )}
                          {p.status === "PERBARUI" && p.changes.length > 0 && (
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                              {p.changes.slice(0, 2).join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {p.status === "BARU" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                              Produk Baru
                            </span>
                          )}
                          {p.status === "DUPLIKAT" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                              Duplikat
                            </span>
                          )}
                          {p.status === "PERBARUI" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
                              Akan Diperbarui
                            </span>
                          )}
                          {p.status === "INVALID" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
                              Data Tidak Valid
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-zinc-200 tabular-nums whitespace-nowrap">
                          {formatRupiah(p.satuanList[0]?.hargaJual ?? 0)}
                          <span className="text-[11px] font-normal text-slate-400">
                            /{p.satuanList[0]?.namaSatuan}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                          {p.status === "PERBARUI" && p.matchedProduct
                            ? `${formatDecimal(Number(p.matchedProduct.stokCache))} (tetap)`
                            : `${formatDecimal(p.stok)} ${p.satuanDasar}`}
                        </td>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
                {previewData.rows.length > 100 && (
                  <div className="py-2 px-3 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800">
                    Menampilkan 100 dari {previewData.rows.length} produk...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Laporan Hasil Import */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Laporan Hasil Import ({result.totalProcessed} diproses)</span>
                  </div>
                  {result.reportEntries && result.reportEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-emerald-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Laporan (.csv)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-emerald-600">{result.created}</p>
                    <p className="text-[11px] text-slate-500">Ditambahkan</p>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-blue-600">{result.updated}</p>
                    <p className="text-[11px] text-slate-500">Diperbarui</p>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-amber-600">{result.skipped}</p>
                    <p className="text-[11px] text-slate-500">Duplikat</p>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/60 rounded-lg p-2">
                    <p className="text-base font-bold text-rose-600">{result.errors.length}</p>
                    <p className="text-[11px] text-slate-500">Gagal</p>
                  </div>
                </div>
              </div>

              {result.duplicates && result.duplicates.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {result.duplicates.length} produk duplikat dilewati:
                  </p>
                  <ul className="space-y-1 text-[11px] text-amber-700 dark:text-amber-400 max-h-36 overflow-y-auto">
                    {result.duplicates.map((d, idx) => (
                      <li key={idx}>
                        #{d.index} <strong>{d.nama}</strong> ({d.barcode})
                      </li>
                    ))}
                  </ul>
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
              disabled={importing || validCount === 0}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Import...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Konfirmasi Import ({validCount} Produk)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
