import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
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
