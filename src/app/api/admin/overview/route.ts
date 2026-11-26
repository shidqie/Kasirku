import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity-log.service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya untuk Super Admin." },
      { status: 403 }
    );
  }

  const [stores, users, logs] = await Promise.all([
    prisma.pengaturanToko.findMany({
      select: {
        id: true,
        namaToko: true,
        alamat: true,
        telepon: true,
        statusLayanan: true,
        paketLangganan: true,
        berlakuHingga: true,
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        tokoId: true,
        aktif: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activityLog.findMany({
      take: 50,
      orderBy: { dibuatPada: "desc" },
      include: {
        user: { select: { nama: true, username: true } },
      },
    }),
  ]);

  return NextResponse.json({ stores, users, logs });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya untuk Super Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { storeId = "default", statusLayanan, paketLangganan, berlakuHingga } = body;

    const updated = await prisma.pengaturanToko.update({
      where: { id: storeId },
      data: {
        ...(statusLayanan ? { statusLayanan } : {}),
        ...(paketLangganan ? { paketLangganan } : {}),
        ...(berlakuHingga !== undefined
          ? { berlakuHingga: berlakuHingga ? new Date(berlakuHingga) : null }
          : {}),
      },
      select: {
        id: true,
        namaToko: true,
        statusLayanan: true,
        paketLangganan: true,
        berlakuHingga: true,
      },
    });

    await logActivity({
      userId: session.userId,
      role: "SUPER_ADMIN",
      aksi: "UPDATE_PLATFORM_LAYANAN",
      entitas: "PengaturanToko",
      entitasId: storeId,
      sesudahJson: updated,
    });

    return NextResponse.json({ message: "Konfigurasi layanan toko diperbarui", store: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui konfigurasi platform" },
      { status: 400 }
    );
  }
}
