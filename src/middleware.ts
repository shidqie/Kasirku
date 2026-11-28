import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  getDefaultLandingRoute,
  hasAnyPermission,
  hasPermission,
  Permission,
} from "@/lib/auth/permissions";

function getMiddlewareSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "SESSION_SECRET wajib diatur minimal 32 karakter pada mode production."
      );
    }
    return new TextEncoder().encode(secret);
  }
  return new TextEncoder().encode(
    secret && secret.length >= 32
      ? secret
      : "dev-only-kasirku-session-secret-32-chars"
  );
}

const key = getMiddlewareSecretKey();

interface JwtUser {
  userId: string;
  username: string;
  nama: string;
  role: string;
  tokoId?: string;
  permissions?: string[];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Izinkan asset statis, login, dan reset password dengan PIN Owner
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kasirku_session")?.value;
  let user: JwtUser | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      user = payload as unknown as JwtUser;
    } catch {
      user = null;
    }
  }

  // 1. Rute Login
  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(
        new URL(getDefaultLandingRoute(user.role), request.url)
      );
    }
    return NextResponse.next();
  }

  // 2. Proteksi seluruh rute dashboard & API (Kecuali login)
  if (!user) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
      if (token) res.cookies.delete("kasirku_session");
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (token) res.cookies.delete("kasirku_session");
    return res;
  }

  const deny = (msg = "Akses ditolak. Anda tidak memiliki izin untuk fitur ini.") => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL(getDefaultLandingRoute(user!.role), request.url)
    );
  };

  // 3. Rute Super Admin (Platform) — eksklusif SUPER_ADMIN
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (user.role !== "SUPER_ADMIN") {
      return deny("Akses ditolak. Khusus Super Admin platform.");
    }
    return NextResponse.next();
  }

  // Super Admin tidak mengakses rute operasional toko langsung
  if (
    user.role === "SUPER_ADMIN" &&
    (pathname.startsWith("/kasir") ||
      pathname.startsWith("/transaksi") ||
      pathname.startsWith("/member") ||
      pathname.startsWith("/stok") ||
      pathname.startsWith("/owner"))
  ) {
    return deny("Super Admin mengelola platform, bukan operasional toko harian.");
  }

  // 4. Otorisasi berbasis Permission Granular per Rute Web & API
  const routeRules: { prefix: string; anyOf: Permission[] }[] = [
    { prefix: "/kasir", anyOf: ["kasir:access"] },
    { prefix: "/transaksi", anyOf: ["transaksi:view"] },
    { prefix: "/member", anyOf: ["pelanggan:view", "piutang:view"] },
    { prefix: "/stok/barang-masuk", anyOf: ["stok:barang_masuk"] },
    { prefix: "/stok/opname", anyOf: ["stok:opname_submit", "stok:opname_approve"] },
    { prefix: "/stok", anyOf: ["stok:view"] },
    { prefix: "/owner/dashboard", anyOf: ["dashboard:view"] },
    {
      prefix: "/owner/laporan",
      anyOf: ["reports:sales", "reports:debts", "reports:operational"],
    },
    {
      prefix: "/owner/produk-terlaris",
      anyOf: ["reports:top_products", "reports:sales"],
    },
    { prefix: "/owner/produk", anyOf: ["produk:view", "produk:manage"] },
    { prefix: "/owner/promo", anyOf: ["produk:view", "produk:manage", "kasir:access"] },
    { prefix: "/owner/satuan", anyOf: ["satuan:manage"] },
    { prefix: "/owner/kategori", anyOf: ["kategori:manage"] },
    { prefix: "/owner/pengaturan", anyOf: ["settings:manage", "users:manage"] },
    { prefix: "/owner/activity-log", anyOf: ["audit:view"] },
    { prefix: "/owner/go-live", anyOf: ["golive:view"] },
    { prefix: "/api/users", anyOf: ["users:manage"] },
    {
      prefix: "/api/reports/sales",
      anyOf: ["reports:sales", "reports:operational"],
    },
    {
      prefix: "/api/reports/debts",
      anyOf: ["reports:debts", "reports:operational"],
    },
    {
      prefix: "/api/reports/top-products",
      anyOf: ["reports:top_products", "reports:sales"],
    },
    { prefix: "/api/reports/dashboard", anyOf: ["dashboard:view"] },
    { prefix: "/api/activity-log", anyOf: ["audit:view"] },
  ];

  for (const rule of routeRules) {
    if (pathname.startsWith(rule.prefix)) {
      if (!hasAnyPermission(user, rule.anyOf)) {
        return deny();
      }
      break;
    }
  }

  // PUT /api/settings khusus yang memiliki settings:manage
  if (
    pathname === "/api/settings" &&
    request.method === "PUT" &&
    !hasPermission(user, "settings:manage")
  ) {
    return deny("Akses ditolak. Pengaturan toko hanya untuk Pemilik Toko.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
