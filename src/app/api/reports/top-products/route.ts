import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getTopProductsReport } from "@/services/report.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["reports:top_products", "reports:sales"])) {
    return NextResponse.json(
      { error: "Akses ditolak. Laporan hanya untuk Pemilik Toko." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const report = await getTopProductsReport({ startDate, endDate });
  return NextResponse.json({ report });
}
