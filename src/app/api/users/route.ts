import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllUsers, createUser } from "@/services/auth.service";
import { createUserSchema } from "@/lib/validations/auth.schema";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const newUser = await createUser(
      {
        username: validated.data.username,
        nama: validated.data.nama,
        passwordPlain: validated.data.password,
        role: validated.data.role,
      },
      session.userId,
      ip
    );

    return NextResponse.json({ message: "Pengguna berhasil ditambahkan", user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal membuat pengguna" },
      { status: 400 }
    );
  }
}

