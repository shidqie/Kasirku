import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  createProductGroupWithVariants,
  getProductGroups,
} from "@/services/product-group.service";
import { createProductGroupSchema } from "@/lib/validations/product-group.schema";
import { getCostAccessContext } from "@/lib/auth/cost-access";
import { sanitizeProductsCost } from "@/lib/product-visibility";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const [groups, costCtx] = await Promise.all([
    getProductGroups(),
    getCostAccessContext(session),
  ]);
  const sanitized = groups.map((g) => ({
    ...g,
    produk: sanitizeProductsCost(g.produk, costCtx.showCost),
  }));
  return NextResponse.json({ groups: sanitized, meta: costCtx });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createProductGroupSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input grup varian tidak valid" },
        { status: 400 }
      );
    }

    const costCtx = await getCostAccessContext(session);
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await createProductGroupWithVariants(
      validated.data,
      session.userId,
      ip,
      { allowEditHargaBeli: costCtx.canViewHargaBeli }
    );

    return NextResponse.json(
      {
        message: `Grup "${result.group.nama}" dengan ${result.variants.length} varian berhasil dibuat`,
        group: result.group,
        variants: sanitizeProductsCost(result.variants, costCtx.showCost),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal membuat grup varian" },
      { status: 400 }
    );
  }
}
