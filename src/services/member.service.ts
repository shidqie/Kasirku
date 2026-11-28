import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { getSettings } from "./settings.service";
import { formatBonCode } from "@/lib/codification";
import { Prisma, MetodePembayaran } from "@prisma/client";

export interface CreateMemberInput {
  nama: string;
  telepon?: string | null;
  alamat?: string | null;
  subMembers?: string[];
  batasKasbon: number;
  saldoAwal?: number;
}

export interface UpdateMemberInput {
  nama?: string;
  telepon?: string | null;
  alamat?: string | null;
  subMembers?: string[];
  batasKasbon?: number;
  aktif?: boolean;
}

export interface PayDebtInput {
  jumlah: number;
  metode: MetodePembayaran;
  uangDiterima?: number;
  catatan?: string | null;
  buktiUrl?: string | null;
}

async function generatePaymentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const seq = await tx.receiptSequence.upsert({
    where: { tanggal: dateStr },
    update: { counter: { increment: 1 } },
    create: { tanggal: dateStr, counter: 1 },
  });

  const padded = String(seq.counter).padStart(4, "0");
  return `BYR-${dateStr}-${padded}`;
}

// 1. List & Detail Member
export async function getMembers(search?: string) {
  const where: Prisma.MemberWhereInput = {};
  if (search) {
    const q = search.trim();
    where.OR = [
      { nama: { contains: q, mode: "insensitive" } },
      { telepon: { contains: q, mode: "insensitive" } },
    ];
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { nama: "asc" },
  });

  const settings = await getSettings();
  const ambangMs = settings.ambangUtangLamaHari * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Cari apakah ada mutasi kasbon tertua yang belum tertutup (> ambangUtangLamaHari)
  const results = await Promise.all(
    members.map(async (m) => {
      let hasOldDebt = false;
      if (m.saldoUtangCache > 0) {
        const oldestDebt = await prisma.kasbonMutasi.findFirst({
          where: { memberId: m.id, tipe: { in: ["KASBON", "SALDO_AWAL"] } },
          orderBy: { dibuatPada: "asc" },
        });

        if (oldestDebt && now - oldestDebt.dibuatPada.getTime() > ambangMs) {
          hasOldDebt = true;
        }
      }

      const limit = m.batasKasbon > 0 ? m.batasKasbon : 1000000;
      return {
        ...m,
        batasKasbon: limit,
        hasOldDebt,
        sisaLimit: Math.max(0, limit - m.saldoUtangCache),
      };
    })
  );

  return results;
}

export async function getMemberById(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      transaksi: {
        where: {
          status: "SELESAI",
          pembayaran: {
            some: { metode: "KASBON" },
          },
        },
        orderBy: { dibuatPada: "desc" },
        include: {
          items: true,
          pembayaran: true,
          kasir: { select: { nama: true } },
        },
        take: 30,
      },
      kasbonPembayaran: {
        orderBy: { dibuatPada: "desc" },
        include: { kasir: { select: { nama: true } } },
        take: 20,
      },
      kasbonMutasi: {
        orderBy: { dibuatPada: "desc" },
        include: { user: { select: { nama: true } } },
        take: 50,
      },
    },
  });

  if (!member) return null;

  const settings = await getSettings();
  const now = Date.now();

  let hasOldDebt = false;
  let daysOld = 0;
  if (member.saldoUtangCache > 0) {
    const oldest = await prisma.kasbonMutasi.findFirst({
      where: { memberId: id, tipe: { in: ["KASBON", "SALDO_AWAL"] } },
      orderBy: { dibuatPada: "asc" },
    });
    if (oldest) {
      daysOld = Math.floor((now - oldest.dibuatPada.getTime()) / (24 * 60 * 60 * 1000));
      if (daysOld >= settings.ambangUtangLamaHari) {
        hasOldDebt = true;
      }
    }
  }

  const limit = member.batasKasbon > 0 ? member.batasKasbon : 1000000;
  return {
    ...member,
    batasKasbon: limit,
    hasOldDebt,
    daysOld,
    sisaLimit: Math.max(0, limit - member.saldoUtangCache),
  };
}

