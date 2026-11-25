import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { Prisma, StatusOpname } from "@prisma/client";

export interface CreateOpnameItemInput {
  produkId: string;
  stokFisik: number;
  catatan?: string | null;
}

export interface CreateOpnameInput {
  catatan?: string | null;
  items: CreateOpnameItemInput[];
}

async function generateOpnameNumber(tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const seq = await tx.receiptSequence.upsert({
    where: { tanggal: dateStr },
    update: { counter: { increment: 1 } },
    create: { tanggal: dateStr, counter: 1 },
  });

  const padded = String(seq.counter).padStart(4, "0");
  return `OP-${dateStr}-${padded}`;
}

// 1. User Story E5: Staff Mengajukan Stok Opname (Status MENUNGGU, Stok Belum Berubah)
export async function createOpname(input: CreateOpnameInput, userId: string, ip?: string) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Daftar hitung fisik opname tidak boleh kosong");
  }

  const productIds = input.items.map((i) => i.produkId);
  const products = await prisma.produk.findMany({
    where: { id: { in: productIds } },
    include: { satuanProduk: { where: { isDefault: true } } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const result = await prisma.$transaction(async (tx) => {
    const nomor = await generateOpnameNumber(tx);

    const opname = await tx.stokOpname.create({
      data: {
        nomor,
        status: "MENUNGGU",
        dibuatOlehId: userId,
        catatan: input.catatan || null,
      },
    });

    const createdItems = [];
    for (const item of input.items) {
      const p = productMap.get(item.produkId);
      if (!p) continue;

      const stokSistemDecimal = p.stokCache;
      const stokFisikDecimal = new Prisma.Decimal(item.stokFisik);
      const selisihDecimal = stokFisikDecimal.sub(stokSistemDecimal); // fisik - sistem

      // Estimasi nilai rupiah selisih
      const hargaBeli = p.satuanProduk[0]?.hargaBeli || 0;
      const nilaiSelisih = Math.round(Number(selisihDecimal) * hargaBeli);

      const opItem = await tx.stokOpnameItem.create({
        data: {
          stokOpnameId: opname.id,
          produkId: item.produkId,
          stokSistem: stokSistemDecimal,
          stokFisik: stokFisikDecimal,
          selisih: selisihDecimal,
          nilaiSelisih,
          catatan: item.catatan || null,
        },
      });

      createdItems.push(opItem);
    }

    return { opname, items: createdItems };
  });

  await logActivity({
    userId,
    role: "STAFF",
    aksi: "AJUKAN_STOK_OPNAME",
    entitas: "StokOpname",
    entitasId: result.opname.id,
    sesudahJson: {
      nomor: result.opname.nomor,
      totalProdukDiuji: input.items.length,
    },
    ip,
  });

  return result;
}

// 2. User Story E6: Owner Menyetujui Opname (Stok Mutasi OPNAME Ditulis, Saldo Cache Berubah)
export async function approveOpname(opnameId: string, ownerId: string, ip?: string) {
  const opname = await prisma.stokOpname.findUnique({
    where: { id: opnameId },
    include: { items: true },
  });

  if (!opname) throw new Error("Pengajuan opname tidak ditemukan");
  if (opname.status !== "MENUNGGU") {
    throw new Error(`Pengajuan opname sudah berstatus ${opname.status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update status opname
    const updated = await tx.stokOpname.update({
      where: { id: opnameId },
      data: {
        status: "DISETUJUI",
        disetujuiOlehId: ownerId,
        tanggalPersetujuan: new Date(),
      },
    });

    // 2. Tulis mutasi stok OPNAME untuk setiap item yang ada selisih
    for (const item of opname.items) {
      if (!item.selisih.isZero()) {
        await tx.stokMutasi.create({
          data: {
            produkId: item.produkId,
            tipe: "OPNAME",
            qtyDasar: item.selisih, // bisa positif (+) atau negatif (-)
            refTipe: "STOK_OPNAME",
            refId: opname.id,
            userId: ownerId,
            catatan: `Penyesuaian Opname ${opname.nomor}: Fisik ${item.stokFisik} vs Sistem ${item.stokSistem}`,
          },
        });

        // Update stok cache produk
        await tx.produk.update({
          where: { id: item.produkId },
          data: {
            stokCache: { increment: item.selisih },
          },
        });
      }
    }

    return updated;
  });

  await logActivity({
    userId: ownerId,
    role: "OWNER",
    aksi: "SETUJUI_STOK_OPNAME",
    entitas: "StokOpname",
    entitasId: opnameId,
    sesudahJson: { nomor: opname.nomor, status: "DISETUJUI" },
    ip,
  });

  return result;
}

// 3. User Story E6: Owner Menolak Opname (Stok Tidak Berubah)
export async function rejectOpname(opnameId: string, alasan: string, ownerId: string, ip?: string) {
  const opname = await prisma.stokOpname.findUnique({ where: { id: opnameId } });
  if (!opname) throw new Error("Pengajuan opname tidak ditemukan");
  if (opname.status !== "MENUNGGU") {
    throw new Error(`Pengajuan opname sudah berstatus ${opname.status}`);
  }

  const updated = await prisma.stokOpname.update({
    where: { id: opnameId },
    data: {
      status: "DITOLAK",
      disetujuiOlehId: ownerId,
      catatan: opname.catatan ? `${opname.catatan} (Ditolak: ${alasan})` : `Ditolak: ${alasan}`,
      tanggalPersetujuan: new Date(),
    },
  });

  await logActivity({
    userId: ownerId,
    role: "OWNER",
    aksi: "TOLAK_STOK_OPNAME",
    entitas: "StokOpname",
    entitasId: opnameId,
    sesudahJson: { nomor: opname.nomor, status: "DITOLAK", alasan },
    ip,
  });

  return updated;
}

export async function getOpnameList(status?: StatusOpname) {
  const where: Prisma.StokOpnameWhereInput = {};
  if (status) where.status = status;

  return prisma.stokOpname.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      dibuatOleh: { select: { nama: true, username: true } },
      disetujuiOleh: { select: { nama: true, username: true } },
      items: {
        include: { produk: { select: { nama: true, satuanDasar: true } } },
      },
    },
    take: 50,
  });
}

