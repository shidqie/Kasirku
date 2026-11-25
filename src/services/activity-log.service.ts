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

export async function getActivityLogs(params?: {
  limit?: number;
  offset?: number;
  entitas?: string;
  aksi?: string;
  userId?: string;
}) {
  const where: Prisma.ActivityLogWhereInput = {};
  if (params?.entitas) where.entitas = params.entitas;
  if (params?.aksi) where.aksi = params.aksi;
  if (params?.userId) where.userId = params.userId;

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
