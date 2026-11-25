import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { catatBarangMasuk } from "@/services/stock.service";
import { barangMasukSchema } from "@/lib/validations/stock.schema";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const receipts = await prisma.barangMasuk.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { nama: true, username: true } },
      items: {
        include: { produk: { select: { nama: true, satuanDasar: true } } },
      },
    },
    take: 50,
  });

  return NextResponse.json({ receipts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = barangMasukSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input barang masuk tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await catatBarangMasuk(validated.data, session.userId, ip);

    return NextResponse.json({ message: "Barang masuk berhasil dicatat", result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mencatat barang masuk" },
      { status: 400 }
    );
  }
}

