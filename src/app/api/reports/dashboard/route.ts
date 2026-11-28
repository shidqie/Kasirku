import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getDashboardSummary } from "@/services/report.service";
import { getLiveUserFromSession } from "@/lib/auth/cost-access";
import { getSettings } from "@/services/settings.service";

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session, "dashboard:view")) {
    return NextResponse.json({ error: "Akses ditolak. Dashboard hanya untuk Pemilik & Kepala Toko." }, { status: 403 });
  }

  const [summary, liveUser, settings] = await Promise.all([
    getDashboardSummary(),
    getLiveUserFromSession(session),
    getSettings(),
  ]);

  const canViewProfit =
    Boolean(liveUser) &&
    settings.aktifkanHargaBeli &&
    (liveUser!.role === "OWNER" ||
      hasPermission(liveUser, "reports:profit") ||
      hasPermission(liveUser, "produk:cost"));

  if (!canViewProfit) {
    return NextResponse.json({
      summary: { ...summary, labaBulanIni: null },
    });
  }

  return NextResponse.json({ summary });
}

