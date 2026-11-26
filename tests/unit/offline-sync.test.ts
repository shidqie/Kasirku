import { describe, it, expect, vi, beforeEach } from "vitest";
import * as offlineDb from "@/lib/offline/offline-db";
import { resolveOfflineGetJson } from "@/lib/offline/offline-sync";

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
    expect(res).toEqual({ products: sampleProducts });
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
});
