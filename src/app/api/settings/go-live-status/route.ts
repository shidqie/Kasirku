import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGoLiveChecklist } from "@/services/go-live.service";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Akses ditolak. Checklist Go-Live hanya untuk Pemilik Toko." },
      { status: 403 }
    );
  }

  try {
    const checklist = await getGoLiveChecklist();
    return NextResponse.json(checklist);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat status Go-Live" },
      { status: 500 }
    );
  }
}

