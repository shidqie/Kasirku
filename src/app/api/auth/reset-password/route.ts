import { NextRequest, NextResponse } from "next/server";
import { resetPasswordByUsernameWithPin } from "@/services/auth.service";
import { resetPasswordWithPinSchema } from "@/lib/validations/auth.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = resetPasswordWithPinSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input reset password tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await resetPasswordByUsernameWithPin(
      validated.data.username,
      validated.data.pin,
      validated.data.password,
      ip
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({ message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mereset password" },
      { status: 500 }
    );
  }
}
