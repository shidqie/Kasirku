import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { bayarKasbon } from "@/services/member.service";
import { payDebtSchema } from "@/lib/validations/member.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = payDebtSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input pembayaran tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await bayarKasbon(params.id, validated.data, session.userId, ip);

    return NextResponse.json({
      message: "Pembayaran kasbon berhasil dicatat",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses pembayaran kasbon" },
      { status: 400 }
    );
  }
}

