import {
  idbDeleteQueueItem,
  idbGetAllQueue,
  idbGetCache,
  idbPutQueueItem,
  idbSetCache,
  normalizeProductsCachePayload,
  type OfflineSyncItem,
} from "./offline-db";

export const OFFLINE_QUEUE_EVENT = "kasirku-offline-queue-changed";

export function notifyOfflineQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

export function describeMutation(url: string, method: string): string {
  if (url.startsWith("/api/transactions") && method === "POST") {
    return url.includes("/void") ? "Batalkan Transaksi" : "Transaksi Kasir";
  }
  if (url.startsWith("/api/members") && url.includes("/payments")) {
    return "Pembayaran Piutang";
  }
  if (url.startsWith("/api/members")) {
    return method === "POST" ? "Tambah Pelanggan / Bon" : "Update Pelanggan";
  }
  if (url.startsWith("/api/stock/receipts")) {
    return "Barang Masuk";
  }
  if (url.startsWith("/api/opname")) {
    return "Stok Opname";
  }
  if (url.startsWith("/api/products/bulk-price")) {
    return "Harga Naik Massal";
  }
  if (url.startsWith("/api/products/") && url.includes("/barcode")) {
    return "Hubungkan Barcode";
  }
  if (url.startsWith("/api/products")) {
    return method === "POST" ? "Tambah Produk" : method === "DELETE" ? "Hapus Produk" : "Update Produk";
  }
  if (url.startsWith("/api/categories")) {
    return "Kelola Kategori";
  }
  if (url.startsWith("/api/settings")) {
    return "Pengaturan Toko";
  }
  return `${method} ${url}`;
}

export async function getCachedApiJson(url: string) {
  return idbGetCache(url);
}

export async function cacheApiJson(url: string, data: unknown) {
  const normalized = url.startsWith("/api/products")
    ? normalizeProductsCachePayload(data)
    : data;
  return idbSetCache(url, normalized);
}

export interface OfflineTransactionItemSnapshot {
  produkId: string;
  satuanProdukId: string;
  nama: string;
  harga: number;
  qty: number;
  subtotal: number;
  namaSnapshot: string;
  satuanSnapshot: string;
  hargaSatuan: number;
  hargaJualSnapshot: number;
}

export function buildOfflineItemSnapshot(
  it: any,
  cachedProducts: any[] = []
): OfflineTransactionItemSnapshot {
  const qty = Number(it?.qty ?? 0);
  const product = cachedProducts.find((p) => p?.id === it?.produkId);
  const satuan =
    product?.satuanProduk?.find((s: any) => s?.id === it?.satuanProdukId) ||
    product?.satuanProduk?.[0];
  const harga = Number(it?.harga ?? it?.hargaJualSnapshot ?? it?.hargaSatuan ?? satuan?.hargaJual ?? 0);
  const safeHarga = Number.isFinite(harga) ? Math.round(harga) : 0;
  const safeQty = Number.isFinite(qty) ? qty : 0;
  const subtotal = Number(it?.subtotal ?? Math.round(safeQty * safeHarga));
  const nama = String(it?.nama || it?.namaSnapshot || product?.nama || "Produk");
  const satuanNama = String(it?.satuanSnapshot || satuan?.namaSatuan || product?.satuanDasar || "pcs");

  return {
    produkId: String(it?.produkId || ""),
    satuanProdukId: String(it?.satuanProdukId || ""),
    nama,
    harga: safeHarga,
    qty: safeQty,
    subtotal: Number.isFinite(subtotal) ? Math.round(subtotal) : 0,
    namaSnapshot: nama,
    satuanSnapshot: satuanNama,
    hargaSatuan: safeHarga,
    hargaJualSnapshot: safeHarga,
  };
}

