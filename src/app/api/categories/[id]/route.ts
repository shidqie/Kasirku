import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasLiveAnyPermission } from "@/lib/auth/cost-access";
import { updateCategory, deleteCategory } from "@/services/product.service";
import { categorySchema } from "@/lib/validations/product.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["kategori:manage"]))) {
    return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin mengelola kategori." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = categorySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input kategori tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const category = await updateCategory(params.id, validated.data.nama, session.userId, ip);

    return NextResponse.json({ message: "Kategori berhasil diperbarui", category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui kategori" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["kategori:manage"]))) {
    return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin mengelola kategori." }, { status: 403 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const category = await deleteCategory(params.id, session.userId, ip);
    return NextResponse.json({ message: "Kategori berhasil dihapus", category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus kategori" },
      { status: 400 }
    );
  }
}

