import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { bulkRaisePrices } from "@/services/product.service";
import { getCostAccessContext, getLiveUserFromSession } from "@/lib/auth/cost-access";

const bulkPriceSchema = z.object({
  scope: z.enum(["SINGLE", "CATEGORY", "ALL"]),
  produkId: z.string().optional(),
  kategoriId: z.string().optional(),
  mode: z.enum(["FIXED", "PERCENT"]),
  amount: z.number().positive("Nominal atau persentase kenaikan harus lebih dari 0"),
  roundTo: z.union([z.literal(0), z.literal(100), z.literal(500)]).optional(),
  includeHargaBeli: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (
    !liveUser ||
    !hasAnyPermission({ role: liveUser.role, permissions: liveUser.permissions }, ["produk:manage", "produk:price"])
  ) {
    return NextResponse.json(
      { error: "Akses ditolak. Anda tidak memiliki izin mengubah harga produk." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = bulkPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Input kenaikan harga tidak valid" },
        { status: 400 }
      );
    }

    const costCtx = await getCostAccessContext(session);
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await bulkRaisePrices(
      {
        ...parsed.data,
        allowEditHargaBeli: costCtx.canViewHargaBeli,
        role: liveUser.role,
      },
      session.userId,
      ip
    );

    return NextResponse.json({
      message: `Harga ${result.produkCount} produk berhasil dinaikkan`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menaikkan harga produk" },
      { status: 400 }
    );
  }
}
