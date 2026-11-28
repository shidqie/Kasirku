import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { detectBrandFromName, resolveProductBrand } from "@/lib/brand-detector";
import {
  createProduct,
  duplicateProduct,
  getProducts,
  updateProduct,
} from "@/services/product.service";

describe("Fitur Kolom Merek Otomatis & Penyelarasan Katalog", () => {
  const suffix = Date.now().toString(36);
  let ownerId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!owner) throw new Error("Akun OWNER seed tidak ditemukan");
    ownerId = owner.id;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.riwayatHarga.deleteMany({ where: { produkId: { in: createdIds } } });
      await prisma.productBarcode.deleteMany({ where: { productId: { in: createdIds } } });
      await prisma.satuanProduk.deleteMany({ where: { produkId: { in: createdIds } } });
      await prisma.produk.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  it("1. Deteksi otomatis merek akurat untuk produk bermerek dan null untuk barang curah/generik", () => {
    expect(detectBrandFromName("Indomie Goreng Spesial")).toBe("Indomie");
    expect(detectBrandFromName("Kecap Bango 520ml")).toBe("Bango");
    expect(detectBrandFromName("Tepung Segitiga Biru 1kg")).toBe("Segitiga Biru");
    expect(detectBrandFromName("Sabun Cair Lifebuoy Merah")).toBe("Lifebuoy");
    expect(detectBrandFromName("76 Apple Royal")).toBe("Djarum 76");
    expect(detectBrandFromName("Surya 16")).toBe("Surya");
    expect(detectBrandFromName("Nipis Madu 330ml")).toBe("Nipis Madu");
    expect(detectBrandFromName("White Koffie (Luak)")).toBe("Luwak White Koffie");
    expect(detectBrandFromName("Pasta Gigi Pepsodent 190g")).toBe("Pepsodent");

    // Tidak salah deteksi pada kata generik atau curah
    expect(detectBrandFromName("Jarum Pentul")).toBeNull();
    expect(detectBrandFromName("Telor")).toBeNull();
    expect(detectBrandFromName("Beras")).toBeNull();
    expect(detectBrandFromName("Minyak (curah)")).toBeNull();
    expect(detectBrandFromName("Gelas Cup Pop Ice")).toBeNull();
    expect(detectBrandFromName("Minyak Kayu Putih 30ml")).toBeNull();

    // Hormati input manual atau pengosongan eksplisit
    expect(resolveProductBrand({ merek: "Merek Custom", nama: "Indomie Goreng" })).toBe("Merek Custom");
    expect(resolveProductBrand({ merek: "", nama: "Indomie Goreng" })).toBeNull();
    expect(resolveProductBrand({ merek: undefined, nama: "Indomie Goreng" })).toBe("Indomie");
  });

  it("2. createProduct otomatis mengisi merek, update/duplicate menjaga merek, dan pencarian mendukung merek", async () => {
    const p1 = await createProduct(
      {
        nama: `Indomie Soto Mie Uji ${suffix}`,
        satuanDasar: "pcs",
        stokMinimum: 5,
        satuanList: [
          { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 3500, hargaBeli: 2800, isDefault: true },
        ],
      },
      ownerId
    );
    createdIds.push(p1.id);
    expect(p1.merek).toBe("Indomie");

    // Pencarian berdasarkan nama merek
    const searchRes = await getProducts({ search: "Indomie" });
    expect(searchRes.some((item) => item.id === p1.id && item.merek === "Indomie")).toBe(true);

    // Duplikat mempertahankan merek sumber
    const dup = await duplicateProduct(p1.id, ownerId, undefined, "OWNER");
    createdIds.push(dup.id);
    expect(dup.merek).toBe("Indomie");

    // Update manual merek ke nilai khusus lalu kosongkan eksplisit ke null
    const updatedCustom = await updateProduct(
      p1.id,
      { merek: "Indofood Indomie" },
      ownerId,
      undefined,
      { allowEditHargaBeli: false, userRole: "OWNER" }
    );
    expect(updatedCustom?.merek).toBe("Indofood Indomie");

    const cleared = await updateProduct(
      p1.id,
      { merek: null },
      ownerId,
      undefined,
      { allowEditHargaBeli: false, userRole: "OWNER" }
    );
    expect(cleared?.merek).toBeNull();
  }, 20000);

  it("3. Produk eksisting di database Toko Gagan telah terisi kolom merek secara menyeluruh", async () => {
    const countWithBrand = await prisma.produk.count({
      where: { aktif: true, merek: { not: null } },
    });
    expect(countWithBrand).toBeGreaterThanOrEqual(400);

    const jarumPentul = await prisma.produk.findFirst({
      where: { nama: "Jarum Pentul", aktif: true },
      select: { merek: true },
    });
    if (jarumPentul) {
      expect(jarumPentul.merek).toBeNull();
    }
  });
});