// 2. Buat Member Baru
export async function createMember(input: CreateMemberInput, actorId: string, ip?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const saldoAwal = input.saldoAwal || 0;
    const limit = input.batasKasbon !== undefined && input.batasKasbon > 0 ? input.batasKasbon : 1000000;

    const member = await tx.member.create({
      data: {
        nama: input.nama,
        telepon: input.telepon || null,
        alamat: input.alamat || null,
        subMembers: (input.subMembers || []).map((s) => s.trim()).filter(Boolean),
        batasKasbon: limit,
        saldoUtangCache: saldoAwal,
        aktif: true,
      },
    });

    // Jika ada saldo awal utang dari buku lama (Bagian 9: Saldo awal kasbon dari buku)
    if (saldoAwal > 0) {
      await tx.kasbonMutasi.create({
        data: {
          memberId: member.id,
          tipe: "SALDO_AWAL",
          jumlah: saldoAwal,
          userId: actorId,
          catatan: "Migrasi saldo utang awal dari buku kasbon fisik",
        },
      });
    }

    return member;
  });

  await logActivity({
    userId: actorId,
    role: "SYSTEM",
    aksi: "BUAT_MEMBER",
    entitas: "Member",
    entitasId: result.id,
    sesudahJson: {
      nama: result.nama,
      batasKasbon: result.batasKasbon,
      saldoUtangAwal: input.saldoAwal || 0,
    },
    ip,
  });

  return result;
}

import { hasPermission } from "@/lib/auth/permissions";

// 3. Ubah Data Member
export async function updateMember(
  id: string,
  input: UpdateMemberInput,
  actor: { id: string; role: string; permissions?: string[] },
  ip?: string
) {
  const sebelum = await prisma.member.findUnique({ where: { id } });
  if (!sebelum) throw new Error("Member tidak ditemukan");

  // Hanya OWNER atau penerima delegasi piutang:limit yang boleh mengubah batas kasbon
  if (input.batasKasbon !== undefined && input.batasKasbon !== sebelum.batasKasbon) {
    if (actor.role !== "OWNER" && !hasPermission(actor, "piutang:limit")) {
      throw new Error("Akses ditolak. Mengubah batas kasbon memerlukan izin Pemilik Toko.");
    }
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      ...(input.nama ? { nama: input.nama } : {}),
      ...(input.telepon !== undefined ? { telepon: input.telepon } : {}),
      ...(input.alamat !== undefined ? { alamat: input.alamat } : {}),
      ...(input.subMembers !== undefined
        ? { subMembers: input.subMembers.map((s) => s.trim()).filter(Boolean) }
        : {}),
      ...(input.batasKasbon !== undefined ? { batasKasbon: input.batasKasbon } : {}),
      ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
    },
  });

  await logActivity({
    userId: actor.id,
    role: actor.role,
    aksi: "UBAH_MEMBER",
    entitas: "Member",
    entitasId: id,
    sebelumJson: { nama: sebelum.nama, batasKasbon: sebelum.batasKasbon },
    sesudahJson: { nama: updated.nama, batasKasbon: updated.batasKasbon },
    ip,
  });

  return updated;
}

// 3.1. Hapus Data Member / Piutang
export async function deleteMember(
  id: string,
  actor: { id: string; role: string },
  ip?: string
) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          transaksi: true,
          kasbonMutasi: true,
          kasbonPembayaran: true,
        },
      },
    },
  });

  if (!member) throw new Error("Member tidak ditemukan");

  if (member.saldoUtangCache > 0) {
    throw new Error(
      `Tidak dapat menghapus member "${member.nama}" karena masih memiliki sisa piutang/utang kasbon sebesar Rp ${member.saldoUtangCache.toLocaleString("id-ID")}. Harap lunasi terlebih dahulu.`
    );
  }

  // Jika sudah ada riwayat transaksi/mutasi, nonaktifkan (soft delete) untuk menjaga integritas data akuntansi
  const hasHistory =
    member._count.transaksi > 0 ||
    member._count.kasbonMutasi > 0 ||
    member._count.kasbonPembayaran > 0;

  if (hasHistory) {
    const updated = await prisma.member.update({
      where: { id },
      data: { aktif: false },
    });

    await logActivity({
      userId: actor.id,
      role: actor.role,
      aksi: "NONAKTIFKAN_MEMBER",
      entitas: "Member",
      entitasId: id,
      sebelumJson: { aktif: true },
      sesudahJson: { aktif: false, alasan: "Hapus member dengan riwayat transaksi" },
      ip,
    });

    return { success: true, mode: "DEACTIVATED", member: updated };
  } else {
    // Jika member baru dan belum pernah bertransaksi, hapus permanen
    await prisma.member.delete({ where: { id } });

    await logActivity({
      userId: actor.id,
      role: actor.role,
      aksi: "HAPUS_MEMBER",
      entitas: "Member",
      entitasId: id,
      sebelumJson: { nama: member.nama },
      ip,
    });

    return { success: true, mode: "DELETED" };
  }
}

