import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProducts, createProduct, checkPrice } from "@/services/product.service";
import { createProductSchema } from "@/lib/validations/product.schema";
import { groupProductsForDisplay } from "@/lib/product-grouping";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getCostAccessContext } from "@/lib/auth/cost-access";
import { sanitizeProductCost, sanitizeProductsCost } from "@/lib/product-visibility";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const kategoriId = searchParams.get("kategoriId") || undefined;
  const groupBy = searchParams.get("groupBy") || undefined;
  const isCheckPrice = searchParams.get("checkPrice") === "true";

  const costCtx = await getCostAccessContext(session);

  if (isCheckPrice && search) {
    const rawResults = await checkPrice(search);
    const results = sanitizeProductsCost(rawResults, costCtx.showCost);
    return NextResponse.json({ results, meta: costCtx });
  }

  const rawProducts = await getProducts({ search, kategoriId });
  const products = sanitizeProductsCost(rawProducts, costCtx.showCost);

  if (groupBy === "group") {
    const grouped = groupProductsForDisplay(
      products.map((p) => ({
        ...p,
        stokCache: Number(p.stokCache),
        stokMinimum: Number(p.stokMinimum),
        satuanProduk: p.satuanProduk.map((s) => ({
          ...s,
          faktorKeDasar: Number(s.faktorKeDasar),
        })),
      }))
    );
    return NextResponse.json({ products, grouped, meta: costCtx });
  }
  return NextResponse.json({ products, meta: costCtx });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "kasir:kasbon", "piutang:view"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
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

    const costCtx = await getCostAccessContext(session);
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const product = await createProduct(validated.data, session.userId, ip, {
      allowEditHargaBeli: costCtx.canViewHargaBeli,
      userRole: session.role,
    });

    return NextResponse.json(
      {
        message: "Produk berhasil ditambahkan",
        product: sanitizeProductCost(product, costCtx.showCost),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menambahkan produk" },
      { status: 400 }
    );
  }
}

