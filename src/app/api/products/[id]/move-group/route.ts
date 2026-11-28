import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { moveProductToGroup } from "@/services/product-group.service";
import { moveProductToGroupSchema } from "@/lib/validations/product-group.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = moveProductToGroupSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const product = await moveProductToGroup(
      id,
      validated.data.groupId,
      validated.data.variantName,
      session.userId,
      ip
    );
    return NextResponse.json({ message: "Produk dipindahkan ke grup", product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memindahkan produk ke grup" },
      { status: 400 }
    );
  }
}
