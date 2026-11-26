import { z } from "zod";
import { safeImageSchema } from "./image.schema";

export const createMemberSchema = z.object({
  nama: z.string().min(2, "Nama member minimal 2 karakter"),
  telepon: z.string().nullable().optional(),
  alamat: z.string().nullable().optional(),
  subMembers: z.array(z.string().trim().min(1)).optional(),
  batasKasbon: z.number().int().min(0, "Batas kasbon tidak boleh negatif").default(1000000),
  saldoAwal: z.number().int().min(0, "Saldo awal tidak boleh negatif").default(0),
});

export const updateMemberSchema = z.object({
  nama: z.string().min(2, "Nama member minimal 2 karakter").optional(),
  telepon: z.string().nullable().optional(),
  alamat: z.string().nullable().optional(),
  subMembers: z.array(z.string().trim().min(1)).optional(),
  batasKasbon: z.number().int().min(0, "Batas kasbon tidak boleh negatif").optional(),
  aktif: z.boolean().optional(),
});

export const payDebtSchema = z
  .object({
    jumlah: z.number().int().positive("Nominal pembayaran harus lebih dari Rp 0"),
    metode: z.enum(["TUNAI", "TRANSFER"]),
    uangDiterima: z.number().int().optional(),
    catatan: z.string().nullable().optional(),
    buktiUrl: safeImageSchema,
  })
  .refine((data) => data.metode !== "TRANSFER" || Boolean(data.buktiUrl?.trim()), {
    message: "Bukti pembayaran wajib diupload untuk metode Transfer / QRIS",
    path: ["buktiUrl"],
  });

export const adjustDebtSchema = z.object({
  jumlah: z.number().int(), // positif menambah utang, negatif mengurangi
  catatan: z.string().min(3, "Alasan koreksi saldo wajib diisi"),
});

