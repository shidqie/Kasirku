import { prisma } from "@/lib/db";
import { TipePromo } from "@prisma/client";
import { logActivity } from "./activity-log.service";

export interface PromoInput {
  nama: string;
  tipe: TipePromo;
  produkId?: string | null;
  kategoriId?: string | null;
  minQty?: number;
  bonusQty?: number;
  bonusProdukId?: string | null;
  diskonPersen?: number;
  diskonNominal?: number;
  hargaPaket?: number;
  berlakuKelipatan?: boolean;
  mulaiPada?: string | null;
  berakhirPada?: string | null;
  aktif?: boolean;
}

export async function getPromos(params?: { activeOnly?: boolean }) {
  return prisma.promoRule.findMany({
    where: params?.activeOnly ? { aktif: true } : undefined,
    orderBy: [{ aktif: "desc" }, { createdAt: "desc" }],
    include: {
      produk: { select: { id: true, nama: true, satuanDasar: true } },
      bonusProduk: { select: { id: true, nama: true, satuanDasar: true } },
      kategori: { select: { id: true, nama: true } },
    },
  });
}

export async function createPromo(input: PromoInput, userId: string, ip?: string) {
  const promo = await prisma.promoRule.create({
    data: {
      nama: input.nama.trim(),
      tipe: input.tipe,
      produkId: input.produkId || null,
      kategoriId: input.produkId ? null : input.kategoriId || null,
      minQty: Math.max(1, Math.round(input.minQty ?? 1)),
      bonusQty: Math.max(0, Math.round(input.bonusQty ?? 0)),
      bonusProdukId: input.bonusProdukId || null,
      diskonPersen: Math.min(100, Math.max(0, Math.round(input.diskonPersen ?? 0))),
      diskonNominal: Math.max(0, Math.round(input.diskonNominal ?? 0)),
      hargaPaket: Math.max(0, Math.round(input.hargaPaket ?? 0)),
      berlakuKelipatan: input.berlakuKelipatan ?? true,
      mulaiPada: input.mulaiPada ? new Date(input.mulaiPada) : null,
      berakhirPada: input.berakhirPada ? new Date(input.berakhirPada) : null,
      aktif: input.aktif ?? true,
    },
    include: {
      produk: { select: { id: true, nama: true, satuanDasar: true } },
      bonusProduk: { select: { id: true, nama: true, satuanDasar: true } },
      kategori: { select: { id: true, nama: true } },
    },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "BUAT_PROMO",
    entitas: "PromoRule",
    entitasId: promo.id,
    sesudahJson: { nama: promo.nama, tipe: promo.tipe },
    ip,
  });

  return promo;
}

export async function updatePromo(
  id: string,
  input: Partial<PromoInput>,
  userId: string,
  ip?: string
) {
  const existing = await prisma.promoRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Aturan promo tidak ditemukan");

  const promo = await prisma.promoRule.update({
    where: { id },
    data: {
      ...(input.nama !== undefined ? { nama: input.nama.trim() } : {}),
      ...(input.tipe !== undefined ? { tipe: input.tipe } : {}),
      ...(input.produkId !== undefined ? { produkId: input.produkId || null } : {}),
      ...(input.kategoriId !== undefined
        ? { kategoriId: input.produkId ? null : input.kategoriId || null }
        : {}),
      ...(input.minQty !== undefined ? { minQty: Math.max(1, Math.round(input.minQty)) } : {}),
      ...(input.bonusQty !== undefined ? { bonusQty: Math.max(0, Math.round(input.bonusQty)) } : {}),
      ...(input.bonusProdukId !== undefined ? { bonusProdukId: input.bonusProdukId || null } : {}),
      ...(input.diskonPersen !== undefined
        ? { diskonPersen: Math.min(100, Math.max(0, Math.round(input.diskonPersen))) }
        : {}),
      ...(input.diskonNominal !== undefined
        ? { diskonNominal: Math.max(0, Math.round(input.diskonNominal)) }
        : {}),
      ...(input.hargaPaket !== undefined
        ? { hargaPaket: Math.max(0, Math.round(input.hargaPaket)) }
        : {}),
      ...(input.berlakuKelipatan !== undefined
        ? { berlakuKelipatan: input.berlakuKelipatan }
        : {}),
      ...(input.mulaiPada !== undefined
        ? { mulaiPada: input.mulaiPada ? new Date(input.mulaiPada) : null }
        : {}),
      ...(input.berakhirPada !== undefined
        ? { berakhirPada: input.berakhirPada ? new Date(input.berakhirPada) : null }
        : {}),
      ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
    },
    include: {
      produk: { select: { id: true, nama: true, satuanDasar: true } },
      bonusProduk: { select: { id: true, nama: true, satuanDasar: true } },
      kategori: { select: { id: true, nama: true } },
    },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UBAH_PROMO",
    entitas: "PromoRule",
    entitasId: id,
    sebelumJson: { nama: existing.nama, aktif: existing.aktif },
    sesudahJson: { nama: promo.nama, aktif: promo.aktif },
    ip,
  });

  return promo;
}

export async function deletePromo(id: string, userId: string, ip?: string) {
  const existing = await prisma.promoRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Aturan promo tidak ditemukan");

  await prisma.promoRule.delete({ where: { id } });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "HAPUS_PROMO",
    entitas: "PromoRule",
    entitasId: id,
    sebelumJson: { nama: existing.nama, tipe: existing.tipe },
    ip,
  });
}
