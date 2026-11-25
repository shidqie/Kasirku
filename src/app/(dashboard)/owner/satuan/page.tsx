"use client";

import { useState, useMemo } from "react";
import { Trash2, X, Eye, Pencil } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/ToastProvider";

interface MasterSatuan {
  id: string;
  kode: string;
  nama: string;
  kategori: "Kecil / Eceran" | "Sedang" | "Besar / Grosir";
  deskripsi: string;
  isTimbangan?: boolean;
}

interface AturanKonversi {
  id: string;
  satuanBesar: string;
  isi: number;
  satuanKecil: string;
  contohBarang: string;
}

const DEFAULT_SATUAN: MasterSatuan[] = [
  { id: "1", kode: "pcs", nama: "Pieces (Pcs)", kategori: "Kecil / Eceran", deskripsi: "Satuan eceran umum kemasan satuan" },
  { id: "2", kode: "sachet", nama: "Sachet", kategori: "Kecil / Eceran", deskripsi: "Minuman serbuk, kopi, sampo rencengan" },
  { id: "3", kode: "bungkus", nama: "Bungkus", kategori: "Kecil / Eceran", deskripsi: "Mie instan, rokok, bumbu kemasan" },
  { id: "4", kode: "butir", nama: "Butir", kategori: "Kecil / Eceran", deskripsi: "Telur eceran butiran" },
  { id: "5", kode: "kg", nama: "Kilogram (Kg)", kategori: "Kecil / Eceran", deskripsi: "Beras kiloan, telur kiloan, gula pasir", isTimbangan: true },
  { id: "6", kode: "ons", nama: "Ons (100 gr)", kategori: "Kecil / Eceran", deskripsi: "Cabai, bawang, bumbu timbangan kecil", isTimbangan: true },
  { id: "7", kode: "liter", nama: "Liter (L)", kategori: "Kecil / Eceran", deskripsi: "Minyak goreng pouch, minyak curah" },
  { id: "8", kode: "renceng", nama: "Renceng", kategori: "Sedang", deskripsi: "Kemasan renceng isi 10 atau 12 sachet" },
  { id: "9", kode: "pak", nama: "Pak", kategori: "Sedang", deskripsi: "Kemasan pak sedang isi 10 atau 20 pcs" },
  { id: "10", kode: "slop", nama: "Slop", kategori: "Sedang", deskripsi: "Slop rokok isi 10 bungkus" },
  { id: "11", kode: "dus", nama: "Dus / Karton", kategori: "Besar / Grosir", deskripsi: "Kardus Indomie (isi 40), Aqua, Minyak" },
  { id: "12", kode: "karung", nama: "Karung", kategori: "Besar / Grosir", deskripsi: "Karung beras (25kg/50kg), gula pasir karungan" },
  { id: "13", kode: "bal", nama: "Bal", kategori: "Besar / Grosir", deskripsi: "Bal rokok (20 slop) atau kerupuk bal" },
];

const DEFAULT_KONVERSI: AturanKonversi[] = [
  { id: "k1", satuanBesar: "dus", isi: 40, satuanKecil: "bungkus", contohBarang: "Indomie Goreng / Rebus" },
  { id: "k2", satuanBesar: "dus", isi: 24, satuanKecil: "botol", contohBarang: "Teh Pucuk / Minuman Botol" },
  { id: "k3", satuanBesar: "dus", isi: 6, satuanKecil: "pouch", contohBarang: "Minyak Goreng Bimoli 2 Liter" },
  { id: "k4", satuanBesar: "renceng", isi: 10, satuanKecil: "sachet", contohBarang: "Kopi ABC / Kopi Kapal Api" },
  { id: "k5", satuanBesar: "renceng", isi: 12, satuanKecil: "sachet", contohBarang: "Jasjus / Marimas / Pop Ice" },
  { id: "k6", satuanBesar: "slop", isi: 10, satuanKecil: "bungkus", contohBarang: "Rokok Djarum / Sampoerna" },
  { id: "k7", satuanBesar: "karung", isi: 25, satuanKecil: "kg", contohBarang: "Beras Ramos Setra 25kg" },
  { id: "k8", satuanBesar: "karung", isi: 50, satuanKecil: "kg", contohBarang: "Gula Pasir Karungan" },
  { id: "k9", satuanBesar: "kg", isi: 10, satuanKecil: "ons", contohBarang: "Cabai / Bawang Merah (1kg = 10 ons)" },
];

