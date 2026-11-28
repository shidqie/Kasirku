import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { splitProductIntoVariants } from "@/services/product-group.service";
import { splitProductSchema } from "@/lib/validations/product-group.schema";

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
    const validated = splitProductSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input pecah produk tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await splitProductIntoVariants(id, validated.data, session.userId, ip);
    return NextResponse.json(
      {
        message: `Produk berhasil dipecah menjadi ${result.variants.length} varian`,
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memecah produk menjadi varian" },
      { status: 400 }
    );
  }
}
