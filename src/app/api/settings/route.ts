import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getSettings, updateSettings } from "@/services/settings.service";
import { updateSettingsSchema } from "@/lib/validations/auth.schema";
import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity-log.service";

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
  if (!session || (session.role !== "OWNER" && !hasPermission(session, "settings:manage"))) {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko atau pengguna berizin." }, { status: 403 });
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

const toggleCostSchema = z.object({
  aktifkanHargaBeli: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && !hasPermission(session, "settings:manage"))) {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Pemilik Toko yang dapat mengubah pengaturan ini." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = toggleCostSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
    }

    const sebelum = await getSettings();
    const sesudah = await prisma.pengaturanToko.update({
      where: { id: "default" },
      data: { aktifkanHargaBeli: validated.data.aktifkanHargaBeli },
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await logActivity({
      userId: session.userId,
      role: session.role,
      aksi: "TOGGLE_FITUR_HARGA_BELI",
      entitas: "PengaturanToko",
      entitasId: "default",
      sebelumJson: { aktifkanHargaBeli: sebelum.aktifkanHargaBeli },
      sesudahJson: { aktifkanHargaBeli: sesudah.aktifkanHargaBeli },
      ip,
    });

    const { pinOwnerHash, ...safeSettings } = sesudah;
    return NextResponse.json({
      message: sesudah.aktifkanHargaBeli
        ? "Pencatatan harga beli diaktifkan"
        : "Pencatatan harga beli dinonaktifkan (data lama tetap tersimpan)",
      settings: safeSettings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengubah pengaturan harga beli" },
      { status: 400 }
    );
  }
}

