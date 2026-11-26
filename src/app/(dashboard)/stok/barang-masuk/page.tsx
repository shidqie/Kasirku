"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { PackagePlus, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw, Search } from "lucide-react";
import { formatRupiah, formatDecimal, formatDateTime } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";
import { Dropdown } from "@/components/shared/Dropdown";
import { NumberInput } from "@/components/shared/NumberInput";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { PopupAlert } from "@/components/shared/ToastProvider";

interface ProductOption {
  id: string;
  nama: string;
  barcode?: string | null;
  satuanDasar: string;
  satuanProduk: {
    id: string;
    namaSatuan: string;
    faktorKeDasar: number;
    hargaBeli: number;
  }[];
}

interface ItemRow {
  produkId: string;
  namaSatuan: string;
  faktorKeDasar: number;
  qty: number;
  hargaBeliPerSatuan: number;
  satuanDasar: string;
}

interface ReceiptHistoryItem {
  id: string;
  nomor: string;
  tanggal: string;
  catatan: string | null;
  user: { nama: string; username: string };
  items: {
    id: string;
    namaSatuan: string;
    qty: string | number;
    qtyDasar: string | number;
    hargaBeliPerSatuan: number;
    subtotal: number;
    produk: { nama: string; satuanDasar: string };
  }[];
}

