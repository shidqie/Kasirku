import { z } from "zod";

export const proposalSatuanItemSchema = z.object({
  id: z.string().optional(),
  namaSatuan: z.string().trim().min(1, "Nama satuan wajib diisi"),
  faktorKeDasar: z.number().positive("Faktor konversi harus lebih dari 0"),
  hargaJual: z.number().int("Harga jual harus bilangan bulat").nonnegative("Harga jual tidak boleh negatif"),
  isDefault: z.boolean().default(false),
});

export const createProductProposalPayloadSchema = z.object({
  nama: z.string().trim().min(2, "Nama produk minimal 2 karakter"),
  kategoriId: z.string().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  satuanDasar: z.string().trim().min(1, "Satuan dasar wajib diisi").default("pcs"),
  stokMinimum: z.number().nonnegative("Stok minimum tidak boleh negatif").default(0),
  satuanList: z
    .array(proposalSatuanItemSchema)
    .min(1, "Minimal harus ada satu satuan dan harga jual"),
});

export const priceChangeUnitSchema = z.object({
  satuanId: z.string().optional(),
  namaSatuan: z.string().trim().min(1, "Nama satuan wajib diisi"),
  faktorKeDasar: z.number().positive("Faktor konversi harus lebih dari 0"),
  hargaLama: z.number().int().nonnegative().optional(),
  hargaBaru: z
    .number()
    .int("Harga baru harus bilangan bulat")
    .nonnegative("Harga jual baru tidak boleh negatif"),
  isDefault: z.boolean().optional(),
});

export const createPriceChangeProposalPayloadSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
  perubahan: z
    .array(priceChangeUnitSchema)
    .min(1, "Minimal ada satu satuan harga yang diajukan"),
});

export const createProposalSchema = z.discriminatedUnion("tipe", [
  z.object({
    tipe: z.literal("PRODUK_BARU"),
    payload: createProductProposalPayloadSchema,
    catatanPengaju: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
  }),
  z.object({
    tipe: z.literal("UBAH_HARGA"),
    payload: createPriceChangeProposalPayloadSchema,
    catatanPengaju: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
  }),
]);

export const reviewProposalSchema = z.object({
  catatanPeninjau: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type CreateProductProposalPayload = z.infer<typeof createProductProposalPayloadSchema>;
export type CreatePriceChangeProposalPayload = z.infer<typeof createPriceChangeProposalPayloadSchema>;
