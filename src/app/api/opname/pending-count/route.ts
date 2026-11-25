import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const count = await prisma.stokOpname.count({
      where: { status: "MENUNGGU" },
    });
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengambil jumlah antrean opname" },
      { status: 500 }
    );
  }
}
