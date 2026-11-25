import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateUser } from "@/services/auth.service";
import { updateUserSchema } from "@/lib/validations/auth.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
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

