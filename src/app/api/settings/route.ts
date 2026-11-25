import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSettings, updateSettings } from "@/services/settings.service";
import { updateSettingsSchema } from "@/lib/validations/auth.schema";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const settings = await getSettings();
  // Sembunyikan pinOwnerHash dari response
  const { pinOwnerHash, ...safeSettings } = settings;
  return NextResponse.json({ settings: safeSettings });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateSettingsSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input pengaturan tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const updated = await updateSettings(validated.data, session.userId, ip);
    const { pinOwnerHash, ...safeSettings } = updated;

    return NextResponse.json({ message: "Pengaturan berhasil diperbarui", settings: safeSettings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui pengaturan" },
      { status: 400 }
    );
  }
}