// 4. User Story D4: Menerima Pembayaran Kasbon (Sebagian atau Lunas)
export async function bayarKasbon(
  memberId: string,
  input: PayDebtInput,
  kasirId: string,
  ip?: string
) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member tidak ditemukan");

  if (member.saldoUtangCache <= 0) {
    throw new Error("Member tidak memiliki saldo utang kasbon saat ini.");
  }

  if (input.jumlah > member.saldoUtangCache) {
    throw new Error(
      `Nominal pembayaran (Rp ${input.jumlah}) melebihi total utang member (Rp ${member.saldoUtangCache}).`
    );
  }

  let kembalian = 0;
  if (input.metode === "TUNAI") {
    const uang = input.uangDiterima || input.jumlah;
    if (uang < input.jumlah) {
      throw new Error(`Uang diterima (Rp ${uang}) kurang dari jumlah bayar (Rp ${input.jumlah}).`);
    }
    kembalian = uang - input.jumlah;
  }

  const result = await prisma.$transaction(async (tx) => {
    const nomorBukti = await generatePaymentNumber(tx);

    // 1. Catat bukti pembayaran
    const bukti = await tx.kasbonPembayaran.create({
      data: {
        nomorBukti,
        memberId,
        metode: input.metode,
        jumlah: input.jumlah,
        uangDiterima: input.metode === "TUNAI" ? input.uangDiterima : input.jumlah,
        kembalian: input.metode === "TUNAI" ? kembalian : 0,
        kasirId,
        catatan: input.catatan || null,
        buktiUrl: input.buktiUrl || null,
      },
    });

    // 2. Tulis mutasi kasbon PEMBAYARAN (Append-Only)
    await tx.kasbonMutasi.create({
      data: {
        memberId,
        tipe: "PEMBAYARAN",
        jumlah: -input.jumlah, // (-) mengurangi utang
        userId: kasirId,
        catatan: `Pembayaran No: ${nomorBukti} (${input.metode})`,
      },
    });

    // 3. Update cache saldo utang member
    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: {
        saldoUtangCache: { decrement: input.jumlah },
      },
    });

    return { bukti, member: updatedMember, kembalian };
  });

  await logActivity({
    userId: kasirId,
    role: "SYSTEM",
    aksi: "BAYAR_KASBON",
    entitas: "KasbonPembayaran",
    entitasId: result.bukti.id,
    sesudahJson: {
      nomorBukti: result.bukti.nomorBukti,
      jumlah: input.jumlah,
      sisaUtang: result.member.saldoUtangCache,
    },
    ip,
  });

  return result;
}

// 5. User Story D7: Koreksi Saldo Kasbon (Hanya Owner, Alasan Wajib)
export async function adjustMemberDebt(
  memberId: string,
  input: { jumlah: number; catatan: string },
  ownerId: string,
  ip?: string
) {
  if (input.jumlah === 0) {
    throw new Error("Nominal penyesuaian tidak boleh 0");
  }

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member tidak ditemukan");

  const result = await prisma.$transaction(async (tx) => {
    // 1. Tulis mutasi PENYESUAIAN
    const mutasi = await tx.kasbonMutasi.create({
      data: {
        memberId,
        tipe: "PENYESUAIAN",
        jumlah: input.jumlah, // bisa positif (+) atau negatif (-)
        userId: ownerId,
        catatan: `Koreksi Saldo Owner: ${input.catatan}`,
      },
    });

    // 2. Update cache saldo utang
    const updated = await tx.member.update({
      where: { id: memberId },
      data: {
        saldoUtangCache: { increment: input.jumlah },
      },
    });

    return { mutasi, member: updated };
  });

  await logActivity({
    userId: ownerId,
    role: "OWNER",
    aksi: "KOREKSI_KASBON",
    entitas: "Member",
    entitasId: memberId,
    sebelumJson: { saldoUtang: member.saldoUtangCache },
    sesudahJson: {
      koreksi: input.jumlah,
      saldoBaru: result.member.saldoUtangCache,
      alasan: input.catatan,
    },
    ip,
  });

  return result;
}