export default function SatuanKonversiPage() {
  const toast = useToast();
  const [satuanList, setSatuanList] = useState<MasterSatuan[]>(DEFAULT_SATUAN);
  const [konversiList, setKonversiList] = useState<AturanKonversi[]>(DEFAULT_KONVERSI);

  const [activeTab, setActiveTab] = useState<"SATUAN" | "KONVERSI">("SATUAN");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer state
  const [isSatuanModalOpen, setIsSatuanModalOpen] = useState(false);
  const [editingSatuanId, setEditingSatuanId] = useState<string | null>(null);
  const [detailSatuan, setDetailSatuan] = useState<MasterSatuan | null>(null);

  const [isKonversiModalOpen, setIsKonversiModalOpen] = useState(false);
  const [editingKonversiId, setEditingKonversiId] = useState<string | null>(null);
  const [detailKonversi, setDetailKonversi] = useState<AturanKonversi | null>(null);

  // Form Tambah / Edit Satuan
  const [kodeSatuan, setKodeSatuan] = useState("");
  const [namaSatuan, setNamaSatuan] = useState("");
  const [katSatuan, setKatSatuan] = useState<"Kecil / Eceran" | "Sedang" | "Besar / Grosir">("Kecil / Eceran");
  const [deskripsiSatuan, setDeskripsiSatuan] = useState("");
  const [isTimbangan, setIsTimbangan] = useState(false);

  // Form Tambah / Edit Konversi
  const [formBesar, setFormBesar] = useState("dus");
  const [formIsi, setFormIsi] = useState<number>(10);
  const [formKecil, setFormKecil] = useState("pcs");
  const [formContoh, setFormContoh] = useState("");

  const filteredSatuan = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return satuanList;
    return satuanList.filter(
      (s) =>
        s.kode.toLowerCase().includes(q) ||
        s.nama.toLowerCase().includes(q) ||
        s.deskripsi.toLowerCase().includes(q) ||
        s.kategori.toLowerCase().includes(q)
    );
  }, [satuanList, search]);

  const filteredKonversi = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return konversiList;
    return konversiList.filter(
      (k) =>
        k.satuanBesar.toLowerCase().includes(q) ||
        k.satuanKecil.toLowerCase().includes(q) ||
        k.contohBarang.toLowerCase().includes(q)
    );
  }, [konversiList, search]);

  const activeItems = activeTab === "SATUAN" ? filteredSatuan : filteredKonversi;
  const paginatedItems = activeItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openAddSatuan = () => {
    setEditingSatuanId(null);
    setKodeSatuan("");
    setNamaSatuan("");
    setKatSatuan("Kecil / Eceran");
    setDeskripsiSatuan("");
    setIsTimbangan(false);
    setIsSatuanModalOpen(true);
  };

  const openEditSatuan = (s: MasterSatuan) => {
    setEditingSatuanId(s.id);
    setKodeSatuan(s.kode);
    setNamaSatuan(s.nama);
    setKatSatuan(s.kategori);
    setDeskripsiSatuan(s.deskripsi);
    setIsTimbangan(Boolean(s.isTimbangan));
    setIsSatuanModalOpen(true);
  };

  const openAddKonversi = () => {
    setEditingKonversiId(null);
    setFormBesar("dus");
    setFormIsi(10);
    setFormKecil("pcs");
    setFormContoh("");
    setIsKonversiModalOpen(true);
  };

  const openEditKonversi = (k: AturanKonversi) => {
    setEditingKonversiId(k.id);
    setFormBesar(k.satuanBesar);
    setFormIsi(k.isi);
    setFormKecil(k.satuanKecil);
    setFormContoh(k.contohBarang);
    setIsKonversiModalOpen(true);
  };

  const handleSaveSatuan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeSatuan.trim() || !namaSatuan.trim()) return;
    const payload: MasterSatuan = {
      id: editingSatuanId || String(Date.now()),
      kode: kodeSatuan.trim().toLowerCase(),
      nama: namaSatuan.trim(),
      kategori: katSatuan,
      deskripsi: deskripsiSatuan.trim() || (isTimbangan ? "Barang ditimbang saat transaksi" : "Satuan kemasan"),
      isTimbangan,
    };
    if (editingSatuanId) {
      setSatuanList((prev) => prev.map((item) => (item.id === editingSatuanId ? payload : item)));
      toast.success(`Satuan "${payload.nama}" berhasil diperbarui!`);
    } else {
      setSatuanList((prev) => [...prev, payload]);
      toast.success(`Satuan "${payload.nama}" berhasil ditambahkan!`);
    }
    setIsSatuanModalOpen(false);
    setEditingSatuanId(null);
  };

  const handleAddKonversi = (e: React.FormEvent) => {
    e.preventDefault();
    if (formIsi <= 0) return;
    const payload: AturanKonversi = {
      id: editingKonversiId || String(Date.now()),
      satuanBesar: formBesar.trim(),
      isi: formIsi,
      satuanKecil: formKecil.trim(),
      contohBarang: formContoh.trim() || "Standar toko",
    };
    if (editingKonversiId) {
      setKonversiList((prev) => prev.map((item) => (item.id === editingKonversiId ? payload : item)));
      toast.success("Rumus konversi berhasil diperbarui!");
    } else {
      setKonversiList((prev) => [...prev, payload]);
      toast.success("Rumus konversi berhasil ditambahkan!");
    }
    setFormContoh("");
    setEditingKonversiId(null);
    setIsKonversiModalOpen(false);
  };

  const handleDeleteSatuan = (id: string) => {
    setSatuanList((prev) => prev.filter((s) => s.id !== id));
    toast.success("Satuan berhasil dihapus.");
  };

  const handleDeleteKonversi = (id: string) => {
    setKonversiList((prev) => prev.filter((k) => k.id !== id));
    toast.success("Aturan konversi berhasil dihapus.");
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none font-sans">
      {/* Header & Tabs Fixed at Top */}
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Master Satuan &amp; Aturan Konversi
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Standarisasi satuan warung sembako (eceran &amp; grosiran) dan rumus konversi isi per kemasan besar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (activeTab === "SATUAN" ? openAddSatuan() : openAddKonversi())}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            {activeTab === "SATUAN" ? "Tambah satuan" : "Tambah konversi"}
          </button>
        </div>

        {/* Filter Tab Garis Bawah & Pencarian */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-6 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("SATUAN");
                setCurrentPage(1);
              }}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "SATUAN"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              Satuan baku ({satuanList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("KONVERSI");
                setCurrentPage(1);
              }}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "KONVERSI"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              Aturan konversi ({konversiList.length})
            </button>
          </div>

          <div className="flex items-center gap-3 pb-2.5">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="Cari satuan atau konversi"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-6 h-8 bg-transparent border-b border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Minimalist (Scrollable Internal) */}
      <div className="flex-1 min-h-0 overflow-auto pb-2">
        {activeTab === "SATUAN" ? (
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3 pr-4">Kode</th>
                  <th className="py-3 px-4">Nama satuan</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Tipe</th>
                  <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Tidak ada satuan yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as MasterSatuan[]).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-3.5 pr-4 font-mono font-semibold text-slate-900 dark:text-zinc-100">
                        {s.kode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                        {s.nama}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                        {s.deskripsi}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                        {s.kategori}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.isTimbangan ? (
                          <span className="text-xs font-semibold text-amber-600">Timbangan</span>
                        ) : (
                          <span className="text-xs text-slate-400">Reguler</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setDetailSatuan(s)}
                            className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Lihat detail satuan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditSatuan(s)}
                            className="h-7 px-2.5 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Edit satuan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSatuan(s.id)}
                            className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus satuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3 pr-4">Satuan besar</th>
                  <th className="py-3 px-4">Isi konversi</th>
                  <th className="py-3 px-4">Contoh barang</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 pl-4 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      Tidak ada aturan konversi yang cocok.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as AturanKonversi[]).map((k) => (
                    <tr key={k.id} className="hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition-colors duration-150">
                      <td className="py-3.5 pr-4 font-mono font-semibold text-rose-600">
                        1 {k.satuanBesar}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                        = {k.isi} {k.satuanKecil}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300">
                        {k.contohBarang}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-blue-600">
                        Template otomatis
                      </td>
                      <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setDetailKonversi(k)}
                            className="h-7 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Lihat detail konversi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditKonversi(k)}
                            className="h-7 px-2.5 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Edit konversi"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKonversi(k.id)}
                            className="h-7 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus konversi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
      </div>

      {/* Pagination Fixed at Bottom */}
      {activeItems.length > 0 && (
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={activeItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Slide Drawer Detail Satuan */}
      {detailSatuan && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setDetailSatuan(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">Detail satuan</h3>
              <button
                type="button"
                onClick={() => setDetailSatuan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kode satuan</span>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-zinc-100">{detailSatuan.kode}</p>
              </div>
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-zinc-800">
                <div className="pt-2 flex justify-between gap-4">
                  <span className="text-slate-500">Nama satuan</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">{detailSatuan.nama}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4">
                  <span className="text-slate-500">Kategori</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">{detailSatuan.kategori}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4">
                  <span className="text-slate-500">Tipe</span>
                  <span className={`font-semibold text-right ${detailSatuan.isTimbangan ? "text-amber-600" : "text-slate-900 dark:text-zinc-100"}`}>
                    {detailSatuan.isTimbangan ? "Timbangan" : "Reguler"}
                  </span>
                </div>
                <div className="pt-3 space-y-1">
                  <span className="text-slate-500 block">Deskripsi</span>
                  <p className="font-medium text-slate-800 dark:text-zinc-200 leading-relaxed">{detailSatuan.deskripsi}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setDetailSatuan(null)}
                className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailSatuan;
                  setDetailSatuan(null);
                  openEditSatuan(target);
                }}
                className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold rounded-[14px] text-xs cursor-pointer"
              >
                Edit satuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Drawer Detail Konversi */}
      {detailKonversi && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => setDetailKonversi(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">Detail rumus konversi</h3>
              <button
                type="button"
                onClick={() => setDetailKonversi(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-center space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rumus konversi</span>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-zinc-100">
                  1 {detailKonversi.satuanBesar} = {detailKonversi.isi} {detailKonversi.satuanKecil}
                </p>
              </div>
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-zinc-800">
                <div className="pt-2 flex justify-between gap-4">
                  <span className="text-slate-500">Satuan besar</span>
                  <span className="font-mono font-semibold text-rose-600">{detailKonversi.satuanBesar}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4">
                  <span className="text-slate-500">Isi per kemasan</span>
                  <span className="font-mono font-semibold text-emerald-600">{detailKonversi.isi} {detailKonversi.satuanKecil}</span>
                </div>
                <div className="pt-3 space-y-1">
                  <span className="text-slate-500 block">Contoh barang</span>
                  <p className="font-medium text-slate-800 dark:text-zinc-200 leading-relaxed">{detailKonversi.contohBarang}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setDetailKonversi(null)}
                className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailKonversi;
                  setDetailKonversi(null);
                  openEditKonversi(target);
                }}
                className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold rounded-[14px] text-xs cursor-pointer"
              >
                Edit konversi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Drawer Tambah / Edit Satuan */}
      {isSatuanModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => {
            setIsSatuanModalOpen(false);
            setEditingSatuanId(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                {editingSatuanId ? "Edit satuan" : "Tambah satuan baru"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsSatuanModalOpen(false);
                  setEditingSatuanId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSatuan} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="field-label">Kode satuan</label>
                  <input
                    type="text"
                    required
                    value={kodeSatuan}
                    onChange={(e) => setKodeSatuan(e.target.value)}
                    placeholder="Contoh: ikat, rim"
                    className="ctl"
                  />
                </div>
                <div>
                  <label className="field-label">Nama satuan</label>
                  <input
                    type="text"
                    required
                    value={namaSatuan}
                    onChange={(e) => setNamaSatuan(e.target.value)}
                    placeholder="Contoh: Ikat / Rim"
                    className="ctl"
                  />
                </div>
                <div>
                  <label className="field-label">Kategori</label>
                  <select
                    value={katSatuan}
                    onChange={(e) => setKatSatuan(e.target.value as any)}
                    className="ctl"
                  >
                    <option value="Kecil / Eceran">Kecil / Eceran</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Besar / Grosir">Besar / Grosir</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Deskripsi</label>
                  <textarea
                    rows={2}
                    value={deskripsiSatuan}
                    onChange={(e) => setDeskripsiSatuan(e.target.value)}
                    placeholder="Keterangan pemakaian satuan"
                    className="ctl-ta"
                  />
                </div>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isTimbangan}
                    onChange={(e) => setIsTimbangan(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span>Barang timbangan</span>
                </label>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setIsSatuanModalOpen(false);
                    setEditingSatuanId(null);
                  }}
                  className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold rounded-[14px] text-xs cursor-pointer"
                >
                  {editingSatuanId ? "Simpan perubahan" : "Simpan satuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide Drawer Tambah / Edit Konversi */}
      {isKonversiModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end drawer-backdrop"
          onClick={() => {
            setIsKonversiModalOpen(false);
            setEditingKonversiId(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                {editingKonversiId ? "Edit rumus konversi" : "Tambah rumus konversi"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsKonversiModalOpen(false);
                  setEditingKonversiId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddKonversi} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="field-label">Satuan besar</label>
                    <input
                      type="text"
                      required
                      value={formBesar}
                      onChange={(e) => setFormBesar(e.target.value)}
                      placeholder="dus"
                      className="ctl"
                    />
                  </div>
                  <div>
                    <label className="field-label">Isi</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formIsi}
                      onChange={(e) => setFormIsi(parseInt(e.target.value || "1", 10))}
                      className="ctl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="field-label">Satuan kecil</label>
                    <input
                      type="text"
                      required
                      value={formKecil}
                      onChange={(e) => setFormKecil(e.target.value)}
                      placeholder="pcs"
                      className="ctl"
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">Contoh pemakaian barang</label>
                  <input
                    type="text"
                    value={formContoh}
                    onChange={(e) => setFormContoh(e.target.value)}
                    placeholder="Misal: Sabun Batang 1 dus isi 72"
                    className="ctl"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-2.5 shrink-0 bg-slate-50/50 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setIsKonversiModalOpen(false);
                    setEditingKonversiId(null);
                  }}
                  className="w-1/2 h-11 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-semibold rounded-[14px] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 text-white font-semibold rounded-[14px] text-xs cursor-pointer"
                >
                  {editingKonversiId ? "Simpan perubahan" : "Simpan konversi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
