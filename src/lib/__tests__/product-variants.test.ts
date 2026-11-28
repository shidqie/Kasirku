import { describe, expect, it } from "vitest";
import {
  buildVariantFullName,
  formatPriceRange,
  groupProductsForDisplay,
  GroupableProduct,
} from "../product-grouping";
import {
  createProductGroupSchema,
  splitProductSchema,
} from "../validations/product-group.schema";

describe("Product Grouping Helpers", () => {
  it("builds full variant name without duplicating group prefix", () => {
    expect(buildVariantFullName("Cimory Fresh Milk", "Cokelat")).toBe(
      "Cimory Fresh Milk Cokelat"
    );
    expect(
      buildVariantFullName("Cimory Fresh Milk", "Cimory Fresh Milk Matcha")
    ).toBe("Cimory Fresh Milk Matcha");
  });

  it("formats single price and price range properly", () => {
    expect(formatPriceRange(7000, 7000)).toBe("Rp 7.000");
    expect(formatPriceRange(5000, 8000)).toBe("Rp 5.000 – Rp 8.000");
  });

  it("groups products by groupId and keeps standalone products backward-compatible", () => {
    const sample: GroupableProduct[] = [
      {
        id: "p1",
        nama: "Cimory Fresh Milk Cokelat",
        groupId: "g1",
        variantName: "Cokelat",
        group: { id: "g1", nama: "Cimory Fresh Milk", brand: "Cimory" },
        stokCache: 10,
        stokMinimum: 5,
        satuanProduk: [{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 7000, hargaBeli: 5500 }],
      },
      {
        id: "p2",
        nama: "Cimory Fresh Milk Matcha",
        groupId: "g1",
        variantName: "Matcha",
        group: { id: "g1", nama: "Cimory Fresh Milk", brand: "Cimory" },
        stokCache: 3,
        stokMinimum: 5,
        satuanProduk: [{ namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 8000, hargaBeli: 6000 }],
      },
      {
        id: "p3",
        nama: "Aqua 600ml",
        groupId: null,
        variantName: null,
        group: null,
        stokCache: 24,
        stokMinimum: 5,
        satuanProduk: [{ namaSatuan: "botol", faktorKeDasar: 1, hargaJual: 3000, hargaBeli: 2200 }],
      },
    ];

    const grouped = groupProductsForDisplay(sample);
    expect(grouped).toHaveLength(2);

    const first = grouped[0];
    expect(first.type).toBe("group");
    if (first.type === "group") {
      expect(first.variantCount).toBe(2);
      expect(first.totalStok).toBe(13);
      expect(first.minPrice).toBe(7000);
      expect(first.maxPrice).toBe(8000);
      expect(first.hasLowStock).toBe(true);
      expect(first.hasOutOfStock).toBe(false);
    }

    const second = grouped[1];
    expect(second.type).toBe("standalone");
  });
});

describe("Product Group & Split Zod Validation", () => {
  it("rejects duplicate barcodes within variants", () => {
    const res = createProductGroupSchema.safeParse({
      nama: "Cimory Fresh Milk",
      variants: [
        {
          variantName: "Cokelat",
          barcode: "8991001",
          satuanDasar: "pcs",
          stokMinimum: 5,
          stokAwal: 10,
          satuanList: [
            { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 7000, hargaBeli: 5500, isDefault: true },
          ],
        },
        {
          variantName: "Matcha",
          barcode: "8991001",
          satuanDasar: "pcs",
          stokMinimum: 5,
          stokAwal: 10,
          satuanList: [
            { namaSatuan: "pcs", faktorKeDasar: 1, hargaJual: 7000, hargaBeli: 5500, isDefault: true },
          ],
        },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("requires at least 2 variants when splitting a product", () => {
    const res = splitProductSchema.safeParse({
      groupName: "Cimory",
      variants: [{ variantName: "Matcha", stokAwal: 50 }],
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid split product payload", () => {
    const res = splitProductSchema.safeParse({
      groupName: "Cimory",
      brand: "Cimory",
      variants: [
        { variantName: "Matcha", barcode: "899001", stokAwal: 50 },
        { variantName: "Cokelat", barcode: "899002", stokAwal: 50 },
      ],
    });
    expect(res.success).toBe(true);
  });
});
