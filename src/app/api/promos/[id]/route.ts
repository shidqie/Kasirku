import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { deletePromo, updatePromo } from "@/services/promo.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "kasir:access"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const promo = await updatePromo(id, body, session.userId, ip);
    return NextResponse.json({ message: "Aturan promo diperbarui", promo });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui aturan promo" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "kasir:access"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await deletePromo(id, session.userId, ip);
    return NextResponse.json({ message: "Aturan promo dihapus" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus aturan promo" },
      { status: 400 }
    );
  }
}
