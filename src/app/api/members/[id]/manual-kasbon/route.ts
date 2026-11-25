import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { tambahKasbonManual, editKasbonManual } from "@/services/member.service";
import { manualKasbonSchema } from "@/lib/validations/manual-kasbon.schema";
import { prisma } from "@/lib/db";

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
    const validated = manualKasbonSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Data kasbon manual tidak valid" },
        { status: 400 }
      );
    }

    // Ambil nama user kasir
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { nama: true },
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await tambahKasbonManual(
      params.id,
      validated.data,
      { id: session.userId, role: session.role, nama: currentUser?.nama || session.username },
      ip
    );

    return NextResponse.json(
      {
        message: "Kasbon manual berhasil dicatat",
        result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mencatat kasbon manual" },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mutasiId, ...data } = body;
    if (!mutasiId) {
      return NextResponse.json({ error: "ID Kasbon wajib disertakan" }, { status: 400 });
    }

    const validated = manualKasbonSchema.safeParse(data);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Data kasbon tidak valid" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { nama: true },
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await editKasbonManual(
      params.id,
      mutasiId,
      validated.data,
      { id: session.userId, role: session.role, nama: currentUser?.nama || session.username },
      ip
    );

    return NextResponse.json({
      message: "Data bon berhasil diperbarui",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui data bon" },
      { status: 400 }
    );
  }
}


