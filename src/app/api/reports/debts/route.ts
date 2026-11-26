import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getDebtReport } from "@/services/report.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["reports:debts", "reports:operational"])) {
    return NextResponse.json({ error: "Akses ditolak. Laporan utang hanya untuk Pemilik Toko." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const report = await getDebtReport({ startDate, endDate });
  return NextResponse.json({ report });
}

