import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { duplicateProduct } from "@/services/product.service";
import { getCostAccessContext, getLiveUserFromSession } from "@/lib/auth/cost-access";
import { sanitizeProductCost } from "@/lib/product-visibility";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (
    !liveUser ||
    !hasAnyPermission({ role: liveUser.role, permissions: liveUser.permissions }, ["produk:manage"])
  ) {
    return NextResponse.json(
      { error: "Akses ditolak. Anda tidak memiliki izin menduplikat produk." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const duplicated = await duplicateProduct(id, session.userId, ip, liveUser.role);
    const costCtx = await getCostAccessContext(session);

    return NextResponse.json(
      {
        message: `Produk "${duplicated.nama}" berhasil diduplikat dengan SKU ${duplicated.sku}`,
        product: sanitizeProductCost(duplicated, costCtx.showCost),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menduplikat produk" },
      { status: 400 }
    );
  }
}
