import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { verifyOwnerPin } from "./pin.service";
import { Prisma } from "@prisma/client";

export interface BarangMasukItemInput {
  produkId: string;
  namaSatuan: string;
  faktorKeDasar: number;
  qty: number;
  hargaBeliPerSatuan: number;
}

export interface BarangMasukInput {
  tanggal?: string | Date;
  catatan?: string | null;
  items: BarangMasukItemInput[];
}

export interface StockAdjustmentInput {
  produkId: string;
  qtyDasar: number; // Nilai positif menambah, negatif mengurangi
  catatan: string;
  pinOwner?: string;
}

/**
 * Generate nomor dokumen berurutan aman race-condition (misal BM-20261120-0001)
 */
async function generateDocNumber(prefix: string, tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // "YYYYMMDD"

  const seq = await tx.receiptSequence.upsert({
    where: { tanggal: dateStr },
    update: { counter: { increment: 1 } },
    create: { tanggal: dateStr, counter: 1 },
  });

  const paddedCounter = String(seq.counter).padStart(4, "0");
  return `${prefix}-${dateStr}-${paddedCounter}`;
}

// 1. User Story E1: Mencatat Barang Masuk
export async function catatBarangMasuk(input: BarangMasukInput, userId: string, ip?: string) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Daftar barang masuk tidak boleh kosong");
  }

  const result = await prisma.$transaction(async (tx) => {
    const nomor = await generateDocNumber("BM", tx);
    const tanggalDoc = input.tanggal ? new Date(input.tanggal) : new Date();

    // 1. Buat header barang masuk
    const bm = await tx.barangMasuk.create({
      data: {
        nomor,
        tanggal: tanggalDoc,
        userId,
        catatan: input.catatan || null,
      },
    });

    // 2. Loop setiap item barang masuk
    const createdItems = [];
    for (const item of input.items) {
      const qtyDecimal = new Prisma.Decimal(item.qty);
      const faktorDecimal = new Prisma.Decimal(item.faktorKeDasar);
      const qtyDasar = qtyDecimal.mul(faktorDecimal); // qty x faktor_ke_dasar
      const subtotal = Math.round(item.qty * item.hargaBeliPerSatuan);

      // Simpan item
      const bmi = await tx.barangMasukItem.create({
        data: {
          barangMasukId: bm.id,
          produkId: item.produkId,
          namaSatuan: item.namaSatuan,
          faktorKeDasar: faktorDecimal,
          qty: qtyDecimal,
          qtyDasar,
          hargaBeliPerSatuan: item.hargaBeliPerSatuan,
          subtotal,
        },
      });
      createdItems.push(bmi);

      // Tulis stok_mutasi (Prinsip 5.2 #5: Ledger Append-Only)
      await tx.stokMutasi.create({
        data: {
          produkId: item.produkId,
          tipe: "MASUK",
          qtyDasar,
          refTipe: "BARANG_MASUK",
          refId: bm.id,
          userId,
          catatan: `Barang Masuk No: ${nomor} (${item.qty} ${item.namaSatuan})`,
        },
      });

      // Update cache stok di tabel produk dalam transaksi yang sama
      await tx.produk.update({
        where: { id: item.produkId },
        data: {
          stokCache: { increment: qtyDasar },
        },
      });

      // Update juga harga beli di satuan produk jika berubah
      await tx.satuanProduk.updateMany({
        where: {
          produkId: item.produkId,
          namaSatuan: item.namaSatuan,
        },
        data: {
          hargaBeli: item.hargaBeliPerSatuan,
        },
      });
    }

    return { bm, items: createdItems };
  });

  await logActivity({
    userId,
    role: "SYSTEM",
    aksi: "BARANG_MASUK",
    entitas: "BarangMasuk",
    entitasId: result.bm.id,
    sesudahJson: {
      nomor: result.bm.nomor,
      totalItem: input.items.length,
    },
    ip,
  });

  return result;
}

