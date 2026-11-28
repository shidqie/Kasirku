import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addVariantToGroup } from "@/services/product-group.service";
import { variantItemInputSchema } from "@/lib/validations/product-group.schema";
import { getCostAccessContext, hasLiveAnyPermission } from "@/lib/auth/cost-access";
import { sanitizeProductCost } from "@/lib/product-visibility";

export async function POST(
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
    const validated = variantItemInputSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input varian tidak valid" },
        { status: 400 }
      );
    }

    const costCtx = await getCostAccessContext(session);
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const variant = await addVariantToGroup(id, validated.data, session.userId, ip, {
      allowEditHargaBeli: costCtx.canViewHargaBeli,
    });
    return NextResponse.json(
      {
        message: `Varian "${variant.nama}" berhasil ditambahkan`,
        variant: sanitizeProductCost(variant, costCtx.showCost),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menambahkan varian ke grup" },
      { status: 400 }
    );
  }
}
