import { describe, it, expect, vi, beforeEach } from "vitest";
import * as offlineDb from "@/lib/offline/offline-db";
import {
  buildOfflineItemSnapshot,
  buildOfflineSyntheticResponse,
  enqueueOfflineMutation,
  resolveOfflineGetJson,
  syncPendingQueue,
} from "@/lib/offline/offline-sync";

describe("resolveOfflineGetJson", () => {
  const sampleProducts = [
    {
      id: "p1",
      nama: "Beras Premium 5kg",
      barcode: "8991234567890",
      kodeBarang: "BRS-01",
      idBarang: "BRG001",
      kategori: { id: "kat-sembako", nama: "Sembako" },
      satuanProduk: [{ id: "s1", namaSatuan: "karung", hargaJual: 72000, isDefault: true }],
    },
    {
      id: "p2",
      nama: "Gula Pasir 1kg",
      barcode: "8990001112223",
      kodeBarang: "GLA-01",
      idBarang: "BRG002",
      kategori: { id: "kat-sembako", nama: "Sembako" },
      satuanProduk: [{ id: "s2", namaSatuan: "kg", hargaJual: 17500, isDefault: true }],
    },
    {
      id: "p3",
      nama: "Sabun Mandi",
      barcode: "8995556667778",
      kodeBarang: "SBN-01",
      idBarang: "BRG003",
      kategori: { id: "kat-mandi", nama: "Kebutuhan Mandi" },
      satuanProduk: [{ id: "s3", namaSatuan: "pcs", hargaJual: 5000, isDefault: true }],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("mengembalikan cache persis jika URL sudah tersimpan", async () => {
    vi.spyOn(offlineDb, "idbGetCache").mockResolvedValueOnce({
      url: "/api/products",
      data: { products: sampleProducts },
      updatedAt: Date.now(),
    });

    const res = await resolveOfflineGetJson(new URL("http://localhost:3000/api/products"));
    expect(res).toEqual(offlineDb.normalizeProductsCachePayload({ products: sampleProducts }));
  });

  it("melakukan fallback filter ke cache /api/products saat search dan kategoriId dipakai offline", async () => {
    vi.spyOn(offlineDb, "idbGetCache").mockImplementation(async (url) => {
      if (url === "/api/products") {
        return {
          url: "/api/products",
          data: { products: sampleProducts },
          updatedAt: Date.now(),
        };
      }
      return null;
    });

    const bySearch = (await resolveOfflineGetJson(
      new URL("http://localhost:3000/api/products?search=gula")
    )) as { products: typeof sampleProducts };
    expect(bySearch.products).toHaveLength(1);
    expect(bySearch.products[0].nama).toBe("Gula Pasir 1kg");
    expect(bySearch.products[0].satuanProduk[0].hargaJual).toBe(17500);

    const byKategori = (await resolveOfflineGetJson(
      new URL("http://localhost:3000/api/products?kategoriId=kat-mandi")
    )) as { products: typeof sampleProducts };
    expect(byKategori.products).toHaveLength(1);
    expect(byKategori.products[0].nama).toBe("Sabun Mandi");
  });

  it("mengembalikan format results saat checkPrice=true offline", async () => {
    vi.spyOn(offlineDb, "idbGetCache").mockImplementation(async (url) => {
      if (url === "/api/products") {
        return {
          url: "/api/products",
          data: { products: sampleProducts },
          updatedAt: Date.now(),
        };
      }
      return null;
    });

    const res = (await resolveOfflineGetJson(
      new URL("http://localhost:3000/api/products?checkPrice=true&search=8991234567890")
    )) as { results: typeof sampleProducts };
    expect(res.results).toHaveLength(1);
    expect(res.results[0].satuanProduk[0].hargaJual).toBe(72000);
  });

  it("buildOfflineSyntheticResponse mengisi harga, subtotal, total, dan pembayaran struk saat checkout offline", async () => {
    vi.spyOn(offlineDb, "idbGetCache").mockImplementation(async (url) => {
      if (url === "/api/products") {
        return { url, data: { products: sampleProducts }, updatedAt: Date.now() };
      }
      if (url === "/api/settings") {
        return { url, data: { settings: { pembulatan: "BULAT_0" } }, updatedAt: Date.now() };
      }
      return null;
    });

    const res = await buildOfflineSyntheticResponse(
      "/api/transactions",
      "POST",
      JSON.stringify({
        items: [{ produkId: "p2", satuanProdukId: "s2", qty: 2 }],
        diskon: 0,
        metodePembayaran: "TUNAI",
        uangDiterima: 50000,
      })
    );
    const json = await res.json();
    expect(json.transaksi.subtotal).toBe(35000);
    expect(json.transaksi.total).toBe(35000);
    expect(json.transaksi.items[0]).toMatchObject({
      namaSnapshot: "Gula Pasir 1kg",
      satuanSnapshot: "kg",
      hargaSatuan: 17500,
      subtotal: 35000,
    });
    expect(json.transaksi.pembayaran[0]).toMatchObject({
      metode: "TUNAI",
      uangDiterima: 50000,
      kembalian: 15000,
    });
  });

  it("normalizeProductsCachePayload mengonversi Prisma Decimal/string harga & stok menjadi Number", () => {
    const raw = {
      products: [
        {
          id: "p1",
          nama: "Telur Ayam",
          stokCache: "12.500",
          stokMinimum: "5.000",
          satuanProduk: [
            { id: "s1", namaSatuan: "kg", faktorKeDasar: "1.000", hargaJual: "28000", hargaBeli: "25000" },
          ],
        },
      ],
    };
    const normalized = offlineDb.normalizeProductsCachePayload(raw) as any;
    expect(typeof normalized.products[0].stokCache).toBe("number");
    expect(normalized.products[0].stokCache).toBe(12.5);
    expect(typeof normalized.products[0].satuanProduk[0].hargaJual).toBe("number");
    expect(normalized.products[0].satuanProduk[0].hargaJual).toBe(28000);
    expect(normalized.products[0].satuanProduk[0].hargaBeli).toBe(25000);
  });

  it("buildOfflineItemSnapshot membuat snapshot item lengkap { produkId, nama, harga, qty, subtotal }", () => {
    const snap = buildOfflineItemSnapshot(
      { produkId: "p2", satuanProdukId: "s2", qty: 3 },
      sampleProducts
    );
    expect(snap).toMatchObject({
      produkId: "p2",
      satuanProdukId: "s2",
      nama: "Gula Pasir 1kg",
      harga: 17500,
      qty: 3,
      subtotal: 52500,
      hargaJualSnapshot: 17500,
    });
  });

  it("enqueueOfflineMutation & syncPendingQueue bersifat idempoten terhadap idempotencyKey yang sama", async () => {
    const queueStore: offlineDb.OfflineSyncItem[] = [];
    vi.spyOn(offlineDb, "idbGetAllQueue").mockImplementation(async () => [...queueStore]);
    vi.spyOn(offlineDb, "idbPutQueueItem").mockImplementation(async (item) => {
      const idx = queueStore.findIndex((q) => q.id === item.id);
      if (idx >= 0) queueStore[idx] = item;
      else queueStore.push(item);
    });
    vi.spyOn(offlineDb, "idbDeleteQueueItem").mockImplementation(async (id) => {
      const idx = queueStore.findIndex((q) => q.id === id);
      if (idx >= 0) queueStore.splice(idx, 1);
    });

    const body = JSON.stringify({
      idempotencyKey: "uuid-idem-123",
      items: [{ produkId: "p2", satuanProdukId: "s2", nama: "Gula Pasir 1kg", harga: 17500, qty: 1, subtotal: 17500 }],
    });

    const first = await enqueueOfflineMutation("/api/transactions", "POST", body);
    const second = await enqueueOfflineMutation("/api/transactions", "POST", body);
    expect(second.id).toBe(first.id);
    expect(queueStore).toHaveLength(1);

    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const result = await syncPendingQueue(mockFetch as any);
    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(queueStore).toHaveLength(0);
  });
});