async function buildOfflineTransactionRecord(
  parsedBody: any,
  createdAtMs: number,
  queueId?: string
) {
  const [productsCache, settingsCache, membersCache] = await Promise.all([
    getCachedApiJson("/api/products"),
    getCachedApiJson("/api/settings"),
    parsedBody?.memberId ? getCachedApiJson("/api/members") : Promise.resolve(null),
  ]);

  const normalizedProductsData = normalizeProductsCachePayload(productsCache?.data) as
    | { products?: any[] }
    | undefined;
  const cachedProducts: any[] = normalizedProductsData?.products || [];
  const cachedSettings: any = (settingsCache?.data as { settings?: any } | undefined)?.settings || {};
  const cachedMembers: any[] = (membersCache?.data as { members?: any[] } | undefined)?.members || [];

  const rawItems: any[] = Array.isArray(parsedBody?.items) ? parsedBody.items : [];
  const enrichedItems = rawItems.map((it) => buildOfflineItemSnapshot(it, cachedProducts));

  const computedSubtotal = enrichedItems.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  const subtotal = Number(parsedBody?.subtotal ?? computedSubtotal);
  const diskon = Number(parsedBody?.diskon || 0);
  const setelahDiskon = Math.max(0, subtotal - diskon);
  const pembulatan =
    parsedBody?.pembulatan !== undefined
      ? Number(parsedBody.pembulatan)
      : computeOfflineRounding(setelahDiskon, cachedSettings?.pembulatan);
  const total = Number(parsedBody?.total ?? Math.max(0, setelahDiskon + pembulatan));

  const metode = parsedBody?.pembayaran?.metode || parsedBody?.metodePembayaran || "TUNAI";
  const uangDiterima = Number(parsedBody?.pembayaran?.uangDiterima ?? parsedBody?.uangDiterima ?? total);
  const kembalian =
    parsedBody?.pembayaran?.kembalian !== undefined
      ? Number(parsedBody.pembayaran.kembalian)
      : metode === "TUNAI"
      ? Math.max(0, uangDiterima - total)
      : 0;

  const matchedMember = parsedBody?.memberId
    ? cachedMembers.find((m) => m?.id === parsedBody.memberId)
    : null;

  const dt = new Date(createdAtMs);
  const offlineNumber = `OFF-${dt.getHours().toString().padStart(2, "0")}${dt
    .getMinutes()
    .toString()
    .padStart(2, "0")}${dt.getSeconds().toString().padStart(2, "0")}`;

  return {
    id: queueId || `offline-${createdAtMs}`,
    nomorStruk: offlineNumber,
    subtotal,
    diskon,
    pembulatan,
    total,
    status: "SELESAI" as const,
    alasanBatal: null,
    dibuatPada: dt.toISOString(),
    dibatalkanPada: null,
    kasir: { nama: "Kasir (Offline)", username: "offline" },
    dibatalkanOleh: null,
    member: matchedMember
      ? { id: matchedMember.id, nama: matchedMember.nama, telepon: matchedMember.telepon || null }
      : null,
    items: enrichedItems,
    pembayaran: [
      {
        metode,
        jumlah: total,
        uangDiterima,
        kembalian,
      },
    ],
    isOfflineQueued: true,
  };
}

/**
 * Ambil data JSON dari cache IndexedDB untuk request GET saat offline.
 * Jika request `/api/products?...` memiliki query (search/kategoriId/checkPrice)
 * dan belum ada di cache persisnya, lakukan fallback filter dari cache `/api/products`.
 */
export async function resolveOfflineGetJson(parsedUrl: URL): Promise<unknown | null> {
  const apiPathWithQuery = parsedUrl.pathname + parsedUrl.search;
  const exact = await getCachedApiJson(apiPathWithQuery);

  if (parsedUrl.pathname === "/api/transactions") {
    const baseCache = exact || (await getCachedApiJson("/api/transactions"));
    const cachedTransactions: any[] =
      (baseCache?.data as { transactions?: any[] } | undefined)?.transactions || [];
    const queue = await idbGetAllQueue();
    const pendingTrxItems = queue.filter(
      (q) => q.url === "/api/transactions" && q.method === "POST"
    );

    const offlineTransactions = await Promise.all(
      pendingTrxItems.map(async (q) => {
        let parsedBody: any = {};
        try {
          if (q.body) parsedBody = JSON.parse(q.body);
        } catch {}
        return buildOfflineTransactionRecord(parsedBody, q.createdAt, q.id);
      })
    );

    const search = (parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = parsedUrl.searchParams.get("status") || "";

    const merged = [...offlineTransactions.reverse(), ...cachedTransactions].filter((t) => {
      if (statusFilter && t?.status !== statusFilter) return false;
      if (search) {
        const struk = String(t?.nomorStruk || "").toLowerCase();
        const memberNama = String(t?.member?.nama || "").toLowerCase();
        const kasirNama = String(t?.kasir?.nama || "").toLowerCase();
        if (!struk.includes(search) && !memberNama.includes(search) && !kasirNama.includes(search)) {
          return false;
        }
      }
      return true;
    });

    if (exact || baseCache || offlineTransactions.length > 0) {
      return { transactions: merged };
    }
    return null;
  }

  if (exact) {
    return parsedUrl.pathname === "/api/products"
      ? normalizeProductsCachePayload(exact.data)
      : exact.data;
  }

  if (parsedUrl.pathname === "/api/products" && parsedUrl.search) {
    const base = await getCachedApiJson("/api/products");
    const normalizedBase = normalizeProductsCachePayload(base?.data) as
      | { products?: any[] }
      | undefined;
    const baseProducts = normalizedBase?.products;
    if (Array.isArray(baseProducts)) {
      const search = (parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
      const kategoriId = parsedUrl.searchParams.get("kategoriId") || "";
      const isCheckPrice = parsedUrl.searchParams.get("checkPrice") === "true";

      const filtered = baseProducts.filter((p) => {
        if (kategoriId && p?.kategori?.id !== kategoriId && p?.kategoriId !== kategoriId) {
          return false;
        }
        if (search) {
          const nama = String(p?.nama || "").toLowerCase();
          const barcode = String(p?.barcode || "").toLowerCase();
          const kodeBarang = String(p?.kodeBarang || "").toLowerCase();
          const idBarang = String(p?.idBarang || "").toLowerCase();
          const matched =
            nama.includes(search) ||
            barcode.includes(search) ||
            kodeBarang.includes(search) ||
            idBarang.includes(search);
          if (!matched) return false;
        }
        return true;
      });

      return isCheckPrice ? { results: filtered } : { products: filtered };
    }
  }

  return null;
}

export async function getPendingSyncItems(): Promise<OfflineSyncItem[]> {
  return idbGetAllQueue();
}

export async function enqueueOfflineMutation(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body: string | null
): Promise<OfflineSyncItem> {
  // Cegah duplikasi antrean transaksi dengan idempotencyKey yang sama
  if (url === "/api/transactions" && method === "POST" && body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed?.idempotencyKey) {
        const existingQueue = await idbGetAllQueue();
        const duplicate = existingQueue.find((q) => {
          if (q.url !== "/api/transactions" || q.method !== "POST" || !q.body) return false;
          try {
            return JSON.parse(q.body)?.idempotencyKey === parsed.idempotencyKey;
          } catch {
            return false;
          }
        });
        if (duplicate) return duplicate;
      }
    } catch {}
  }

  const item: OfflineSyncItem = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url,
    method,
    body,
    label: describeMutation(url, method),
    createdAt: Date.now(),
    status: "PENDING",
  };
  await idbPutQueueItem(item);
  notifyOfflineQueueChanged();
  return item;
}

