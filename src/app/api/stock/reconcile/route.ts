import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { reconcileStock } from "@/services/stock.service";
import { reconcileStockSchema } from "@/lib/validations/stock.schema";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = reconcileStockSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Produk ID wajib diisi" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await reconcileStock(validated.data.produkId, session.userId, ip);

    return NextResponse.json({ message: "Rekonsiliasi selesai", result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal melakukan rekonsiliasi" },
      { status: 400 }
    );
  }
}

