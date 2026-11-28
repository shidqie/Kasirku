"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Store, Users, Activity, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { getRoleLabel } from "@/lib/auth/permissions";
import { PopupAlert } from "@/components/shared/ToastProvider";
import { Dropdown } from "@/components/shared/Dropdown";
import { TableSkeletonRows } from "@/components/shared/Skeleton";
import { DataTable, DataTableContainer, DataTableHeader, DataTableHead, DataTableBody, DataTableRow } from "@/components/shared/DataTable";

export default function SuperAdminPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [invalidBarcodes, setInvalidBarcodes] = useState<any[]>([]);
  const [fixValues, setFixValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"stores" | "users" | "audit" | "barcodes">("stores");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, bcRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/admin/invalid-barcodes"),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data platform");
      setStores(data.stores || []);
      setUsers(data.users || []);
      setLogs(data.logs || []);
      if (bcRes.ok) {
        const bcData = await bcRes.json();
        setInvalidBarcodes(bcData.items || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleUpdateStoreStatus = async (
    storeId: string,
    statusLayanan: string,
    paketLangganan: string
  ) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/admin/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, statusLayanan, paketLangganan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui layanan toko");
      setSuccess("Status layanan & langganan toko berhasil diperbarui.");
      fetchOverview();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none">
      <div className="shrink-0">
        <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Super Admin Platform Console
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Pengelolaan akun toko, pengguna platform, status layanan, langganan, dan audit aktivitas global.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            title="Muat ulang"
            className="h-8 w-8 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <PopupAlert type="error" message={error} onClear={() => setError(null)} />
        <PopupAlert type="success" message={success} onClear={() => setSuccess(null)} />

        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-zinc-800 text-xs pt-2">
          <button
            onClick={() => setActiveTab("stores")}
            className={`pb-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "stores"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Akun Toko &amp; Langganan ({stores.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "users"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pengguna Platform ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "audit"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Aktivitas Platform</span>
          </button>
          <button
            onClick={() => setActiveTab("barcodes")}
            className={`pb-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "barcodes"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Barcode bermasalah ({invalidBarcodes.length})</span>
          </button>
        </div>
      </div>

      <DataTableContainer className="pt-4">
        {activeTab === "stores" && (
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>ID Toko</DataTableHead>
                <DataTableHead>Nama Toko</DataTableHead>
                <DataTableHead>Paket Langganan</DataTableHead>
                <DataTableHead>Status Layanan</DataTableHead>
                <DataTableHead align="right">Aksi</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {loading ? (
                <TableSkeletonRows rows={3} cols={5} />
              ) : (
                stores.map((s) => (
                  <DataTableRow key={s.id}>
                    <td className="py-3.5 pr-4 font-mono text-[11px]">{s.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      {s.namaToko}
                    </td>
                    <td className="py-3.5 px-4">
                      <Dropdown
                        variant="underline"
                        searchable={false}
                        ariaLabel="Pilih paket langganan"
                        value={s.paketLangganan || "PRO"}
                        onChange={(val) =>
                          handleUpdateStoreStatus(s.id, s.statusLayanan || "AKTIF", val)
                        }
                        options={[
                          { value: "BASIC", label: "BASIC" },
                          { value: "PRO", label: "PRO" },
                          { value: "ENTERPRISE", label: "ENTERPRISE" },
                        ]}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <Dropdown
                        variant="underline"
                        searchable={false}
                        ariaLabel="Pilih status layanan"
                        value={s.statusLayanan || "AKTIF"}
                        onChange={(val) =>
                          handleUpdateStoreStatus(s.id, val, s.paketLangganan || "PRO")
                        }
                        options={[
                          { value: "AKTIF", label: "AKTIF" },
                          { value: "TRIAL", label: "TRIAL" },
                          { value: "SUSPEND", label: "SUSPEND" },
                        ]}
                      />
                    </td>
                    <td className="py-3.5 pl-4 text-right text-[11px] text-slate-400">
                      Diperbarui {formatDateTime(s.updatedAt)}
                    </td>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}

        {activeTab === "users" && (
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>Nama</DataTableHead>
                <DataTableHead>Username</DataTableHead>
                <DataTableHead>Role</DataTableHead>
                <DataTableHead>Toko ID</DataTableHead>
                <DataTableHead>Status</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {users.map((u) => (
                <DataTableRow key={u.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-zinc-100">{u.nama}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">@{u.username}</td>
                  <td className="py-3 px-4 font-medium">{getRoleLabel(u.role)}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">{u.tokoId}</td>
                  <td className="py-3 pl-4">
                    <span className={u.aktif ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                      {u.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}

        {activeTab === "audit" && (
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>Waktu</DataTableHead>
                <DataTableHead>Pengguna</DataTableHead>
                <DataTableHead>Aksi</DataTableHead>
                <DataTableHead>Entitas</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {logs.map((l) => (
                <DataTableRow key={l.id}>
                  <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDateTime(l.dibuatPada)}</td>
                  <td className="py-3 px-4 font-medium">{l.user?.nama || "Sistem"}</td>
                  <td className="py-3 px-4 font-semibold">{l.aksi}</td>
                  <td className="py-3 pl-4">{l.entitas}</td>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}

        {activeTab === "barcodes" && (
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>Produk</DataTableHead>
                <DataTableHead>Barcode Lama</DataTableHead>
                <DataTableHead>Masalah</DataTableHead>
                <DataTableHead>Perbaikan (8–14 digit)</DataTableHead>
                <DataTableHead align="right">Aksi</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {invalidBarcodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Semua barcode produk sudah sesuai pola angka 8–14 digit.
                  </td>
                </tr>
              ) : (
                invalidBarcodes.map((item) => (
                  <DataTableRow key={item.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-zinc-100">
                      {item.nama}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-rose-600 max-w-[200px] truncate">
                      {item.barcode}
                    </td>
                    <td className="py-3 px-4 text-amber-600 font-medium">{item.alasan}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Masukkan 8–14 digit"
                        value={fixValues[item.id] ?? ""}
                        onChange={(e) =>
                          setFixValues((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs w-44"
                      />
                    </td>
                    <td className="py-3 pl-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const r = await fetch("/api/admin/invalid-barcodes", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                productId: item.id,
                                newBarcode: fixValues[item.id] || "",
                              }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.error || "Gagal memperbaiki");
                            setSuccess(d.message);
                            fetchOverview();
                          } catch (e: any) {
                            setError(e.message);
                          }
                        }}
                        className="h-7 px-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs cursor-pointer"
                      >
                        Perbaiki
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const r = await fetch("/api/admin/invalid-barcodes", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ productId: item.id, action: "clear" }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.error || "Gagal menghapus");
                            setSuccess(d.message);
                            fetchOverview();
                          } catch (e: any) {
                            setError(e.message);
                          }
                        }}
                        className="h-7 px-2.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </td>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableContainer>
    </div>
  );
}
