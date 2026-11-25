import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOpnameList, createOpname } from "@/services/opname.service";
import { createOpnameSchema } from "@/lib/validations/opname.schema";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") as any) || undefined;

  const list = await getOpnameList(status);
  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = createOpnameSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input opname tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await createOpname(validated.data, session.userId, ip);

    return NextResponse.json({
      message: "Pengajuan stok opname berhasil disimpan dan menunggu persetujuan Owner",
      result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal membuat pengajuan opname" },
      { status: 400 }
    );
  }
}

