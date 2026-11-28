import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasLiveAnyPermission } from "@/lib/auth/cost-access";
import { rejectOpname } from "@/services/opname.service";
import { rejectOpnameSchema } from "@/lib/validations/opname.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["stok:opname_approve"]))) {
    return NextResponse.json(
      { error: "Akses ditolak. Penolakan opname hanya untuk Pemilik Toko atau Kepala Toko." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = rejectOpnameSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Alasan penolakan minimal 3 karakter" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await rejectOpname(params.id, validated.data.alasan, session.userId, ip);

    return NextResponse.json({
      message: "Pengajuan stok opname telah ditolak",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menolak opname" },
      { status: 400 }
    );
  }
}

