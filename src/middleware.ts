import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-key-at-least-32-chars-long";
const key = new TextEncoder().encode(SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Izinkan asset statis dan internal Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kasirku_session")?.value;
  let user: { userId: string; username: string; nama: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      user = payload as unknown as { userId: string; username: string; nama: string; role: string };
    } catch {
      user = null;
    }
  }

  // 1. Rute Login
  if (pathname === "/login") {
    if (user) {
      const redirectUrl = user.role === "OWNER" ? "/owner/dashboard" : "/kasir";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 2. Proteksi seluruh rute dashboard & API (Kecuali login)
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Otorisasi Rute Khusus Owner
  const isOwnerRoute = pathname.startsWith("/owner") || pathname.startsWith("/api/users") || pathname.startsWith("/api/reports") || pathname.startsWith("/api/activity-log");
  const isOwnerApiPutSettings = pathname === "/api/settings" && request.method === "PUT";

  if ((isOwnerRoute || isOwnerApiPutSettings) && user.role !== "OWNER") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Akses ditolak. Fitur ini hanya untuk Pemilik Toko (Owner)." }, { status: 403 });
    }
    // Redirect staff ke kasir jika mencoba membuka URL web Owner
    return NextResponse.redirect(new URL("/kasir", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
