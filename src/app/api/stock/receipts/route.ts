import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { catatBarangMasuk } from "@/services/stock.service";
import { barangMasukSchema } from "@/lib/validations/stock.schema";
import { prisma } from "@/lib/db";
import { getCostAccessContext, hasLiveAnyPermission } from "@/lib/auth/cost-access";

export async function GET() {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["stok:view", "stok:barang_masuk"]))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const [receipts, costCtx] = await Promise.all([
    prisma.barangMasuk.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { nama: true, username: true } },
        items: {
          include: { produk: { select: { nama: true, satuanDasar: true } } },
        },
      },
      take: 50,
    }),
    getCostAccessContext(session),
  ]);

  const sanitized = costCtx.showCost
    ? receipts
    : receipts.map((r) => ({
        ...r,
        items: r.items.map(({ hargaBeliPerSatuan: _b, subtotal: _s, ...rest }) => rest),
      }));

  return NextResponse.json({ receipts: sanitized, meta: costCtx });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !(await hasLiveAnyPermission(session, ["stok:barang_masuk"]))) {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Pemilik atau Kepala Toko yang dapat mencatat barang masuk." },
      { status: 403 }
    );
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

    const costCtx = await getCostAccessContext(session);
    const sanitizedItems = costCtx.showCost
      ? validated.data.items
      : validated.data.items.map((it) => ({ ...it, hargaBeliPerSatuan: 0 }));

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await catatBarangMasuk(
      { ...validated.data, items: sanitizedItems },
      session.userId,
      ip
    );

    return NextResponse.json(
      {
        message: "Barang masuk berhasil dicatat",
        result: costCtx.showCost
          ? result
          : {
              ...result,
              items: result.items.map(({ hargaBeliPerSatuan: _b, subtotal: _s, ...rest }) => rest),
            },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mencatat barang masuk" },
      { status: 400 }
    );
  }
}