export default function BarangMasukPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [receipts, setReceipts] = useState<ReceiptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tabs & Pagination
  const [activeTab, setActiveTab] = useState<"FORM" | "RIWAYAT">("FORM");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [isQuickDropdownOpen, setIsQuickDropdownOpen] = useState(false);
  const quickSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target as Node)) {
        setIsQuickDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const quickFilteredProducts = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [products, quickSearch]);

  const handleSelectQuickProduct = (p: ProductOption) => {
    const s = p.satuanProduk[0] || {
      namaSatuan: p.satuanDasar,
      faktorKeDasar: 1,
      hargaBeli: 0,
    };
    setItems((prev) => [
      ...prev,
      {
        produkId: p.id,
        namaSatuan: s.namaSatuan,
        faktorKeDasar: Number(s.faktorKeDasar),
        hargaBeliPerSatuan: s.hargaBeli,
        satuanDasar: p.satuanDasar,
        qty: 1,
      },
    ]);
    setQuickSearch("");
    setIsQuickDropdownOpen(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, rRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/stock/receipts"),
      ]);
      const pData = await pRes.json();
      const rData = await rRes.json();

      if (pRes.ok) setProducts(pData.products || []);
      if (rRes.ok) setReceipts(rData.receipts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const firstP = products[0];
    const firstS = firstP.satuanProduk[0] || {
      namaSatuan: firstP.satuanDasar,
      faktorKeDasar: 1,
      hargaBeli: 0,
    };

    setItems([
      ...items,
      {
        produkId: firstP.id,
        namaSatuan: firstS.namaSatuan,
        faktorKeDasar: Number(firstS.faktorKeDasar),
        hargaBeliPerSatuan: firstS.hargaBeli,
        satuanDasar: firstP.satuanDasar,
        qty: 1,
      },
    ]);
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const p = products.find((x) => x.id === newProductId);
    if (!p) return;
    const s = p.satuanProduk[0] || {
      namaSatuan: p.satuanDasar,
      faktorKeDasar: 1,
      hargaBeli: 0,
    };

    const updated = [...items];
    updated[index] = {
      produkId: p.id,
      namaSatuan: s.namaSatuan,
      faktorKeDasar: Number(s.faktorKeDasar),
      hargaBeliPerSatuan: s.hargaBeli,
      satuanDasar: p.satuanDasar,
      qty: 1,
    };
    setItems(updated);
  };

  const handleSatuanChange = (index: number, namaSatuan: string) => {
    const row = items[index];
    const p = products.find((x) => x.id === row.produkId);
    if (!p) return;
    const s = p.satuanProduk.find((x) => x.namaSatuan === namaSatuan);
    if (!s) return;

    const updated = [...items];
    updated[index] = {
      ...row,
      namaSatuan: s.namaSatuan,
      faktorKeDasar: Number(s.faktorKeDasar),
      hargaBeliPerSatuan: s.hargaBeli,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Silakan tambahkan minimal 1 item barang masuk.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catatan: catatan.trim() || null,
          items: items.map((i) => ({
            produkId: i.produkId,
            namaSatuan: i.namaSatuan,
            faktorKeDasar: i.faktorKeDasar,
            qty: i.qty,
            hargaBeliPerSatuan: i.hargaBeliPerSatuan,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat barang masuk");

      setSuccess(`Barang masuk no. ${data.result.bm.nomor} berhasil dicatat.`);
      setItems([]);
      setCatatan("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = items.reduce(
    (sum, item) => sum + item.qty * item.hargaBeliPerSatuan,
    0
  );

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      {/* Header & Tabs Fixed at Top */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Penerimaan Barang Masuk
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Catat stok barang yang baru tiba dari belanja/suplier. Sistem akan mengonversi otomatis ke satuan dasar dan menambah stok ledger.
            </p>
          </div>
          {activeTab === "RIWAYAT" && (
            <button
              type="button"
              onClick={fetchData}
              title="Muat ulang"
              aria-label="Muat ulang"
              className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          )}
        </div>

        {/* Tabs Garis Bawah */}
        <div className="pt-4 flex items-center gap-6 border-b border-slate-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("FORM")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "FORM"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
            }`}
          >
            Form barang masuk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RIWAYAT")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "RIWAYAT"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
            }`}
          >
            Riwayat barang masuk ({receipts.length})
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />
      </div>

      {/* Tab 1: Form Input Barang Masuk (Gaya Minimalis seperti Input Bon) */}
      {activeTab === "FORM" && (
        <div className="flex-1 min-h-0 overflow-y-auto pt-5 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Search Produk dari Data Master */}
            <div ref={quickSearchRef} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari produk dari data master (nama atau barcode)..."
                value={quickSearch}
                onFocus={() => setIsQuickDropdownOpen(true)}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setIsQuickDropdownOpen(true);
                }}
                className="w-full pl-10 pr-4 h-11 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />

              {isQuickDropdownOpen && quickFilteredProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                  {quickFilteredProducts.map((p) => {
                    const defaultSat = p.satuanProduk[0];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectQuickProduct(p)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-zinc-100 block">
                            {p.nama}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Satuan dasar: {p.satuanDasar}
                            {p.barcode ? ` · ${p.barcode}` : ""}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-zinc-300 tabular-nums shrink-0">
                          {defaultSat ? formatRupiah(defaultSat.hargaBeli) : "-"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Catatan (Opsional) */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1.5">
                Catatan Penerimaan / No. Faktur Suplier (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Belanja Pasar Induk Toko Jaya"
                className="w-full px-3.5 h-11 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            {/* Tabel Daftar Barang Masuk (Gaya Input Bon) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  Daftar Barang ({items.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Tekan Enter di kolom harga untuk tambah baris
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
                    <thead className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-medium text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3.5 min-w-[200px]">Barang</th>
                        <th className="py-2.5 px-2 w-24">Qty</th>
                        <th className="py-2.5 px-2 w-32">Satuan</th>
                        <th className="py-2.5 px-2 w-36 text-right">Harga Beli</th>
                        <th className="py-2.5 px-3.5 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 pr-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                            Cari produk di atas atau klik &ldquo;+ Tambah Baris&rdquo; di bawah untuk mulai mencatat.
                          </td>
                        </tr>
                      ) : (
                        items.map((row, idx) => {
                          const p = products.find((x) => x.id === row.produkId);
                          const konversiTotal = row.qty * row.faktorKeDasar;
                          const subtotal = row.qty * row.hargaBeliPerSatuan;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 px-3.5">
                                <Dropdown
                                  variant="underline"
                                  searchable
                                  className="w-full"
                                  ariaLabel="Pilih produk barang masuk"
                                  value={row.produkId}
                                  onChange={(val) => handleProductChange(idx, val)}
                                  searchPlaceholder="Cari barang..."
                                  options={products.map((prod) => ({
                                    value: prod.id,
                                    label: prod.nama,
                                  }))}
                                />
                                <span className="text-[10px] text-emerald-600 font-medium block mt-0.5 tabular-nums">
                                  +{formatDecimal(konversiTotal)} {row.satuanDasar}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                <NumberInput
                                  min={0.001}
                                  emptyFallback={1}
                                  required
                                  value={row.qty}
                                  onChange={(val) => {
                                    const updated = [...items];
                                    updated[idx].qty = val;
                                    setItems(updated);
                                  }}
                                  className="w-20 bg-transparent text-xs font-bold text-slate-900 dark:text-zinc-100 focus:outline-none tabular-nums"
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <Dropdown
                                  variant="underline"
                                  searchable={false}
                                  className="w-full"
                                  ariaLabel="Pilih satuan barang masuk"
                                  value={row.namaSatuan}
                                  onChange={(val) => handleSatuanChange(idx, val)}
                                  options={(p?.satuanProduk || []).map((sat) => ({
                                    value: sat.namaSatuan,
                                    label: sat.namaSatuan,
                                  }))}
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[11px] text-slate-400">Rp</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    placeholder="0"
                                    value={
                                      row.hargaBeliPerSatuan
                                        ? row.hargaBeliPerSatuan.toLocaleString("id-ID")
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const digits = e.target.value.replace(/\D/g, "");
                                      const updated = [...items];
                                      updated[idx].hargaBeliPerSatuan = digits
                                        ? parseInt(digits, 10)
                                        : 0;
                                      setItems(updated);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddItemRow();
                                      }
                                    }}
                                    className="w-24 bg-transparent text-xs font-semibold text-right text-slate-900 dark:text-zinc-100 focus:outline-none tabular-nums"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums whitespace-nowrap">
                                {formatRupiah(subtotal)}
                              </td>
                              <td className="py-2.5 pr-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus baris"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    Total Nilai Belanja Masuk:{" "}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums ml-1">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? "Menyimpan ke Stok..." : "Konfirmasi & simpan stok masuk"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab 2: Tabel Riwayat Penerimaan Sebelumnya (Flat Minimalist, Scrollable Internal) */}
      {activeTab === "RIWAYAT" && (
        <>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
                <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 pr-4">No. Dokumen</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Diterima oleh</th>
                <th className="py-3 px-4">Rincian barang</th>
                <th className="py-3 pl-4 text-right">Total nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loading ? (
                <TableSkeletonRows rows={5} cols={5} />
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Belum ada riwayat penerimaan barang masuk.
                  </td>
                </tr>
              ) : (
                receipts
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((r) => {
                  const totalNilai = r.items.reduce((s, it) => s + it.subtotal, 0);
                  return (
                    <tr key={r.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-sans font-bold text-[#F0090F]">{r.nomor}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDateTime(r.tanggal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{r.user.nama}</span>
                        <span className="text-xs text-slate-400 block font-sans">@{r.user.username}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-xs">
                          {r.items.map((it) => (
                            <div key={it.id} className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{it.produk.nama}:</span>
                              <span className="font-sans text-slate-600">
                                {formatDecimal(it.qty)} {it.namaSatuan} (+{formatDecimal(it.qtyDasar)} {it.produk.satuanDasar})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans font-bold text-slate-800">
                        {formatRupiah(totalNilai)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
              </table>
          </div>
          {receipts.length > 0 && (
            <div className="shrink-0">
              <Pagination
                currentPage={currentPage}
                totalItems={receipts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
