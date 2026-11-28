import { z } from "zod";
import { safeImageSchema } from "./image.schema";

export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(50, "Username maksimal 50 karakter"),
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["OWNER", "KEPALA_TOKO", "STAFF_KASIR", "STAFF"], {
    errorMap: () => ({ message: "Role tidak valid. Pilih Pemilik, Kepala Toko, atau Kasir." }),
  }),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter").optional(),
  username: z.string().trim().min(3, "Username minimal 3 karakter").max(50, "Username maksimal 50 karakter").optional(),
  aktif: z.boolean().optional(),
  role: z
    .enum(["OWNER", "KEPALA_TOKO", "STAFF_KASIR", "STAFF"], {
      errorMap: () => ({ message: "Role tidak valid. Pilih Pemilik, Kepala Toko, atau Kasir." }),
    })
    .optional(),
  permissions: z.array(z.string()).optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const resetPasswordWithPinSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  pin: z
    .string()
    .length(6, "PIN Owner harus 6 digit angka")
    .regex(/^\d+$/, "PIN Owner hanya boleh berupa angka"),
  password: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const verifyPinSchema = z.object({
  pin: z.string().length(6, "PIN harus 6 digit angka").regex(/^\d+$/, "PIN hanya boleh berupa angka"),
});

export const updatePinSchema = z.object({
  oldPin: z.string().length(6, "PIN lama harus 6 digit angka"),
  newPin: z.string().length(6, "PIN baru harus 6 digit angka").regex(/^\d+$/, "PIN baru hanya boleh berupa angka"),
});

export const updateSettingsSchema = z.object({
  namaToko: z.string().min(1, "Nama toko wajib diisi"),
  alamat: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  headerStruk: z.string().nullable().optional(),
  footerStruk: z.string().nullable().optional(),
  catatanRetur: z.string().nullable().optional(),
  headerBon: z.string().nullable().optional(),
  footerBon: z.string().nullable().optional(),
  pesanWhatsApp: z.string().nullable().optional(),
  pembulatan: z.enum(["BULAT_0", "BULAT_100", "BULAT_500"]),
  batasDiskonStaff: z.number().int().min(0, "Batas diskon tidak boleh negatif"),
  ambangUtangLamaHari: z.number().int().min(1, "Ambang utang minimal 1 hari"),
  bolehJualStokNol: z.boolean(),
  aktifkanHargaBeli: z.boolean().optional(),
  qrisModeDefault: z.enum(["DINAMIS", "STATIS"]).optional(),
  qrisPayload: z.string().nullable().optional(),
  qrisStaticImage: safeImageSchema,
  logoToko: safeImageSchema,
});

