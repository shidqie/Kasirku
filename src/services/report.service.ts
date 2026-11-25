import { prisma } from "@/lib/db";
import { getLowStockCount } from "./stock.service";
import { getSettings } from "./settings.service";
import { Prisma } from "@prisma/client";

// 1. User Story F1: Laporan Penjualan Harian & Bulanan
export async function getSalesReport(params?: { startDate?: string; endDate?: string }) {
  const where: Prisma.TransaksiWhereInput = {
    status: "SELESAI",
  };

  if (params?.startDate || params?.endDate) {
    where.dibuatPada = {};
    if (params.startDate) where.dibuatPada.gte = new Date(params.startDate);
    if (params.endDate) where.dibuatPada.lte = new Date(params.endDate);
  }

  const transactions = await prisma.transaksi.findMany({
    where,
    include: {
      pembayaran: true,
      kasir: { select: { id: true, nama: true, username: true } },
    },
    orderBy: { dibuatPada: "desc" },
  });

  const totalOmzet = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalDiskon = transactions.reduce((sum, t) => sum + t.diskon, 0);
  const totalTransaksi = transactions.length;

  // Breakdown per Metode Bayar (TUNAI, TRANSFER, KASBON)
  const perMetode: { [metode: string]: { total: number; count: number } } = {
    TUNAI: { total: 0, count: 0 },
    TRANSFER: { total: 0, count: 0 },
    KASBON: { total: 0, count: 0 },
  };

  // Breakdown per Kasir
  const perKasirMap = new Map<string, { nama: string; username: string; total: number; count: number }>();

  for (const t of transactions) {
    const bayar = t.pembayaran[0];
    const metode = bayar?.metode || "TUNAI";
    if (!perMetode[metode]) perMetode[metode] = { total: 0, count: 0 };
    perMetode[metode].total += t.total;
    perMetode[metode].count += 1;

    const kasirId = t.kasir.id;
    const existingKasir = perKasirMap.get(kasirId) || {
      nama: t.kasir.nama,
      username: t.kasir.username,
      total: 0,
      count: 0,
    };
    existingKasir.total += t.total;
    existingKasir.count += 1;
    perKasirMap.set(kasirId, existingKasir);
  }

  return {
    totalOmzet,
    totalDiskon,
    totalTransaksi,
    perMetode,
    perKasir: Array.from(perKasirMap.values()),
    transactions,
  };
}

// 2. User Story F2: Laporan Laba Kotor dari Snapshot
export async function getProfitReport(params?: { startDate?: string; endDate?: string }) {
  const where: Prisma.TransaksiWhereInput = {
    status: "SELESAI",
  };

  if (params?.startDate || params?.endDate) {
    where.dibuatPada = {};
    if (params.startDate) where.dibuatPada.gte = new Date(params.startDate);
    if (params.endDate) where.dibuatPada.lte = new Date(params.endDate);
  }

  const transactions = await prisma.transaksi.findMany({
    where,
    include: { items: true },
    orderBy: { dibuatPada: "desc" },
  });

  let totalPenjualanKotor = 0;
  let totalHPP = 0;
  let totalDiskon = 0;

  for (const t of transactions) {
    totalDiskon += t.diskon;
    for (const it of t.items) {
      totalPenjualanKotor += it.subtotal;
      // HPP = qty x hargaBeliSnapshot
      const hppItem = Math.round(Number(it.qty) * it.hargaBeliSnapshot);
      totalHPP += hppItem;
    }
  }

  const labaKotor = Math.max(0, totalPenjualanKotor - totalHPP - totalDiskon);
  const marginPersen = totalPenjualanKotor > 0 ? (labaKotor / totalPenjualanKotor) * 100 : 0;

  return {
    totalPenjualanKotor,
    totalHPP,
    totalDiskon,
    labaKotor,
    marginPersen: Math.round(marginPersen * 10) / 10,
    totalTransaksi: transactions.length,
  };
}

