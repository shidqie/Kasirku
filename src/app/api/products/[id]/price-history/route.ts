import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCostAccessContext } from "@/lib/auth/cost-access";
import { getPriceHistory } from "@/services/price-history.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { id } = await params;
  const costCtx = await getCostAccessContext(session);
  const history = await getPriceHistory({
    produkId: id,
    includeCostHistory: costCtx.showCost,
    take: 100,
  });

  return NextResponse.json({
    history,
    meta: costCtx,
  });
}
