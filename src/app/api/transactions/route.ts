import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkout, getTransactions } from "@/services/transaction.service";
import { checkoutSchema } from "@/lib/validations/transaction.schema";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") as any || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const transactions = await getTransactions({ search, status, startDate, endDate });
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = checkoutSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input checkout tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await checkout(
      validated.data,
      { id: session.userId, role: session.role },
      ip
    );

    return NextResponse.json(
      {
        message: result.isDuplicate ? "Transaksi telah diproses sebelumnya" : "Checkout berhasil",
        transaksi: result.transaksi,
        isDuplicate: result.isDuplicate,
      },
      { status: result.isDuplicate ? 200 : 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses transaksi checkout" },
      { status: 400 }
    );
  }
}

