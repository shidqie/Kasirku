import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLowStockProducts } from "@/services/stock.service";
import { getCostAccessContext } from "@/lib/auth/cost-access";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const [rawItems, costCtx] = await Promise.all([
    getLowStockProducts(),
    getCostAccessContext(session),
  ]);
  const items = costCtx.showCost
    ? rawItems
    : rawItems.map(({ hargaBeliDefault: _omit, ...rest }) => rest);
  return NextResponse.json({ items, meta: costCtx });
}

