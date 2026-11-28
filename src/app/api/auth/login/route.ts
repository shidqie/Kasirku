import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth.schema";
import { login } from "@/services/auth.service";
import { encryptSession, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getDefaultLandingRoute } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let username = "";
    let password = "";
    let isFormData = false;

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      isFormData = true;
      const formData = await req.formData();
      username = ((formData.get("username") as string) || "").trim();
      password = (formData.get("password") as string) || "";
    } else {
      const body = await req.json();
      username = (body.username || "").trim();
      password = body.password || "";
    }

    const validated = loginSchema.safeParse({ username, password });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;

    if (!validated.success) {
      const errMsg = validated.error.errors[0]?.message || "Input tidak valid";
      if (isFormData) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(errMsg)}`, baseUrl),
          303
        );
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const result = await login(validated.data.username, validated.data.password, ip);

    if (!result.success || !result.user) {
      if (isFormData) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(result.message || "Gagal masuk ke sistem")}`, baseUrl),
          303
        );
      }
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    const token = await encryptSession({
      userId: result.user.id,
      username: result.user.username,
      nama: result.user.nama,
      role: result.user.role,
      tokoId: result.user.tokoId,
      permissions: result.user.permissions,
    });

    const targetUrl = getDefaultLandingRoute(result.user.role);

    const isHttps = proto.split(",")[0].trim() === "https";

    if (isFormData) {
      const res = NextResponse.redirect(new URL(targetUrl, baseUrl), 303);
      res.cookies.set("kasirku_session", token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return res;
    }

    const res = NextResponse.json({
      message: "Login berhasil",
      user: result.user,
    });
    res.cookies.set("kasirku_session", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
