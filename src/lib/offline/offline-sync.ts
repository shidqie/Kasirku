import {
  idbDeleteQueueItem,
  idbGetAllQueue,
  idbGetCache,
  idbPutQueueItem,
  idbSetCache,
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
  return idbSetCache(url, data);
}

/**
 * Ambil data JSON dari cache IndexedDB untuk request GET saat offline.
 * Jika request `/api/products?...` memiliki query (search/kategoriId/checkPrice)
 * dan belum ada di cache persisnya, lakukan fallback filter dari cache `/api/products`.
 */
export async function resolveOfflineGetJson(parsedUrl: URL): Promise<unknown | null> {
  const apiPathWithQuery = parsedUrl.pathname + parsedUrl.search;
  const exact = await getCachedApiJson(apiPathWithQuery);
  if (exact) {
    return exact.data;
  }

  if (parsedUrl.pathname === "/api/products" && parsedUrl.search) {
    const base = await getCachedApiJson("/api/products");
    const baseProducts = (base?.data as { products?: any[] } | undefined)?.products;
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
    const now = new Date();
    const offlineNumber = `OFF-${now.getHours().toString().padStart(2, "0")}${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;

    const [productsCache, settingsCache, membersCache] = await Promise.all([
      getCachedApiJson("/api/products"),
      getCachedApiJson("/api/settings"),
      parsedBody?.memberId ? getCachedApiJson("/api/members") : Promise.resolve(null),
    ]);

    const cachedProducts: any[] = (productsCache?.data as { products?: any[] } | undefined)?.products || [];
    const cachedSettings: any = (settingsCache?.data as { settings?: any } | undefined)?.settings || {};
    const cachedMembers: any[] = (membersCache?.data as { members?: any[] } | undefined)?.members || [];

    const rawItems: any[] = Array.isArray(parsedBody?.items) ? parsedBody.items : [];
    const enrichedItems = rawItems.map((it) => {
      const qty = Number(it?.qty || 0);
      const product = cachedProducts.find((p) => p?.id === it?.produkId);
      const satuan = product?.satuanProduk?.find((s: any) => s?.id === it?.satuanProdukId) || product?.satuanProduk?.[0];
      const hargaSatuan = Number(it?.hargaSatuan ?? satuan?.hargaJual ?? 0);
      const itemSubtotal = Number(it?.subtotal ?? Math.round(qty * hargaSatuan));
      return {
        ...it,
        qty,
        namaSnapshot: it?.namaSnapshot || product?.nama || "Produk",
        satuanSnapshot: it?.satuanSnapshot || satuan?.namaSatuan || product?.satuanDasar || "pcs",
        hargaSatuan,
        hargaJualSnapshot: Number(it?.hargaJualSnapshot ?? hargaSatuan),
        subtotal: itemSubtotal,
      };
    });

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

    return new Response(
      JSON.stringify({
        message: "Transaksi disimpan offline & akan otomatis terupload saat online",
        isOfflineQueued: true,
        transaksi: {
          id: `offline-${Date.now()}`,
          nomorStruk: offlineNumber,
          subtotal,
          diskon,
          pembulatan,
          total,
          status: "SELESAI",
          dibuatPada: now.toISOString(),
          items: enrichedItems,
          pembayaran: [
            {
              metode,
              jumlah: total,
              uangDiterima,
              kembalian,
            },
          ],
          ...(matchedMember ? { member: { id: matchedMember.id, nama: matchedMember.nama } } : {}),
        },
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
