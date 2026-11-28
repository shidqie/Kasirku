import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActivityLogs } from "@/services/activity-log.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const kategori = searchParams.get("kategori") || undefined;
  const entitas = searchParams.get("entitas") || undefined;
  const aksi = searchParams.get("aksi") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const result = await getActivityLogs({ limit, offset, kategori, entitas, aksi, userId });
  return NextResponse.json(result);
}