export async function removeOfflineQueueItem(id: string): Promise<void> {
  await idbDeleteQueueItem(id);
  notifyOfflineQueueChanged();
}

function computeOfflineRounding(val: number, aturan?: string): number {
  if (aturan === "BULAT_100") {
    const sisa = val % 100;
    return sisa === 0 ? 0 : sisa >= 50 ? 100 - sisa : -sisa;
  }
  if (aturan === "BULAT_500") {
    const sisa = val % 500;
    return sisa === 0 ? 0 : sisa >= 250 ? 500 - sisa : -sisa;
  }
  return 0;
}

/**
 * Bangun respons sintetis saat offline agar alur UI (termasuk cetak struk kasir) tetap berjalan mulus.
 */
export async function buildOfflineSyntheticResponse(
  url: string,
  method: string,
  bodyStr: string | null
): Promise<Response> {
  let parsedBody: any = {};
  try {
    if (bodyStr) parsedBody = JSON.parse(bodyStr);
  } catch {}

  if (url === "/api/transactions" && method === "POST") {
    const transaksi = await buildOfflineTransactionRecord(parsedBody, Date.now());
    return new Response(
      JSON.stringify({
        message: "Transaksi disimpan offline & akan otomatis terupload saat online",
        isOfflineQueued: true,
        transaksi,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", "X-Offline-Queued": "true" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      message: "Data disimpan di perangkat (Mode Offline) dan akan otomatis diupload saat online.",
      isOfflineQueued: true,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Offline-Queued": "true" },
    }
  );
}

/**
 * Sinkronkan seluruh antrean offline ke server secara berurutan (FIFO) menggunakan nativeFetch.
 */
export async function syncPendingQueue(
  nativeFetch: typeof window.fetch
): Promise<{ synced: number; failed: number }> {
  const queue = await idbGetAllQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    await idbPutQueueItem({ ...item, status: "SYNCING", errorMessage: undefined });
    notifyOfflineQueueChanged();

    try {
      const res = await nativeFetch(item.url, {
        method: item.method,
        headers: item.body ? { "Content-Type": "application/json" } : undefined,
        body: item.body,
      });

      if (res.ok || res.status === 409) {
        await idbDeleteQueueItem(item.id);
        synced += 1;
      } else {
        const errData = await res.json().catch(() => ({}));
        await idbPutQueueItem({
          ...item,
          status: "FAILED",
          errorMessage: errData?.error || `HTTP ${res.status}`,
        });
        failed += 1;
      }
    } catch {
      await idbPutQueueItem({
        ...item,
        status: "PENDING",
      });
      failed += 1;
      break;
    }

    notifyOfflineQueueChanged();
  }

  return { synced, failed };
}
