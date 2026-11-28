import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { quickQrisSchema } from "@/lib/validations/transaction.schema";
import { createQuickQrisTransaction } from "@/services/transaction.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }
  if (!hasPermission(session, "kasir:checkout")) {
    return NextResponse.json(
      { error: "Akses ditolak. Anda tidak memiliki izin melakukan transaksi kasir." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = quickQrisSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input Quick QRIS tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const transaksi = await createQuickQrisTransaction(
      validated.data,
      { id: session.userId, role: session.role },
      ip
    );

    return NextResponse.json({ transaksi }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menyimpan transaksi Quick QRIS" },
      { status: 400 }
    );
  }
}
