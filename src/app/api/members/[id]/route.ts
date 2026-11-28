import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMemberById, updateMember, deleteMember } from "@/services/member.service";
import { updateMemberSchema } from "@/lib/validations/member.schema";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const member = await getMemberById(params.id);
  if (!member) {
    return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ member });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = updateMemberSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, permissions: true },
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const updated = await updateMember(
      params.id,
      validated.data,
      {
        id: session.userId,
        role: dbUser?.role || session.role,
        permissions: dbUser?.permissions ?? session.permissions,
      },
      ip
    );

    return NextResponse.json({ message: "Data member berhasil diperbarui", member: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui member" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await deleteMember(
      params.id,
      { id: session.userId, role: session.role },
      ip
    );

    return NextResponse.json({
      message: result.mode === "DEACTIVATED" ? "Member berhasil dinonaktifkan" : "Member berhasil dihapus",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus member" },
      { status: 400 }
    );
  }
}


