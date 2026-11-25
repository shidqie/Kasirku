import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { reconcileMemberDebt } from "@/services/member.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.memberId) {
      return NextResponse.json({ error: "memberId wajib diisi" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await reconcileMemberDebt(body.memberId, session.userId, ip);

    return NextResponse.json({ message: "Rekonsiliasi kasbon selesai", result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal melakukan rekonsiliasi kasbon" },
      { status: 400 }
    );
  }
}

