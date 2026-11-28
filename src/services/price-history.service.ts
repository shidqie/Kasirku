import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface UnitPriceSnapshot {
  namaSatuan: string;
  hargaJual: number;
  hargaBeli: number;
}

export interface RecordPriceChangesInput {
  tx?: Prisma.TransactionClient;
  produkId: string;
  namaProduk: string;
  beforeUnits: UnitPriceSnapshot[];
  afterUnits: UnitPriceSnapshot[];
  userId?: string | null;
  keterangan?: string | null;
}

/**
 * Mencatat perubahan harga jual maupun harga beli ke tabel permanen `riwayat_harga`.
 * Riwayat bersifat append-only dan tidak ikut terhapus saat satuan/harga diperbarui.
 */
export async function recordPriceChanges(input: RecordPriceChangesInput): Promise<number> {
  const db = input.tx ?? prisma;

  let validUserId: string | null = null;
  let namaPengguna: string | null = null;
  if (input.userId) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, nama: true },
    });
    if (user) {
      validUserId = user.id;
      namaPengguna = user.nama;
    }
  }

  const entries: {
    produkId: string;
    namaProduk: string;
    namaSatuan: string;
    jenisPerubahan: "HARGA_JUAL" | "HARGA_BELI";
    hargaLama: number;
    hargaBaru: number;
    userId: string | null;
    namaPengguna: string | null;
    keterangan: string | null;
  }[] = [];

  for (const after of input.afterUnits) {
    const key = after.namaSatuan.trim().toLowerCase();
    const matchedBefore =
      input.beforeUnits.find((b) => b.namaSatuan.trim().toLowerCase() === key) ||
      (input.beforeUnits.length === 1 && input.afterUnits.length === 1
        ? input.beforeUnits[0]
        : undefined);

    if (!matchedBefore) continue;

    if (matchedBefore.hargaJual !== after.hargaJual) {
      entries.push({
        produkId: input.produkId,
        namaProduk: input.namaProduk,
        namaSatuan: after.namaSatuan,
        jenisPerubahan: "HARGA_JUAL",
        hargaLama: matchedBefore.hargaJual,
        hargaBaru: after.hargaJual,
        userId: validUserId,
        namaPengguna,
        keterangan: input.keterangan ?? null,
      });
    }

    if (matchedBefore.hargaBeli !== after.hargaBeli) {
      entries.push({
        produkId: input.produkId,
        namaProduk: input.namaProduk,
        namaSatuan: after.namaSatuan,
        jenisPerubahan: "HARGA_BELI",
        hargaLama: matchedBefore.hargaBeli,
        hargaBaru: after.hargaBeli,
        userId: validUserId,
        namaPengguna,
        keterangan: input.keterangan ?? null,
      });
    }
  }

  if (entries.length === 0) return 0;

  await db.riwayatHarga.createMany({ data: entries });
  return entries.length;
}

export async function getPriceHistory(params: {
  produkId?: string;
  includeCostHistory: boolean;
  take?: number;
}) {
  return prisma.riwayatHarga.findMany({
    where: {
      ...(params.produkId ? { produkId: params.produkId } : {}),
      ...(!params.includeCostHistory ? { jenisPerubahan: { not: "HARGA_BELI" } } : {}),
    },
    orderBy: { dibuatPada: "desc" },
    take: params.take ?? 100,
  });
}
