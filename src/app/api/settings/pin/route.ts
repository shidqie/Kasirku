import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateOwnerPin } from "@/services/pin.service";
import { updatePinSchema } from "@/lib/validations/auth.schema";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updatePinSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Format PIN tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await updateOwnerPin(validated.data.oldPin, validated.data.newPin, session.userId, ip);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengubah PIN" },
      { status: 400 }
    );
  }
}

