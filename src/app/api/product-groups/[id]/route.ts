import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasLiveAnyPermission } from "@/lib/auth/cost-access";
import {
  deleteProductGroup,
  updateProductGroup,
} from "@/services/product-group.service";
import { updateProductGroupSchema } from "@/lib/validations/product-group.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["produk:manage"]))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateProductGroupSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const group = await updateProductGroup(id, validated.data, session.userId, ip);
    return NextResponse.json({ message: "Grup produk diperbarui", group });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui grup produk" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["produk:manage"]))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await deleteProductGroup(id, session.userId, ip);
    return NextResponse.json({ message: "Grup produk dihapus (produk varian tetap aman)" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus grup produk" },
      { status: 400 }
    );
  }
}
