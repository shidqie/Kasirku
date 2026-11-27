import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { verifyOwnerPin } from "./pin.service";
import { getSettings } from "./settings.service";
import { Prisma, Pembulatan, MetodePembayaran } from "@prisma/client";
import { generateUUID } from "@/lib/formatters";

export interface CheckoutItemInput {
  produkId: string;
  satuanProdukId: string;
  nama?: string;
  harga?: number;
  qty: number;
  subtotal?: number;
}

export interface CheckoutInput {
  idempotencyKey: string;
  memberId?: string | null;
  items: CheckoutItemInput[];
  diskon: number;
  metodePembayaran: MetodePembayaran;
  uangDiterima?: number;
  pinOwner?: string;
}

export function hitungPembulatan(subtotalSetelahDiskon: number, aturan: Pembulatan): number {
  if (aturan === "BULAT_100") {
    const sisa = subtotalSetelahDiskon % 100;
    if (sisa === 0) return 0;
    return sisa >= 50 ? 100 - sisa : -sisa;
  }
  if (aturan === "BULAT_500") {
    const sisa = subtotalSetelahDiskon % 500;
    if (sisa === 0) return 0;
    return sisa >= 250 ? 500 - sisa : -sisa;
  }
  return 0; // BULAT_0
}

async function generateReceiptNumber(tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const seq = await tx.receiptSequence.upsert({
    where: { tanggal: dateStr },
    update: { counter: { increment: 1 } },
    create: { tanggal: dateStr, counter: 1 },
  });

  const padded = String(seq.counter).padStart(4, "0");
  return `TR-${dateStr}-${padded}`;
}

