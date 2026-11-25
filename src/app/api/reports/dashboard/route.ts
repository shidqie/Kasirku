import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/services/report.service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Dashboard hanya untuk Pemilik Toko." }, { status: 403 });
  }

  const summary = await getDashboardSummary();
  return NextResponse.json({ summary });
}

