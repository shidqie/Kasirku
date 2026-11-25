import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resetPassword } from "@/services/auth.service";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = resetPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await resetPassword(params.id, validated.data.password, session.userId, ip);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mereset password" },
      { status: 400 }
    );
  }
}

