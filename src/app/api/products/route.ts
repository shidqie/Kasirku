import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProducts, createProduct, checkPrice } from "@/services/product.service";
import { createProductSchema } from "@/lib/validations/product.schema";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const kategoriId = searchParams.get("kategoriId") || undefined;
  const isCheckPrice = searchParams.get("checkPrice") === "true";

  if (isCheckPrice && search) {
    const results = await checkPrice(search);
    return NextResponse.json({ results });
  }

  const products = await getProducts({ search, kategoriId });
  return NextResponse.json({ products });
}

import { hasPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, "produk:manage")) {
    return NextResponse.json({ error: "Akses ditolak. Hanya untuk Pemilik Toko." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createProductSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input produk tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const product = await createProduct(validated.data, session.userId, ip);

    return NextResponse.json({ message: "Produk berhasil ditambahkan", product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menambahkan produk" },
      { status: 400 }
    );
  }
}

