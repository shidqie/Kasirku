import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProfitReport } from "@/services/report.service";
import { getLiveUserFromSession } from "@/lib/auth/cost-access";
import { hasPermission } from "@/lib/auth/permissions";
import { getSettings } from "@/services/settings.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const [liveUser, settings] = await Promise.all([
    getLiveUserFromSession(session),
    getSettings(),
  ]);
  const canViewProfit =
    liveUser &&
    (liveUser.role === "OWNER" || hasPermission(liveUser, "reports:profit") || hasPermission(liveUser, "produk:cost"));

  if (!canViewProfit) {
    return NextResponse.json(
      { error: "Akses ditolak. Laporan keuntungan hanya untuk Pemilik Toko atau pengguna berizin khusus." },
      { status: 403 }
    );
  }
  if (!settings.aktifkanHargaBeli) {
    return NextResponse.json(
      { error: "Fitur pencatatan harga beli & keuntungan sedang dinonaktifkan oleh Pemilik Toko." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const report = await getProfitReport({ startDate, endDate });
  return NextResponse.json({ report });
}

