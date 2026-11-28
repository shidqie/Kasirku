import { z } from "zod";
import { satuanProdukSchema } from "./product.schema";

export const variantItemInputSchema = z.object({
  sku: z.string().trim().max(50, "SKU maksimal 50 karakter").nullable().optional(),
  variantName: z.string().min(1, "Nama varian/rasa wajib diisi"),
  barcode: z.string().nullable().optional(),
  satuanDasar: z.string().min(1, "Satuan dasar wajib diisi").default("pcs"),
  stokMinimum: z.number().nonnegative("Stok minimum tidak boleh negatif").default(0),
  stokAwal: z.number().nonnegative("Stok awal tidak boleh negatif").default(0),
  isRefill: z.boolean().optional(),
  satuanList: z
    .array(satuanProdukSchema)
    .min(1, "Minimal harus ada satu satuan dan harga"),
});

export const createProductGroupSchema = z
  .object({
    nama: z.string().min(2, "Nama produk induk minimal 2 karakter"),
    brand: z.string().nullable().optional(),
    kategoriId: z.string().nullable().optional(),
    variants: z
      .array(variantItemInputSchema)
      .min(1, "Minimal harus ada 1 varian produk"),
  })
  .superRefine((data, ctx) => {
    const seenBarcodes = new Map<string, number>();
    data.variants.forEach((v, idx) => {
      const clean = v.barcode?.trim();
      if (clean) {
        const key = clean.toLowerCase();
        if (seenBarcodes.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Barcode "${clean}" duplikat pada baris varian #${idx + 1}`,
            path: ["variants", idx, "barcode"],
          });
        } else {
          seenBarcodes.set(key, idx);
        }
      }
    });
  });

export const updateProductGroupSchema = z.object({
  nama: z.string().min(2, "Nama produk induk minimal 2 karakter").optional(),
  brand: z.string().nullable().optional(),
  kategoriId: z.string().nullable().optional(),
});

export const moveProductToGroupSchema = z.object({
  groupId: z.string().nullable(),
  variantName: z.string().nullable().optional(),
});

export const splitProductVariantRowSchema = z.object({
  sku: z.string().trim().max(50, "SKU maksimal 50 karakter").nullable().optional(),
  variantName: z.string().min(1, "Nama varian wajib diisi"),
  barcode: z.string().nullable().optional(),
  stokAwal: z.number().nonnegative("Stok tidak boleh negatif").default(0),
  hargaJual: z.number().int().nonnegative().optional(),
  hargaBeli: z.number().int().nonnegative().optional(),
});

export const splitProductSchema = z
  .object({
    groupName: z.string().min(2, "Nama produk induk minimal 2 karakter"),
    brand: z.string().nullable().optional(),
    kategoriId: z.string().nullable().optional(),
    variants: z
      .array(splitProductVariantRowSchema)
      .min(2, "Minimal pecah menjadi 2 varian"),
  })
  .superRefine((data, ctx) => {
    const seenBarcodes = new Map<string, number>();
    data.variants.forEach((v, idx) => {
      const clean = v.barcode?.trim();
      if (clean) {
        const key = clean.toLowerCase();
        if (seenBarcodes.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Barcode "${clean}" duplikat pada varian #${idx + 1}`,
            path: ["variants", idx, "barcode"],
          });
        } else {
          seenBarcodes.set(key, idx);
        }
      }
    });
  });
