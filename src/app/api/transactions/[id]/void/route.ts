import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { voidTransaction } from "@/services/transaction.service";
import { voidTransactionSchema } from "@/lib/validations/transaction.schema";
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
    const validated = voidTransactionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Alasan pembatalan minimal 3 karakter" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, permissions: true },
    });

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await voidTransaction(
      params.id,
      validated.data.alasan,
      {
        id: session.userId,
        role: dbUser?.role || session.role,
        permissions: dbUser?.permissions ?? session.permissions,
      },
      validated.data.pinOwner,
      ip
    );

    return NextResponse.json({
      message: "Transaksi berhasil dibatalkan (void)",
      transaksi: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal membatalkan transaksi" },
      { status: 400 }
    );
  }
}

