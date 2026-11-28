import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adjustStockManual } from "@/services/stock.service";
import { stockAdjustmentSchema } from "@/lib/validations/stock.schema";
import { getLiveUserFromSession } from "@/lib/auth/cost-access";
import { hasPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (!liveUser || !hasPermission({ role: liveUser.role, permissions: liveUser.permissions }, "stok:adjust")) {
    return NextResponse.json(
      { error: "Akses ditolak. Penyesuaian stok hanya untuk Pemilik atau Kepala Toko." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = stockAdjustmentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input penyesuaian tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await adjustStockManual(
      validated.data,
      { id: session.userId, role: liveUser.role },
      ip
    );

    return NextResponse.json({ message: "Penyesuaian stok berhasil disimpan", result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menyesuaikan stok" },
      { status: 400 }
    );
  }
}