// 2. User Story A3 & E2: Penyesuaian Stok Manual (Staff butuh PIN Owner)
export async function adjustStockManual(
  input: StockAdjustmentInput,
  user: { id: string; role: string },
  ip?: string
) {
  if (input.qtyDasar === 0) {
    throw new Error("Jumlah penyesuaian tidak boleh 0");
  }

  // Jika dilakukan oleh Staff, validasi PIN Owner
  if (user.role === "STAFF") {
    if (!input.pinOwner) {
      throw new Error("Penyesuaian stok oleh staff memerlukan PIN Pemilik Toko");
    }
    const pinVerification = await verifyOwnerPin(input.pinOwner, user.id, ip);
    if (!pinVerification.valid) {
      throw new Error(pinVerification.message || "PIN Owner salah");
    }
  }

  const produk = await prisma.produk.findUnique({
    where: { id: input.produkId },
  });
  if (!produk) throw new Error("Produk tidak ditemukan");

  const qtyDasarDecimal = new Prisma.Decimal(input.qtyDasar);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Tulis stok mutasi append-only
    const mutasi = await tx.stokMutasi.create({
      data: {
        produkId: input.produkId,
        tipe: "PENYESUAIAN",
        qtyDasar: qtyDasarDecimal,
        refTipe: "PENYESUAIAN_MANUAL",
        userId: user.id,
        catatan: input.catatan,
      },
    });

    // 2. Update cache stok
    const updatedProduk = await tx.produk.update({
      where: { id: input.produkId },
      data: {
        stokCache: { increment: qtyDasarDecimal },
      },
    });

    return { mutasi, produk: updatedProduk };
  });

  await logActivity({
    userId: user.id,
    role: user.role,
    aksi: "PENYESUAIAN_STOK_MANUAL",
    entitas: "Produk",
    entitasId: input.produkId,
    sebelumJson: { stokCache: Number(produk.stokCache) },
    sesudahJson: {
      penyesuaian: input.qtyDasar,
      stokBaru: Number(result.produk.stokCache),
      catatan: input.catatan,
    },
    ip,
  });

  return result;
}

// 3. Rekonsiliasi Stok Cache vs SUM Mutasi (Prinsip 5.2 #5)
export async function reconcileStock(productId: string, userId?: string, ip?: string) {
  const produk = await prisma.produk.findUnique({
    where: { id: productId },
  });
  if (!produk) throw new Error("Produk tidak ditemukan");

  // Hitung SUM(qty_dasar) dari mutasi
  const sumResult = await prisma.stokMutasi.aggregate({
    where: { produkId: productId },
    _sum: { qtyDasar: true },
  });

  const realStock = sumResult._sum.qtyDasar || new Prisma.Decimal(0);
  const cacheStock = produk.stokCache;
  const isMatch = realStock.equals(cacheStock);

  if (!isMatch) {
    // Pulihkan cache ke nilai SUM mutasi murni
    await prisma.produk.update({
      where: { id: productId },
      data: { stokCache: realStock },
    });

    await logActivity({
      userId,
      role: "SYSTEM",
      aksi: "REKONSILIASI_STOK_SELISIH",
      entitas: "Produk",
      entitasId: productId,
      sebelumJson: { stokCache: Number(cacheStock) },
      sesudahJson: { stokBaru: Number(realStock) },
      ip,
    });
  }

  return {
    productId,
    namaProduk: produk.nama,
    satuanDasar: produk.satuanDasar,
    stokCacheLama: Number(cacheStock),
    stokMutasiNyata: Number(realStock),
    selisihDitemukan: !isMatch,
  };
}

// 4. User Story E4: Perlu Belanja & Status Warna
export async function getLowStockProducts() {
  const products = await prisma.produk.findMany({
    where: { aktif: true },
    include: {
      kategori: true,
      satuanProduk: {
        where: { isDefault: true },
      },
    },
  });

  // Filter produk dengan stok <= stokMinimum
  const lowProducts = [];
  for (const p of products) {
    const stok = Number(p.stokCache);
    const min = Number(p.stokMinimum);

    if (stok <= min) {
      const isHabis = stok <= 0;
      // Rekomendasi beli: selisih untuk mencapai 2x stok minimum (minimal 1)
      const saranBeli = Math.max(1, Math.ceil(min * 2 - stok));
      const defaultUnit = p.satuanProduk[0];

      lowProducts.push({
        id: p.id,
        nama: p.nama,
        kategori: p.kategori?.nama || "Umum",
        barcode: p.barcode,
        satuanDasar: p.satuanDasar,
        stokSaatIni: stok,
        stokMinimum: min,
        saranBeli,
        status: isHabis ? ("HABIS" as const) : ("MENIPIS" as const),
        warna: isHabis ? ("red" as const) : ("yellow" as const),
        hargaBeliDefault: defaultUnit?.hargaBeli || 0,
        namaSatuanDefault: defaultUnit?.namaSatuan || p.satuanDasar,
      });
    }
  }

  // Urutkan yang habis (merah) terlebih dahulu, lalu yang menipis
  return lowProducts.sort((a) => (a.status === "HABIS" ? -1 : 1));
}

export async function getLowStockCount() {
  const lowList = await getLowStockProducts();
  return {
    total: lowList.length,
    habis: lowList.filter((p) => p.status === "HABIS").length,
    menipis: lowList.filter((p) => p.status === "MENIPIS").length,
  };
}

// 5. Riwayat Mutasi Stok per Produk (Kartu Stok)
export async function getStockMutations(productId: string) {
  return prisma.stokMutasi.findMany({
    where: { produkId: productId },
    orderBy: { dibuatPada: "desc" },
    include: {
      user: {
        select: { nama: true, username: true },
      },
    },
    take: 100,
  });
}

