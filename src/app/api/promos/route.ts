import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { createPromo, getPromos } from "@/services/promo.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const promos = await getPromos({ activeOnly });
  return NextResponse.json({ promos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "kasir:access"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body?.nama || !body?.tipe) {
      return NextResponse.json({ error: "Nama dan tipe promo wajib diisi" }, { status: 400 });
    }
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const promo = await createPromo(body, session.userId, ip);
    return NextResponse.json({ message: "Aturan promo berhasil dibuat", promo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal membuat aturan promo" },
      { status: 400 }
    );
  }
}
