import { z } from "zod";

export const barangMasukItemSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
  namaSatuan: z.string().min(1, "Nama satuan wajib diisi"),
  faktorKeDasar: z.number().positive("Faktor konversi harus lebih dari 0"),
  qty: z.number().positive("Jumlah masuk harus lebih dari 0"),
  hargaBeliPerSatuan: z.number().int().nonnegative("Harga beli tidak boleh negatif"),
});

export const barangMasukSchema = z.object({
  tanggal: z.string().optional(),
  catatan: z.string().nullable().optional(),
  items: z.array(barangMasukItemSchema).min(1, "Minimal harus ada 1 barang masuk"),
});

export const stockAdjustmentSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
  qtyDasar: z.number(), // Bisa positif (tambah) atau negatif (kurangi)
  catatan: z.string().min(3, "Alasan penyesuaian wajib diisi"),
  pinOwner: z.string().optional(), // Wajib jika staff
});

export const reconcileStockSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
});

