import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { resolvePermissions } from "@/lib/auth/permissions";
import { logActivity } from "./activity-log.service";
import { Role } from "@prisma/client";

export async function login(username: string, passwordPlain: string, ip?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, message: "Username atau password salah" };
  }

  if (!user.aktif) {
    return { success: false, message: "Akun telah dinonaktifkan. Hubungi Pemilik Toko." };
  }

  const isPasswordValid = await verifyPassword(passwordPlain, user.passwordHash);
  if (!isPasswordValid) {
    await logActivity({
      userId: user.id,
      role: user.role,
      aksi: "LOGIN_GAGAL_PASSWORD",
      entitas: "User",
      entitasId: user.id,
      ip,
    });
    return { success: false, message: "Username atau password salah" };
  }

  await logActivity({
    userId: user.id,
    role: user.role,
    aksi: "LOGIN_BERHASIL",
    entitas: "User",
    entitasId: user.id,
    ip,
  });

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      tokoId: user.tokoId,
      permissions: resolvePermissions(user.role, user.permissions),
    },
  };
}

export async function getAllUsers(tokoId?: string) {
  return prisma.user.findMany({
    where: tokoId ? { tokoId, role: { not: "SUPER_ADMIN" } } : undefined,
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
      tokoId: true,
      permissions: true,
      aktif: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(
  data: {
    username: string;
    nama: string;
    passwordPlain: string;
    role: Role;
    tokoId?: string;
    permissions?: string[];
  },
  actorId: string,
  ip?: string
) {
  // Cek keunikan username
  const existing = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existing) {
    throw new Error(`Username '${data.username}' sudah digunakan`);
  }

  const passwordHash = await hashPassword(data.passwordPlain);

  const newUser = await prisma.user.create({
    data: {
      username: data.username,
      nama: data.nama,
      role: data.role,
      tokoId: data.tokoId || "default",
      permissions: data.permissions || [],
      passwordHash,
      aktif: true,
    },
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
      tokoId: true,
      permissions: true,
      aktif: true,
      createdAt: true,
    },
  });

  await logActivity({
    userId: actorId,
    role: "OWNER",
    aksi: "BUAT_USER",
    entitas: "User",
    entitasId: newUser.id,
    sesudahJson: { username: newUser.username, nama: newUser.nama, role: newUser.role },
    ip,
  });

  return newUser;
}

export async function updateUser(
  id: string,
  data: { nama?: string; aktif?: boolean; role?: Role; permissions?: string[] },
  actorId: string,
  ip?: string
) {
  const sebelum = await prisma.user.findUnique({ where: { id } });
  if (!sebelum) {
    throw new Error("Pengguna tidak ditemukan");
  }

  // Lindungi agar user tidak menonaktifkan / mengubah role dirinya sendiri
  if (id === actorId && (data.role !== undefined && data.role !== sebelum.role)) {
    throw new Error("Tidak dapat mengubah role akun Anda sendiri");
  }

  // Lindungi agar Owner tidak menonaktifkan dirinya sendiri jika hanya tersisa 1 owner
  if (sebelum.role === "OWNER" && data.aktif === false) {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", aktif: true },
    });
    if (ownerCount <= 1) {
      throw new Error("Tidak dapat menonaktifkan satu-satunya akun Pemilik");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.nama ? { nama: data.nama } : {}),
      ...(data.aktif !== undefined ? { aktif: data.aktif } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
    },
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
      tokoId: true,
      permissions: true,
      aktif: true,
    },
  });

  await logActivity({
    userId: actorId,
    role: "OWNER",
    aksi:
      data.permissions !== undefined
        ? "DELEGASI_IZIN_USER"
        : data.aktif !== undefined
        ? data.aktif
          ? "AKTIFKAN_USER"
          : "NONAKTIFKAN_USER"
        : "UPDATE_USER",
    entitas: "User",
    entitasId: id,
    sebelumJson: { nama: sebelum.nama, role: sebelum.role, permissions: sebelum.permissions, aktif: sebelum.aktif },
    sesudahJson: { nama: updated.nama, role: updated.role, permissions: updated.permissions, aktif: updated.aktif },
    ip,
  });

  return updated;
}

export async function resetPassword(
  id: string,
  newPasswordPlain: string,
  actorId: string,
  ip?: string
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("Pengguna tidak ditemukan");
  }

  const passwordHash = await hashPassword(newPasswordPlain);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await logActivity({
    userId: actorId,
    role: "OWNER",
    aksi: "RESET_PASSWORD_USER",
    entitas: "User",
    entitasId: id,
    ip,
  });

  return { success: true, message: `Password untuk user '${user.username}' berhasil direset` };
}

