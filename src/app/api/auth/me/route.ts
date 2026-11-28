import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { resolvePermissions } from "@/lib/auth/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, permissions: true, nama: true, aktif: true },
  });

  if (!dbUser || !dbUser.aktif) {
    return NextResponse.json({ error: "Akun tidak aktif atau tidak ditemukan" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...session,
      nama: dbUser.nama,
      role: dbUser.role,
      permissions: resolvePermissions(dbUser.role, dbUser.permissions),
    },
  });
}

