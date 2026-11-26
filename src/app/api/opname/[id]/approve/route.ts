import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { approveOpname } from "@/services/opname.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasPermission(session, "stok:opname_approve")) {
    return NextResponse.json({ error: "Akses ditolak. Persetujuan opname hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await approveOpname(params.id, session.userId, ip);

    return NextResponse.json({
      message: "Stok opname berhasil disetujui. Mutasi stok telah diterapkan.",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menyetujui opname" },
      { status: 400 }
    );
  }
}

