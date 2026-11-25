import { NextRequest, NextResponse } from "next/server";
import { getSession, setSessionCookie, verifyPassword, hashPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity-log.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
      aktif: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nama, username, passwordLama, passwordBaru } = body;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (nama && typeof nama === "string" && nama.trim()) {
      dataToUpdate.nama = nama.trim();
    }

    if (username && typeof username === "string" && username.trim() !== currentUser.username) {
      const existing = await prisma.user.findUnique({
        where: { username: username.trim() },
      });
      if (existing) {
        return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
      }
      dataToUpdate.username = username.trim();
    }

    if (passwordBaru) {
      if (!passwordLama) {
        return NextResponse.json({ error: "Password lama wajib diisi untuk mengganti password" }, { status: 400 });
      }
      const isOldValid = await verifyPassword(passwordLama, currentUser.passwordHash);
      if (!isOldValid) {
        return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
      }
      if (passwordBaru.length < 6) {
        return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
      }
      dataToUpdate.passwordHash = await hashPassword(passwordBaru);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: dataToUpdate,
    });

    // Update cookie session dengan data baru
    await setSessionCookie({
      userId: updatedUser.id,
      username: updatedUser.username,
      nama: updatedUser.nama,
      role: updatedUser.role,
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await logActivity({
      userId: session.userId,
      role: session.role,
      aksi: "UBAH_PENGGUNA",
      entitas: "User",
      entitasId: updatedUser.id,
      sebelumJson: { nama: currentUser.nama, username: currentUser.username },
      sesudahJson: { nama: updatedUser.nama, username: updatedUser.username },
      ip,
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        nama: updatedUser.nama,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memperbarui profil" }, { status: 500 });
  }
}