// 6. Rekonsiliasi Saldo Kasbon Cache vs SUM Mutasi (Prinsip 5.2 #5)
export async function reconcileMemberDebt(memberId: string, ownerId: string, ip?: string) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member tidak ditemukan");

  const sumResult = await prisma.kasbonMutasi.aggregate({
    where: { memberId },
    _sum: { jumlah: true },
  });

  const realDebt = sumResult._sum.jumlah || 0;
  const isMatch = realDebt === member.saldoUtangCache;

  if (!isMatch) {
    await prisma.member.update({
      where: { id: memberId },
      data: { saldoUtangCache: realDebt },
    });

    await logActivity({
      userId: ownerId,
      role: "SYSTEM",
      aksi: "REKONSILIASI_KASBON_SELISIH",
      entitas: "Member",
      entitasId: memberId,
      sebelumJson: { saldoUtangLama: member.saldoUtangCache },
      sesudahJson: { saldoUtangBaru: realDebt },
      ip,
    });
  }

  return {
    memberId,
    namaMember: member.nama,
    saldoCacheLama: member.saldoUtangCache,
    saldoMutasiNyata: realDebt,
    selisihDitemukan: !isMatch,
  };
}

// 7. Tambah Kasbon Manual dengan Rincian
export async function tambahKasbonManual(
  memberId: string,
  input: {
    tanggal?: string;
    pengambil: string;
    catatan?: string;
    items: Array<{
      nama: string;
      qty: number;
      satuan: string;
      harga: number;
      subtotal: number;
    }>;
    total: number;
  },
  actor: { id: string; role: string; nama?: string },
  ip?: string
) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member tidak ditemukan");

  if (!member.aktif) {
    throw new Error(`Member ${member.nama} dalam status nonaktif.`);
  }

  // Cek batas limit kasbon (default limit 1.000.000)
  const limit = member.batasKasbon > 0 ? member.batasKasbon : 1000000;
  if (member.saldoUtangCache + input.total > limit) {
    throw new Error(
      `Kasbon sebesar Rp ${input.total.toLocaleString("id-ID")} melebihi batas limit kasbon member (Sisa Limit: Rp ${Math.max(0, limit - member.saldoUtangCache).toLocaleString("id-ID")}).`
    );
  }

  const tanggalCatat = input.tanggal ? new Date(input.tanggal) : new Date();
  const startOfDay = new Date(tanggalCatat);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const countSameDay = await prisma.kasbonMutasi.count({
    where: {
      tipe: "KASBON",
      transaksiId: null,
      dibuatPada: { gte: startOfDay, lt: endOfDay },
    },
  });
  const kodeBon = formatBonCode(tanggalCatat, countSameDay + 1);

  // Format catatan lengkap dengan JSON rincian barang & pengambil
  const dataCatatan = {
    kodeBon,
    pengambil: input.pengambil,
    kasir: actor.nama || "Kasir",
    tanggal: tanggalCatat.toISOString(),
    keterangan: input.catatan || "",
    items: input.items,
    total: input.total,
  };

  const ringkasanText = input.items
    .map((it) => `${it.nama} (${it.qty} ${it.satuan})`)
    .join(", ");

  const catatanFormatted = `BON MANUAL [Ambil: ${input.pengambil}] [Kasir: ${actor.nama || "Kasir"}] - ${ringkasanText} || JSON:${JSON.stringify(dataCatatan)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Tulis Mutasi KASBON (append-only ledger)
    const mutasi = await tx.kasbonMutasi.create({
      data: {
        memberId,
        tipe: "KASBON",
        jumlah: input.total, // (+) menambah utang
        userId: actor.id,
        catatan: catatanFormatted,
        dibuatPada: tanggalCatat,
      },
      include: {
        user: { select: { nama: true } },
      },
    });

    // 2. Update saldo utang cache
    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: {
        saldoUtangCache: { increment: input.total },
      },
    });

    return { mutasi, member: updatedMember };
  });

  await logActivity({
    userId: actor.id,
    role: actor.role,
    aksi: "TAMBAH_KASBON_MANUAL",
    entitas: "Member",
    entitasId: memberId,
    sesudahJson: {
      pengambil: input.pengambil,
      total: input.total,
      saldoBaru: result.member.saldoUtangCache,
      itemCount: input.items.length,
    },
    ip,
  });

  return result;
}

// 8. Edit Kasbon Manual dengan Rincian (Memerlukan Otorisasi PIN Pemilik)
export async function editKasbonManual(
  memberId: string,
  mutasiId: string,
  input: {
    tanggal?: string;
    pengambil: string;
    catatan?: string;
    items: Array<{
      nama: string;
      qty: number;
      satuan: string;
      harga: number;
      subtotal: number;
    }>;
    total: number;
  },
  actor: { id: string; role: string; nama?: string },
  ip?: string
) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member tidak ditemukan");

  const oldMutasi = await prisma.kasbonMutasi.findUnique({
    where: { id: mutasiId },
  });
  if (!oldMutasi || oldMutasi.memberId !== memberId) {
    throw new Error("Data kasbon tidak ditemukan");
  }

  const oldTotal = oldMutasi.jumlah;
  const newTotal = input.total;
  const selisih = newTotal - oldTotal;

  // Cek batas limit kasbon jika ada kenaikan utang (default limit 1.000.000)
  const limit = member.batasKasbon > 0 ? member.batasKasbon : 1000000;
  if (selisih > 0 && (member.saldoUtangCache + selisih) > limit) {
    throw new Error(
      `Perubahan kasbon sebesar Rp ${newTotal.toLocaleString("id-ID")} melebihi batas limit kasbon member (Sisa Limit: Rp ${Math.max(0, limit - member.saldoUtangCache).toLocaleString("id-ID")}).`
    );
  }

  const tanggalCatat = input.tanggal ? new Date(input.tanggal) : oldMutasi.dibuatPada;
  let existingKodeBon: string | undefined;
  if (oldMutasi.catatan?.includes("|| JSON:")) {
    try {
      const parsedOld = JSON.parse(oldMutasi.catatan.split("|| JSON:")[1]);
      existingKodeBon = parsedOld?.kodeBon;
    } catch {}
  }
  const kodeBon = existingKodeBon || formatBonCode(tanggalCatat, 1);

  // Format catatan lengkap dengan JSON rincian barang & pengambil
  const dataCatatan = {
    kodeBon,
    pengambil: input.pengambil,
    kasir: actor.nama || "Kasir",
    tanggal: tanggalCatat.toISOString(),
    keterangan: input.catatan || "",
    items: input.items,
    total: input.total,
  };

  const ringkasanText = input.items
    .map((it) => `${it.nama} (${it.qty} ${it.satuan})`)
    .join(", ");

  const catatanFormatted = `BON MANUAL [Ambil: ${input.pengambil}] [Kasir: ${actor.nama || "Kasir"}] - ${ringkasanText} || JSON:${JSON.stringify(dataCatatan)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update Mutasi KASBON
    const updatedMutasi = await tx.kasbonMutasi.update({
      where: { id: mutasiId },
      data: {
        jumlah: newTotal,
        catatan: catatanFormatted,
        dibuatPada: tanggalCatat,
      },
      include: {
        user: { select: { nama: true } },
      },
    });

    // 2. Sesuaikan saldo utang cache dengan selisih nominal baru vs lama
    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: {
        saldoUtangCache: { increment: selisih },
      },
    });

    return { mutasi: updatedMutasi, member: updatedMember };
  });

  await logActivity({
    userId: actor.id,
    role: actor.role,
    aksi: "EDIT_KASBON_MANUAL",
    entitas: "KasbonMutasi",
    entitasId: mutasiId,
    sebelumJson: { totalLama: oldTotal, catatanLama: oldMutasi.catatan },
    sesudahJson: {
      pengambil: input.pengambil,
      totalBaru: newTotal,
      selisih,
      saldoBaru: result.member.saldoUtangCache,
      itemCount: input.items.length,
    },
    ip,
  });

  return result;
}


