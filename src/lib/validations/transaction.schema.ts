import { z } from "zod";

export const checkoutItemSchema = z.object({
  produkId: z.string().min(1, "Produk wajib dipilih"),
  satuanProdukId: z.string().min(1, "Satuan wajib dipilih"),
  nama: z.string().min(1).optional(),
  harga: z.number().nonnegative("Harga tidak boleh negatif").optional(),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
  subtotal: z.number().nonnegative("Subtotal tidak boleh negatif").optional(),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(1, "Idempotency key wajib diisi"),
  memberId: z.string().nullable().optional(),
  items: z.array(checkoutItemSchema).min(1, "Keranjang belanja tidak boleh kosong"),
  diskon: z.number().int().nonnegative("Diskon tidak boleh negatif").default(0),
  metodePembayaran: z.enum(["TUNAI", "TRANSFER", "KASBON"]),
  uangDiterima: z.number().int().optional(),
  pinOwner: z.string().optional(), // Wajib jika diskon > batasDiskonStaff untuk kasir staff
  buktiKey: z.string().nullable().optional(),
  refillDikembalikan: z.enum(["SUDAH", "BELUM"]).nullable().optional(),
});

export const quickQrisSchema = z.object({
  amount: z.number().int().positive("Nominal harus lebih dari 0"),
  buktiKey: z.string().min(1, "Bukti transfer wajib diupload"),
});

export const voidTransactionSchema = z.object({
  alasan: z.string().min(3, "Alasan pembatalan minimal 3 karakter"),
  pinOwner: z.string().optional(), // Wajib jika staff
});

