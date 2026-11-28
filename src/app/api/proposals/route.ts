import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getLiveUserFromSession } from "@/lib/auth/cost-access";
import { createProposalSchema } from "@/lib/validations/proposal.schema";
import { createProposal, listProposals } from "@/services/proposal.service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (!liveUser) {
    return NextResponse.json({ error: "Akun tidak aktif" }, { status: 403 });
  }

  const canReview = hasAnyPermission(
    { role: liveUser.role, permissions: liveUser.permissions },
    ["pengajuan:approve"]
  );
  const canCreate = hasAnyPermission(
    { role: liveUser.role, permissions: liveUser.permissions },
    ["pengajuan:create"]
  );

  if (!canReview && !canCreate) {
    return NextResponse.json(
      { error: "Akses ditolak. Role Anda tidak memiliki izin melihat pengajuan." },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "ALL";
  const tipe = searchParams.get("tipe") || "ALL";

  const data = await listProposals({
    status,
    tipe,
    canReview,
    userId: liveUser.id,
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (!liveUser) {
    return NextResponse.json({ error: "Akun tidak aktif" }, { status: 403 });
  }

  const allowed = hasAnyPermission(
    { role: liveUser.role, permissions: liveUser.permissions },
    ["pengajuan:create", "pengajuan:approve"]
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Akses ditolak. Anda tidak memiliki izin mengirim pengajuan." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = createProposalSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input pengajuan tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const proposal = await createProposal(
      validated.data,
      { id: liveUser.id, role: liveUser.role },
      ip
    );

    return NextResponse.json(
      {
        message:
          validated.data.tipe === "PRODUK_BARU"
            ? "Pengajuan produk baru dikirim ke Kepala Toko & Pemilik"
            : "Pengajuan perubahan harga dikirim ke Kepala Toko & Pemilik",
        proposal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengirim pengajuan" },
      { status: 400 }
    );
  }
}
