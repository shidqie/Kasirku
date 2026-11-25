import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLowStockProducts } from "@/services/stock.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const items = await getLowStockProducts();
  return NextResponse.json({ items });
}

