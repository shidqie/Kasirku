import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adjustMemberDebt } from "@/services/member.service";
import { adjustDebtSchema } from "@/lib/validations/member.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Koreksi saldo hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = adjustDebtSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Alasan koreksi saldo wajib diisi" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await adjustMemberDebt(params.id, validated.data, session.userId, ip);

    return NextResponse.json({
      message: "Koreksi saldo kasbon berhasil disimpan",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengoreksi saldo kasbon" },
      { status: 400 }
    );
  }
}

