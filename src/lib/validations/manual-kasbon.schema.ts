import { z } from "zod";

export const manualKasbonItemSchema = z.object({
  nama: z.string().min(1, "Nama barang wajib diisi"),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  harga: z.number().int().nonnegative("Harga tidak boleh negatif"),
  subtotal: z.number().int().nonnegative("Subtotal tidak boleh negatif"),
});

export const manualKasbonSchema = z.object({
  tanggal: z.string().optional(), // YYYY-MM-DD atau ISO
  pengambil: z.string().min(1, "Nama yang mengambil/pembawa bon wajib diisi"),
  catatan: z.string().optional(),
  items: z.array(manualKasbonItemSchema).min(1, "Daftar belanja minimal 1 barang"),
  total: z.number().int().positive("Total belanja harus lebih dari 0"),
});

