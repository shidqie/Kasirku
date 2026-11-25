import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logActivity } from "./activity-log.service";

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 15;

export interface VerifyPinResult {
  valid: boolean;
  message?: string;
  remainingAttempts?: number;
  lockedUntil?: Date | null;
}

export async function verifyOwnerPin(pin: string, userId?: string, ip?: string): Promise<VerifyPinResult> {
  const settings = await prisma.pengaturanToko.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return { valid: false, message: "Pengaturan toko belum diinisialisasi" };
  }

  const now = new Date();

  // 1. Cek apakah PIN sedang terkunci
  if (settings.pinLockedUntil && settings.pinLockedUntil > now) {
    const remainingMinutes = Math.ceil((settings.pinLockedUntil.getTime() - now.getTime()) / (60 * 1000));
    return {
      valid: false,
      message: `PIN terkunci karena salah ${MAX_FAILED_ATTEMPTS} kali. Silakan coba lagi dalam ${remainingMinutes} menit.`,
      lockedUntil: settings.pinLockedUntil,
      remainingAttempts: 0,
    };
  }

  // 2. Verifikasi PIN
  const isMatch = await bcrypt.compare(pin, settings.pinOwnerHash);

  if (isMatch) {
    // Reset failed counter jika sebelumnya ada percobaan salah
    if (settings.pinFailedAttempts > 0 || settings.pinLockedUntil) {
      await prisma.pengaturanToko.update({
        where: { id: "default" },
        data: {
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });
    }

    await logActivity({
      userId,
      role: "SYSTEM",
      aksi: "VERIFIKASI_PIN_BERHASIL",
      entitas: "PengaturanToko",
      entitasId: "default",
      ip,
    });

    return { valid: true };
  }

  // 3. PIN Salah - Naikkan counter
  const newFailedCount = settings.pinFailedAttempts + 1;
  const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) : null;

  await prisma.pengaturanToko.update({
    where: { id: "default" },
    data: {
      pinFailedAttempts: shouldLock ? 0 : newFailedCount,
      pinLockedUntil: lockedUntil,
    },
  });

  await logActivity({
    userId,
    role: "SYSTEM",
    aksi: "VERIFIKASI_PIN_GAGAL",
    entitas: "PengaturanToko",
    entitasId: "default",
    sesudahJson: { failedAttempts: newFailedCount, locked: shouldLock },
    ip,
  });

  if (shouldLock) {
    return {
      valid: false,
      message: `PIN salah 3 kali berturut-turut. Akses PIN dikunci selama ${LOCK_DURATION_MINUTES} menit.`,
      lockedUntil,
      remainingAttempts: 0,
    };
  }

  const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
  return {
    valid: false,
    message: `PIN salah! Sisa percobaan: ${remaining} kali sebelum terkunci.`,
    remainingAttempts: remaining,
  };
}

export async function updateOwnerPin(oldPin: string, newPin: string, userId: string, ip?: string): Promise<{ success: boolean; message: string }> {
  const verifyOld = await verifyOwnerPin(oldPin, userId, ip);
  if (!verifyOld.valid) {
    return { success: false, message: verifyOld.message || "PIN lama salah" };
  }

  const newHash = await bcrypt.hash(newPin, 10);

  await prisma.pengaturanToko.update({
    where: { id: "default" },
    data: {
      pinOwnerHash: newHash,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UBAH_PIN_OWNER",
    entitas: "PengaturanToko",
    entitasId: "default",
    ip,
  });

  return { success: true, message: "PIN Owner berhasil diperbarui" };
}

