import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCostAccessContext } from "@/lib/auth/cost-access";
import { getPriceHistory } from "@/services/price-history.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const produkId = searchParams.get("produkId") || undefined;
  const take = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));

  const costCtx = await getCostAccessContext(session);
  const history = await getPriceHistory({
    produkId,
    includeCostHistory: costCtx.showCost,
    take,
  });

  return NextResponse.json({
    history,
    meta: costCtx,
  });
}
