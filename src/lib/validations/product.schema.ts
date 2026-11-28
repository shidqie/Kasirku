import { z } from "zod";

export const categorySchema = z.object({
  nama: z.string().min(2, "Nama kategori minimal 2 karakter").max(50),
});

export const satuanProdukSchema = z.object({
  id: z.string().optional(),
  namaSatuan: z.string().min(1, "Nama satuan wajib diisi"), // misal: "kg", "karung 25kg", "dus"
  faktorKeDasar: z.number().positive("Faktor konversi harus lebih dari 0"), // misal: 25 untuk karung 25kg
  hargaJual: z.number().int().nonnegative("Harga jual tidak boleh negatif"),
  hargaBeli: z.number().int().nonnegative("Harga beli tidak boleh negatif"),
  isDefault: z.boolean().default(false),
});

export const createProductSchema = z.object({
  nama: z.string().min(2, "Nama produk minimal 2 karakter"),
  kategoriId: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  satuanDasar: z.string().min(1, "Satuan dasar wajib diisi"), // misal: "kg", "pcs", "butir"
  stokMinimum: z.number().nonnegative("Stok minimum tidak boleh negatif").default(0),
  stokKosong: z.number().nonnegative("Stok kosong tidak boleh negatif").optional(),
  isRefill: z.boolean().optional(),
  satuanList: z.array(satuanProdukSchema).min(1, "Minimal harus ada satu satuan dan harga"),
});

export const updateProductSchema = z.object({
  nama: z.string().min(2, "Nama produk minimal 2 karakter").optional(),
  kategoriId: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  satuanDasar: z.string().min(1, "Satuan dasar wajib diisi").optional(),
  stokMinimum: z.number().nonnegative("Stok minimum tidak boleh negatif").optional(),
  stokKosong: z.number().nonnegative("Stok kosong tidak boleh negatif").optional(),
  isRefill: z.boolean().optional(),
  aktif: z.boolean().optional(),
  satuanList: z.array(satuanProdukSchema).min(1, "Minimal harus ada satu satuan dan harga").optional(),
});

