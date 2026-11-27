import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteUser, updateUser } from "@/services/auth.service";
import { updateUserSchema } from "@/lib/validations/auth.schema";
import { hasPermission } from "@/lib/auth/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasPermission(session, "users:manage")) {
    return NextResponse.json({ error: "Akses ditolak. Tidak memiliki izin manajemen pengguna." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    if (
      (validated.data.permissions !== undefined || validated.data.role !== undefined) &&
      !hasPermission(session, "users:delegate")
    ) {
      return NextResponse.json(
        { error: "Hanya Pemilik Toko yang dapat mengubah role atau delegasi izin." },
        { status: 403 }
      );
    }

    if (validated.data.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Tidak dapat menetapkan role Super Admin dari pengaturan toko." },
        { status: 403 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const updated = await updateUser(params.id, validated.data, session.userId, ip);

    return NextResponse.json({ message: "Pengguna berhasil diperbarui", user: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui pengguna" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasPermission(session, "users:manage")) {
    return NextResponse.json(
      { error: "Akses ditolak. Tidak memiliki izin menghapus pengguna." },
      { status: 403 }
    );
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await deleteUser(params.id, session.userId, ip);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus pengguna" },
      { status: 400 }
    );
  }
}

