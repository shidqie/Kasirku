"use client";

import { useEffect, useState } from "react";
import { PackagePlus, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { formatRupiah, formatDecimal, formatDateTime } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";

interface ProductOption {
  id: string;
  nama: string;
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
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none">
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

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Form Input Barang Masuk */}
      {activeTab === "FORM" && (
        <div className="flex-1 min-h-0 overflow-y-auto pt-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Form catat barang masuk</h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="h-9 px-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah baris barang</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {items.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl">
                <p className="text-xs text-slate-500 mb-3">Belum ada barang yang ditambahkan ke formulir.</p>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="h-9 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Pilih barang sekarang
                </button>
              </div>
            ) : (
            <div className="space-y-3">
              {items.map((row, idx) => {
                const p = products.find((x) => x.id === row.produkId);
                const konversiTotal = row.qty * row.faktorKeDasar;
                const subtotal = row.qty * row.hargaBeliPerSatuan;

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-12 gap-3 items-center"
                  >
                    {/* Pilih Produk */}
                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-sans block mb-1">
                        Nama Produk
                      </label>
                      <select
                        value={row.produkId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-3 h-10 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nama} ({prod.satuanDasar})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Satuan Masuk */}
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-sans block mb-1">
                        Satuan Masuk
                      </label>
                      <select
                        value={row.namaSatuan}
                        onChange={(e) => handleSatuanChange(idx, e.target.value)}
                        className="w-full px-2.5 h-10 bg-white border border-slate-200 rounded-xl text-xs font-sans"
                      >
                        {p?.satuanProduk.map((sat) => (
                          <option key={sat.id} value={sat.namaSatuan}>
                            {sat.namaSatuan}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty Masuk */}
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-sans block mb-1">
                        Jumlah (Qty)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min={0.001}
                        required
                        value={row.qty}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].qty = parseFloat(e.target.value || "0");
                          setItems(updated);
                        }}
                        className="w-full px-2.5 h-10 bg-white border border-slate-200 rounded-xl text-xs font-bold font-sans"
                      />
                    </div>

                    {/* Harga Beli Satuan */}
                    <div className="col-span-8 sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-sans block mb-1">
                        Harga Beli / Satuan (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="0"
                          value={row.hargaBeliPerSatuan ? row.hargaBeliPerSatuan.toLocaleString("id-ID") : ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const updated = [...items];
                            updated[idx].hargaBeliPerSatuan = digits ? parseInt(digits, 10) : 0;
                            setItems(updated);
                          }}
                          className="w-full pl-9 pr-3 h-10 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right text-slate-800 focus:outline-none focus:border-[#F0090F]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                        Subtotal: {formatRupiah(subtotal)}
                      </span>
                    </div>

                    {/* Hapus & Preview Konversi */}
                    <div className="col-span-4 sm:col-span-1 flex flex-col items-end justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] text-[#F0090F] font-bold font-sans mt-1">
                        +{formatDecimal(konversiTotal)} {row.satuanDasar}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="p-4 bg-red-50/60 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans block mb-1">
                  Catatan Penerimaan / No. Faktur Suplier
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Belanja Pasar Induk Toko Jaya"
                  className="w-full sm:w-80 px-3 h-10 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Nilai Belanja Masuk:</span>
                <span className="text-2xl font-black text-[#F0090F] font-sans">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? "Menyimpan ke Stok..." : "Konfirmasi & simpan stok masuk"}
            </button>
          )}
        </form>
        </div>
      )}

      {/* Tab 2: Tabel Riwayat Penerimaan Sebelumnya (Flat Minimalist, Scrollable Internal) */}
      {activeTab === "RIWAYAT" && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Memuat riwayat barang masuk...
                  </td>
                </tr>
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
