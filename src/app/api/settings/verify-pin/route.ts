import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyOwnerPin } from "@/services/pin.service";
import { verifyPinSchema } from "@/lib/validations/auth.schema";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = verifyPinSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "PIN harus 6 digit angka" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await verifyOwnerPin(validated.data.pin, session.userId, ip);

    if (!result.valid) {
      return NextResponse.json(
        {
          error: result.message,
          remainingAttempts: result.remainingAttempts,
          lockedUntil: result.lockedUntil,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: "PIN Owner valid", valid: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat memverifikasi PIN" },
      { status: 500 }
    );
  }
}

