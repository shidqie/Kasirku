import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLowStockCount } from "@/services/stock.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const counts = await getLowStockCount();
  return NextResponse.json(counts);
}