// 3. User Story F3: Total Utang Member (Urut Terbesar)
export async function getDebtReport(_params?: { startDate?: string; endDate?: string }) {
  const members = await prisma.member.findMany({
    where: { saldoUtangCache: { gt: 0 } },
    orderBy: { saldoUtangCache: "desc" },
  });

  const settings = await getSettings();
  const now = Date.now();

  const membersWithAge = await Promise.all(
    members.map(async (m) => {
      const oldestDebt = await prisma.kasbonMutasi.findFirst({
        where: { memberId: m.id, tipe: { in: ["KASBON", "SALDO_AWAL"] } },
        orderBy: { dibuatPada: "asc" },
      });

      const daysOld = oldestDebt
        ? Math.floor((now - oldestDebt.dibuatPada.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      return {
        ...m,
        daysOld,
        isOverdue: daysOld >= settings.ambangUtangLamaHari,
      };
    })
  );

  const totalPiutang = members.reduce((sum, m) => sum + m.saldoUtangCache, 0);

  // Riwayat mutasi kasbon (200 terakhir) beserta info member
  const riwayatMutasi = await prisma.kasbonMutasi.findMany({
    orderBy: { dibuatPada: "desc" },
    take: 200,
    include: {
      member: { select: { id: true, nama: true } },
    },
  });

  return {
    totalPiutang,
    totalMemberUtang: members.length,
    members: membersWithAge,
    riwayatMutasi,
  };
}

// 4. User Story F5: Rekap Pembatalan (Void)
export async function getVoidReport(params?: { startDate?: string; endDate?: string }) {
  const where: Prisma.TransaksiWhereInput = {
    status: "BATAL",
  };

  if (params?.startDate || params?.endDate) {
    where.dibatalkanPada = {};
    if (params.startDate) where.dibatalkanPada.gte = new Date(params.startDate);
    if (params.endDate) where.dibatalkanPada.lte = new Date(params.endDate);
  }

  const voids = await prisma.transaksi.findMany({
    where,
    orderBy: { dibatalkanPada: "desc" },
    include: {
      kasir: { select: { nama: true, username: true } },
      dibatalkanOleh: { select: { nama: true, username: true } },
      items: true,
    },
  });

  const totalBatal = voids.reduce((sum, v) => sum + v.total, 0);

  return {
    totalBatal,
    count: voids.length,
    voids,
  };
}

// 5. Dashboard Summary KPI
export async function getDashboardSummary() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayTrx, monthTrx, debtData, lowStock, recentTrx, topSoldRaw] = await Promise.all([
    prisma.transaksi.findMany({
      where: { status: "SELESAI", dibuatPada: { gte: startOfDay } },
      include: { pembayaran: true },
    }),
    prisma.transaksi.findMany({
      where: { status: "SELESAI", dibuatPada: { gte: startOfMonth } },
      include: { items: true },
    }),
    getDebtReport(),
    getLowStockCount(),
    prisma.transaksi.findMany({
      orderBy: { dibuatPada: "desc" },
      take: 6,
      include: {
        kasir: { select: { nama: true } },
        member: { select: { nama: true } },
        pembayaran: true,
      },
    }),
    prisma.transaksiItem.groupBy({
      by: ["produkId"],
      where: {
        transaksi: { status: "SELESAI" },
      },
      _sum: {
        qtyDasar: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          qtyDasar: "desc",
        },
      },
      take: 6,
    }),
  ]);

  const omzetHariIni = todayTrx.reduce((sum, t) => sum + t.total, 0);
  const omzetBulanIni = monthTrx.reduce((sum, t) => sum + t.total, 0);

  // Breakdown pendapatan hari ini per metode bayar
  const pendapatanPerMetode: Record<string, number> = { TUNAI: 0, QRIS: 0, TRANSFER: 0, KASBON: 0 };
  for (const t of todayTrx) {
    const metode = (t.pembayaran as any[])?.[0]?.metode || "TUNAI";
    if (pendapatanPerMetode[metode] !== undefined) {
      pendapatanPerMetode[metode] += t.total;
    } else {
      pendapatanPerMetode["TUNAI"] += t.total;
    }
  }

  let hppBulanIni = 0;
  let diskonBulanIni = 0;
  for (const t of monthTrx) {
    diskonBulanIni += t.diskon;
    for (const it of t.items) {
      hppBulanIni += Math.round(Number(it.qty) * it.hargaBeliSnapshot);
    }
  }
  const labaBulanIni = Math.max(0, omzetBulanIni - hppBulanIni - diskonBulanIni);

  // Ambil detail nama, satuan, dan kategori untuk produk terlaris
  const productIds = topSoldRaw.map((p) => p.produkId);
  const products = productIds.length > 0
    ? await prisma.produk.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          nama: true,
          satuanDasar: true,
          kategori: { select: { nama: true } },
        },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProducts = topSoldRaw.map((item, idx) => {
    const prod = productMap.get(item.produkId);
    return {
      rank: idx + 1,
      id: item.produkId,
      nama: prod?.nama || "Produk",
      satuan: prod?.satuanDasar || "Pcs",
      kategori: prod?.kategori?.nama || "Umum",
      totalQty: Number(item._sum.qtyDasar || 0),
      totalRevenue: Number(item._sum.subtotal || 0),
    };
  });

  return {
    omzetHariIni,
    transaksiHariIni: todayTrx.length,
    omzetBulanIni,
    transaksiBulanIni: monthTrx.length,
    labaBulanIni,
    totalPiutangKasbon: debtData.totalPiutang,
    memberUtangCount: debtData.totalMemberUtang,
    lowStockCount: lowStock.total,
    habisCount: lowStock.habis,
    pendapatanPerMetode,
    recentTrx,
    topDebtors: debtData.members.slice(0, 5),
    topProducts,
  };
}