export async function checkout(
  input: CheckoutInput,
  kasir: { id: string; role: string },
  ip?: string
) {
  const idempotencyKey = input.idempotencyKey || generateUUID();

  // 1. User Story C8: Idempotency Check
  const existing = await prisma.transaksi.findUnique({
    where: { idempotencyKey },
    include: {
      items: true,
      pembayaran: true,
      member: true,
      kasir: { select: { nama: true, username: true } },
    },
  });

  if (existing) {
    return { transaksi: existing, isDuplicate: true };
  }

  const settings = await getSettings();

  const diskon = input.diskon || 0;

  // 2. Validasi Diskon Staff dengan PIN Owner (Asumsi default #3)
  if (diskon > settings.batasDiskonStaff && kasir.role === "STAFF") {
    if (!input.pinOwner) {
      throw new Error(
        `Diskon Rp ${diskon} melebihi batas staff (Rp ${settings.batasDiskonStaff}). Memerlukan PIN Pemilik Toko.`
      );
    }
    const pinCheck = await verifyOwnerPin(input.pinOwner, kasir.id, ip);
    if (!pinCheck.valid) {
      throw new Error(pinCheck.message || "PIN Owner salah");
    }
  }

  // 3. Ambil data produk & satuan untuk verifikasi harga dan stok
  const productIds = input.items.map((i) => i.produkId);
  const products = await prisma.produk.findMany({
    where: { id: { in: productIds } },
    include: { satuanProduk: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validasi keberadaan produk, ketersediaan stok, dan hitung subtotal
  let subtotalKotor = 0;
  const preparedItems: {
    produkId: string;
    namaSnapshot: string;
    satuanSnapshot: string;
    faktorKeDasarSnapshot: Prisma.Decimal;
    qty: Prisma.Decimal;
    qtyDasar: Prisma.Decimal;
    hargaJualSnapshot: number;
    hargaBeliSnapshot: number;
    subtotal: number;
  }[] = [];

  const priceDiscrepancies: {
    produkId: string;
    nama: string;
    hargaKlien: number;
    hargaServer: number;
  }[] = [];

  for (const item of input.items) {
    const p = productMap.get(item.produkId);
    if (!p) throw new Error(`Produk dengan ID ${item.produkId} tidak ditemukan`);
    if (!p.aktif) throw new Error(`Produk "${p.nama}" sudah tidak aktif`);

    const s = p.satuanProduk.find((sat) => sat.id === item.satuanProdukId);
    if (!s) throw new Error(`Satuan tidak valid untuk produk "${p.nama}"`);

    const qtyDecimal = new Prisma.Decimal(item.qty);
    const faktorDecimal = s.faktorKeDasar;
    const qtyDasar = qtyDecimal.mul(faktorDecimal);

    // User Story C7: Peringatan jika stok tidak cukup
    const stokTersedia = Number(p.stokCache);
    const stokDibutuhkan = Number(qtyDasar);
    if (!settings.bolehJualStokNol && stokTersedia < stokDibutuhkan) {
      throw new Error(
        `Stok produk "${p.nama}" tidak mencukupi (Tersedia: ${stokTersedia} ${p.satuanDasar}, Dibutuhkan: ${stokDibutuhkan} ${p.satuanDasar})`
      );
    }

    const hargaSnapshot =
      typeof item.harga === "number" && Number.isFinite(item.harga)
        ? Math.round(item.harga)
        : s.hargaJual;

    if (hargaSnapshot !== s.hargaJual) {
      priceDiscrepancies.push({
        produkId: p.id,
        nama: p.nama,
        hargaKlien: hargaSnapshot,
        hargaServer: s.hargaJual,
      });
    }

    const itemSubtotal = Math.round(item.qty * hargaSnapshot);
    subtotalKotor += itemSubtotal;

    preparedItems.push({
      produkId: p.id,
      namaSnapshot: item.nama?.trim() || p.nama,
      satuanSnapshot: s.namaSatuan,
      faktorKeDasarSnapshot: faktorDecimal,
      qty: qtyDecimal,
      qtyDasar,
      hargaJualSnapshot: hargaSnapshot,
      hargaBeliSnapshot: s.hargaBeli,
      subtotal: itemSubtotal,
    });
  }

  const subtotalSetelahDiskon = Math.max(0, subtotalKotor - diskon);
  const pembulatan = hitungPembulatan(subtotalSetelahDiskon, settings.pembulatan);
  const totalAkhir = subtotalSetelahDiskon + pembulatan;

  // 4. Validasi Pembayaran
  let kembalian = 0;
  if (input.metodePembayaran === "TUNAI") {
    const uang = input.uangDiterima || 0;
    if (uang < totalAkhir) {
      throw new Error(`Uang diterima (${uang}) kurang dari total belanja (${totalAkhir})`);
    }
    kembalian = uang - totalAkhir;
  }

  // Validasi Kasbon
  let memberData: any = null;
  if (input.metodePembayaran === "KASBON") {
    if (!input.memberId) {
      throw new Error("Metode Kasbon wajib memilih Member terdaftar");
    }
    memberData = await prisma.member.findUnique({
      where: { id: input.memberId },
    });
    if (!memberData || !memberData.aktif) {
      throw new Error("Member tidak ditemukan atau tidak aktif");
    }

    // User Story D2: Batas kasbon (default limit 1.000.000 jika belum diatur)
    const limitKasbon = memberData.batasKasbon > 0 ? memberData.batasKasbon : 1000000;
    const totalUtangSetelahnya = memberData.saldoUtangCache + totalAkhir;
    if (totalUtangSetelahnya > limitKasbon) {
      const sisaLimit = Math.max(0, limitKasbon - memberData.saldoUtangCache);
      throw new Error(
        `Transaksi ditolak! Total utang (Rp ${totalUtangSetelahnya.toLocaleString("id-ID")}) melebihi batas kasbon member (Rp ${limitKasbon.toLocaleString("id-ID")}). Sisa limit: Rp ${sisaLimit.toLocaleString("id-ID")}`
      );
    }
  }

  // 5. ATOMIC CHECKOUT TRANSACTION (Prinsip 5.2 #6)
  const resultTransaksi = await prisma.$transaction(async (tx) => {
    const nomorStruk = await generateReceiptNumber(tx);

    // A. Simpan Transaksi
    const trx = await tx.transaksi.create({
      data: {
        nomorStruk,
        idempotencyKey,
        kasirId: kasir.id,
        memberId: input.memberId || null,
        subtotal: subtotalKotor,
        diskon,
        pembulatan,
        total: totalAkhir,
        status: "SELESAI",
      },
    });

    // B. Simpan Items Snapshot
    await tx.transaksiItem.createMany({
      data: preparedItems.map((item) => ({
        transaksiId: trx.id,
        ...item,
      })),
    });

    // C. Simpan Pembayaran
    await tx.pembayaran.create({
      data: {
        transaksiId: trx.id,
        metode: input.metodePembayaran,
        jumlah: totalAkhir,
        uangDiterima: input.metodePembayaran === "TUNAI" ? input.uangDiterima : totalAkhir,
        kembalian: input.metodePembayaran === "TUNAI" ? kembalian : 0,
      },
    });

    // D. Simpan Stok Mutasi (Tipe JUAL) & Update Stok Cache
    for (const item of preparedItems) {
      const negativeQtyDasar = item.qtyDasar.negated();

      await tx.stokMutasi.create({
        data: {
          produkId: item.produkId,
          tipe: "JUAL",
          qtyDasar: negativeQtyDasar,
          refTipe: "TRANSAKSI",
          refId: trx.id,
          userId: kasir.id,
          catatan: `Penjualan Struk ${nomorStruk}`,
        },
      });

      await tx.produk.update({
        where: { id: item.produkId },
        data: {
          stokCache: { increment: negativeQtyDasar },
        },
      });
    }

    // E. Jika KASBON: Tulis Mutasi Kasbon & Update Cache Utang
    if (input.metodePembayaran === "KASBON" && input.memberId) {
      await tx.kasbonMutasi.create({
        data: {
          memberId: input.memberId,
          tipe: "KASBON",
          jumlah: totalAkhir, // (+) menambah utang
          transaksiId: trx.id,
          userId: kasir.id,
          catatan: `Kasbon Belanja Struk ${nomorStruk}`,
        },
      });

      await tx.member.update({
        where: { id: input.memberId },
        data: {
          saldoUtangCache: { increment: totalAkhir },
        },
      });
    }

    return tx.transaksi.findUnique({
      where: { id: trx.id },
      include: {
        items: true,
        pembayaran: true,
        member: true,
        kasir: { select: { nama: true, username: true } },
      },
    });
  });

  await logActivity({
    userId: kasir.id,
    role: kasir.role,
    aksi: "CHECKOUT_TRANSAKSI",
    entitas: "Transaksi",
    entitasId: resultTransaksi?.id,
    sesudahJson: {
      nomorStruk: resultTransaksi?.nomorStruk,
      total: totalAkhir,
      metode: input.metodePembayaran,
      ...(priceDiscrepancies.length > 0 ? { priceDiscrepancies } : {}),
    },
    ip,
  });

  if (priceDiscrepancies.length > 0) {
    await logActivity({
      userId: kasir.id,
      role: kasir.role,
      aksi: "PERBEDAAN_HARGA_SYNC_OFFLINE",
      entitas: "Transaksi",
      entitasId: resultTransaksi?.id,
      sesudahJson: {
        nomorStruk: resultTransaksi?.nomorStruk,
        priceDiscrepancies,
      },
      ip,
    });
  }

  return { transaksi: resultTransaksi, isDuplicate: false };
}

// 6. User Story C6: Pembatalan Transaksi (Void) Non-Destruktif
export async function voidTransaction(
  transactionId: string,
  alasan: string,
  actor: { id: string; role: string },
  pinOwner?: string,
  ip?: string
) {
  const trx = await prisma.transaksi.findUnique({
    where: { id: transactionId },
    include: {
      items: true,
      pembayaran: true,
      kasbonMutasi: true,
    },
  });

  if (!trx) throw new Error("Transaksi tidak ditemukan");
  if (trx.status === "BATAL") throw new Error("Transaksi sudah dibatalkan sebelumnya");

  // Jika Staff yang melakukan pembatalan, wajib verifikasi PIN Owner (Prinsip 5.2 #11)
  if (actor.role === "STAFF") {
    if (!pinOwner) {
      throw new Error("Pembatalan transaksi oleh staff memerlukan PIN Pemilik Toko");
    }
    const pinVerification = await verifyOwnerPin(pinOwner, actor.id, ip);
    if (!pinVerification.valid) {
      throw new Error(pinVerification.message || "PIN Pemilik salah");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Ubah status transaksi jadi BATAL (Data tidak dihapus - Prinsip 5.2 #9)
    const updatedTrx = await tx.transaksi.update({
      where: { id: transactionId },
      data: {
        status: "BATAL",
        alasanBatal: alasan,
        dibatalkanOlehId: actor.id,
        dibatalkanPada: new Date(),
      },
    });

    // 2. Kembalikan stok lewat mutasi lawan (BATAL_JUAL)
    for (const item of trx.items) {
      const positiveQtyDasar = item.qtyDasar; // (+) mengembalikan kuantitas

      await tx.stokMutasi.create({
        data: {
          produkId: item.produkId,
          tipe: "BATAL_JUAL",
          qtyDasar: positiveQtyDasar,
          refTipe: "TRANSAKSI_BATAL",
          refId: trx.id,
          userId: actor.id,
          catatan: `Pembatalan Struk ${trx.nomorStruk}: ${alasan}`,
        },
      });

      await tx.produk.update({
        where: { id: item.produkId },
        data: {
          stokCache: { increment: positiveQtyDasar },
        },
      });
    }

    // 3. Jika transaksi Kasbon, balik utang lewat mutasi PEMBALIKAN
    if (trx.memberId && trx.kasbonMutasi.length > 0) {
      const mutasiKasbonAwal = trx.kasbonMutasi.find((k) => k.tipe === "KASBON");
      const jumlahUtang = mutasiKasbonAwal ? mutasiKasbonAwal.jumlah : trx.total;

      await tx.kasbonMutasi.create({
        data: {
          memberId: trx.memberId,
          tipe: "PEMBALIKAN",
          jumlah: -jumlahUtang, // (-) mengurangi saldo utang
          transaksiId: trx.id,
          userId: actor.id,
          catatan: `Pembalikan Kasbon Struk Batal ${trx.nomorStruk}`,
        },
      });

      await tx.member.update({
        where: { id: trx.memberId },
        data: {
          saldoUtangCache: { decrement: jumlahUtang },
        },
      });
    }

    return updatedTrx;
  });

  await logActivity({
    userId: actor.id,
    role: actor.role,
    aksi: "VOID_TRANSAKSI",
    entitas: "Transaksi",
    entitasId: transactionId,
    sesudahJson: {
      nomorStruk: trx.nomorStruk,
      alasan,
      totalDibatalkan: trx.total,
    },
    ip,
  });

  return result;
}

export async function getTransactions(params?: {
  search?: string;
  status?: "SELESAI" | "BATAL";
  startDate?: string;
  endDate?: string;
}) {
  const where: Prisma.TransaksiWhereInput = {};

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { nomorStruk: { contains: q, mode: "insensitive" } },
      { member: { nama: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (params?.startDate || params?.endDate) {
    where.dibuatPada = {};
    if (params.startDate) where.dibuatPada.gte = new Date(params.startDate);
    if (params.endDate) where.dibuatPada.lte = new Date(params.endDate);
  }

  return prisma.transaksi.findMany({
    where,
    orderBy: { dibuatPada: "desc" },
    include: {
      items: true,
      pembayaran: true,
      member: { select: { nama: true, telepon: true } },
      kasir: { select: { nama: true, username: true } },
      dibatalkanOleh: { select: { nama: true, username: true } },
    },
    take: 100,
  });
}

export async function getTransactionById(id: string) {
  return prisma.transaksi.findUnique({
    where: { id },
    include: {
      items: true,
      pembayaran: true,
      member: true,
      kasir: { select: { nama: true, username: true } },
      dibatalkanOleh: { select: { nama: true, username: true } },
    },
  });
}
