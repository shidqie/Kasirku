import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createCategory,
  createProduct,
  updateProduct,
  checkPrice,
} from "@/services/product.service";
import { getActivityLogs } from "@/services/activity-log.service";

describe("Tahap 2: Produk, Kategori, Satuan dan Harga Integration Tests", () => {
  let ownerId: string;
  let testCategoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";

    // Buat kategori uji
    const cat = await createCategory("Sembako Uji", ownerId);
    testCategoryId = cat.id;
  });

  afterAll(async () => {
    // Bersihkan
    if (testProductId) {
      await prisma.satuanProduk.deleteMany({ where: { produkId: testProductId } });
      await prisma.produk.deleteMany({ where: { id: testProductId } });
    }
    if (testCategoryId) {
      await prisma.kategori.deleteMany({ where: { id: testCategoryId } });
    }
  });

  it("User Story B1: Owner dapat membuat produk dengan kategori, barcode, dan stok minimum", async () => {
    const product = await createProduct(
      {
        nama: "Beras Pandan Wangi Super",
        kategoriId: testCategoryId,
        barcode: "8991234567890",
        satuanDasar: "kg",
        stokMinimum: 10,
        satuanList: [
          {
            namaSatuan: "kg",
            faktorKeDasar: 1,
            hargaJual: 15000,
            hargaBeli: 13000,
            isDefault: true,
          },
          {
            namaSatuan: "karung 25kg",
            faktorKeDasar: 25,
            hargaJual: 360000,
            hargaBeli: 320000,
            isDefault: false,
          },
        ],
      },
      ownerId
    );

    expect(product).toBeDefined();
    expect(product.nama).toBe("Beras Pandan Wangi Super");
    expect(product.barcode).toBe("8991234567890");
    expect(product.satuanProduk.length).toBe(2);
    testProductId = product.id;
  });

  it("User Story B1: Barcode produk harus unik", async () => {
    await expect(
      createProduct(
        {
          nama: "Beras Lain Duplikat",
          satuanDasar: "kg",
          barcode: "8991234567890", // barcode sama
          stokMinimum: 5,
          satuanList: [
            { namaSatuan: "kg", faktorKeDasar: 1, hargaJual: 14000, hargaBeli: 12000 },
          ],
        },
        ownerId
      )
    ).rejects.toThrow("sudah digunakan");
  });

  it("User Story B2: Multi-satuan tersimpan dengan faktor konversi dan harga masing-masing", async () => {
    const p = await prisma.produk.findUnique({
      where: { id: testProductId },
      include: { satuanProduk: true },
    });

    const karung = p?.satuanProduk.find((s) => s.namaSatuan === "karung 25kg");
    expect(karung).toBeDefined();
    expect(Number(karung?.faktorKeDasar)).toBe(25);
    expect(karung?.hargaJual).toBe(360000);
  });

  it("User Story B3: Staff dapat mengecek harga via checkPrice() tanpa bertanya", async () => {
    // Cari dengan nama
    const searchByName = await checkPrice("Pandan Wangi");
    expect(searchByName.length).toBeGreaterThanOrEqual(1);
    expect(searchByName[0].nama).toBe("Beras Pandan Wangi Super");
    expect(searchByName[0].satuanList.length).toBe(2);

    // Cari dengan barcode
    const searchByBarcode = await checkPrice("8991234567890");
    expect(searchByBarcode.length).toBe(1);
    expect(searchByBarcode[0].barcode).toBe("8991234567890");
  });

  it("User Story B5: Riwayat perubahan harga tercatat di activity log", async () => {
    await updateProduct(
      testProductId,
      {
        satuanList: [
          {
            namaSatuan: "kg",
            faktorKeDasar: 1,
            hargaJual: 16000, // Harga naik dari 15000 ke 16000
            hargaBeli: 13500,
            isDefault: true,
          },
        ],
      },
      ownerId
    );

    const { items } = await getActivityLogs({
      entitas: "Produk",
      aksi: "UBAH_PRODUK",
    });

    const log = items.find((i) => i.entitasId === testProductId);
    expect(log).toBeDefined();
    expect(log?.sebelumJson).toBeDefined();
    expect(log?.sesudahJson).toBeDefined();
  });
});