// 5. Laporan Produk Terlaris Lengkap
export async function getTopProductsReport(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const trxWhere: Prisma.TransaksiWhereInput = {
    status: "SELESAI",
  };

  if (params?.startDate || params?.endDate) {
    trxWhere.dibuatPada = {};
    if (params.startDate) {
      const start = new Date(params.startDate);
      start.setHours(0, 0, 0, 0);
      trxWhere.dibuatPada.gte = start;
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      trxWhere.dibuatPada.lte = end;
    }
  }

  const grouped = await prisma.transaksiItem.groupBy({
    by: ["produkId"],
    where: { transaksi: trxWhere },
    _sum: {
      qtyDasar: true,
      subtotal: true,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _sum: {
        qtyDasar: "desc",
      },
    },
  });

  const productIds = grouped.map((g) => g.produkId);
  const products =
    productIds.length > 0
      ? await prisma.produk.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            nama: true,
            satuanDasar: true,
            stokCache: true,
            kategori: { select: { id: true, nama: true } },
          },
        })
      : [];

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalRevenueAll = grouped.reduce(
    (sum, g) => sum + Number(g._sum.subtotal || 0),
    0
  );
  const totalQtyAll = grouped.reduce(
    (sum, g) => sum + Number(g._sum.qtyDasar || 0),
    0
  );

  const items = grouped.map((g, idx) => {
    const prod = productMap.get(g.produkId);
    const totalQty = Number(g._sum.qtyDasar || 0);
    const totalRevenue = Number(g._sum.subtotal || 0);
    const sharePercent =
      totalRevenueAll > 0 ? (totalRevenue / totalRevenueAll) * 100 : 0;

    return {
      rank: idx + 1,
      id: g.produkId,
      nama: prod?.nama || "Produk",
      satuan: prod?.satuanDasar || "Pcs",
      kategoriId: prod?.kategori?.id || "",
      kategori: prod?.kategori?.nama || "Umum",
      stokSaatIni: Number(prod?.stokCache || 0),
      jumlahTransaksi: g._count._all,
      totalQty,
      totalRevenue,
      sharePercent,
    };
  });

  return {
    items,
    summary: {
      totalProduk: items.length,
      totalQtyAll,
      totalRevenueAll,
      topProduct: items[0] || null,
    },
  };
}

