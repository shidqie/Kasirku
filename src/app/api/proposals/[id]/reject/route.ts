import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getLiveUserFromSession } from "@/lib/auth/cost-access";
import { reviewProposalSchema } from "@/lib/validations/proposal.schema";
import { rejectProposal } from "@/services/proposal.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const liveUser = await getLiveUserFromSession(session);
  if (
    !liveUser ||
    !hasAnyPermission({ role: liveUser.role, permissions: liveUser.permissions }, ["pengajuan:approve"])
  ) {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Pemilik atau Kepala Toko yang dapat menolak pengajuan." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const validated = reviewProposalSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input peninjauan tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const proposal = await rejectProposal(
      id,
      { id: liveUser.id, role: liveUser.role },
      validated.data.catatanPeninjau,
      ip
    );

    return NextResponse.json({
      message: "Pengajuan berhasil ditolak",
      proposal,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menolak pengajuan" },
      { status: 400 }
    );
  }
}
