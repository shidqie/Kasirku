import { z } from "zod";

export const opnameItemInputSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
  stokFisik: z.number().nonnegative("Stok fisik tidak boleh negatif"),
  catatan: z.string().nullable().optional(),
});

export const createOpnameSchema = z.object({
  catatan: z.string().nullable().optional(),
  items: z.array(opnameItemInputSchema).min(1, "Minimal harus ada 1 produk yang dihitung"),
});

export const rejectOpnameSchema = z.object({
  alasan: z.string().min(3, "Alasan penolakan minimal 3 karakter"),
});

