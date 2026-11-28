import { prisma } from "@/lib/db";
import { hasAnyPermission, hasPermission, type Permission } from "@/lib/auth/permissions";
import { getSettings } from "@/services/settings.service";
import type { SessionPayload } from "@/lib/auth/session";

export interface CostAccessContext {
  /** Pengaturan global toko: pencatatan harga beli sedang aktif */
  hargaBeliAktif: boolean;
  /** Hak akses user saat ini (pemilik atau izin khusus produk:cost) */
  canViewHargaBeli: boolean;
  /** Efektif boleh melihat/mengedit harga beli & margin di UI/API */
  showCost: boolean;
}

export async function getLiveUserFromSession(session: SessionPayload) {
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, permissions: true, nama: true, aktif: true },
  });
  if (!dbUser || !dbUser.aktif) return null;
  return dbUser;
}

export async function hasLiveAnyPermission(
  session: SessionPayload,
  permissions: Permission[]
): Promise<boolean> {
  const dbUser = await getLiveUserFromSession(session);
  if (!dbUser) return false;
  return hasAnyPermission({ role: dbUser.role, permissions: dbUser.permissions }, permissions);
}

/**
 * Mengecek hak akses melihat/mengedit harga beli dari database terbaru
 * digabungkan dengan pengaturan global `aktifkanHargaBeli`.
 */
export async function getCostAccessContext(
  session: SessionPayload
): Promise<CostAccessContext> {
  const [settings, dbUser] = await Promise.all([
    getSettings(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, permissions: true, aktif: true },
    }),
  ]);

  const hargaBeliAktif = settings.aktifkanHargaBeli;
  const effectiveUser = dbUser && dbUser.aktif
    ? { role: dbUser.role, permissions: dbUser.permissions }
    : session;

  const canViewHargaBeli = hasPermission(effectiveUser, "produk:cost");

  return {
    hargaBeliAktif,
    canViewHargaBeli,
    showCost: hargaBeliAktif && canViewHargaBeli,
  };
}
