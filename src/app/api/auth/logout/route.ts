import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { logActivity } from "@/services/activity-log.service";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logActivity({
      userId: session.userId,
      role: session.role,
      aksi: "LOGOUT",
      entitas: "User",
      entitasId: session.userId,
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ message: "Logout berhasil" });
}

