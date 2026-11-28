import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface LogActivityParams {
  userId?: string | null;
  role?: string | null;
  aksi: string;
  entitas: string;
  entitasId?: string | null;
  sebelumJson?: Record<string, unknown> | null;
  sesudahJson?: Record<string, unknown> | null;
  ip?: string | null;
}

export async function logActivity(params: LogActivityParams) {
  try {
    let validUserId: string | null = null;
    if (params.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    return await prisma.activityLog.create({
      data: {
        userId: validUserId,
        role: params.role ?? null,
        aksi: params.aksi,
        entitas: params.entitas,
        entitasId: params.entitasId ?? null,
        sebelumJson: (params.sebelumJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        sesudahJson: (params.sesudahJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    console.error("Gagal mencatat activity log:", error);
    return null;
  }
}

export type ActivityLogKategori =
  | "semua"
  | "login"
  | "produk"
  | "transaksi"
  | "stok"
  | "member"
  | "pengaturan";

const LOGIN_AKSI = [
  "LOGIN_BERHASIL",
  "LOGIN_GAGAL_PASSWORD",
  "LOGOUT",
  "VERIFIKASI_PIN_BERHASIL",
  "VERIFIKASI_PIN_GAGAL",
  "RESET_PASSWORD_DENGAN_PIN_OWNER",
];

const STOK_AKSI_ON_PRODUK = [
  "PENYESUAIAN_STOK_MANUAL",
  "REKONSILIASI_STOK_SELISIH",
];

function buildKategoriWhere(kategori?: string): Prisma.ActivityLogWhereInput | undefined {
  switch (kategori) {
    case "login":
      return { aksi: { in: LOGIN_AKSI } };
    case "produk":
      return {
        entitas: { in: ["Produk", "Kategori"] },
        aksi: { notIn: STOK_AKSI_ON_PRODUK },
      };
    case "transaksi":
      return { entitas: "Transaksi" };
    case "stok":
      return {
        OR: [
          { entitas: { in: ["BarangMasuk", "StokOpname"] } },
          { aksi: { in: STOK_AKSI_ON_PRODUK } },
        ],
      };
    case "member":
      return {
        entitas: { in: ["Member", "KasbonPembayaran", "KasbonMutasi"] },
      };
    case "pengaturan":
      return {
        OR: [
          { entitas: "PengaturanToko" },
          { entitas: "User", aksi: { notIn: LOGIN_AKSI } },
        ],
      };
    default:
      return undefined;
  }
}

export async function getActivityLogs(params?: {
  limit?: number;
  offset?: number;
  kategori?: string;
  entitas?: string;
  aksi?: string;
  userId?: string;
}) {
  const andConditions: Prisma.ActivityLogWhereInput[] = [];

  const kategoriWhere = buildKategoriWhere(params?.kategori);
  if (kategoriWhere) andConditions.push(kategoriWhere);

  if (params?.entitas) {
    andConditions.push({ entitas: { contains: params.entitas, mode: "insensitive" } });
  }
  if (params?.aksi) {
    andConditions.push({ aksi: { contains: params.aksi, mode: "insensitive" } });
  }
  if (params?.userId) {
    andConditions.push({ userId: params.userId });
  }

  const where: Prisma.ActivityLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { dibuatPada: "desc" },
      take: params?.limit ?? 50,
      skip: params?.offset ?? 0,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
            role: true,
          },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { items, total };
}
