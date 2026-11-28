import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getProductById, updateProduct, deleteProduct } from "@/services/product.service";
import { updateProductSchema } from "@/lib/validations/product.schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const product = await getProductById(params.id);
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage", "produk:price", "satuan:manage"])) {
    return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin mengelola produk." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateProductSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Input produk tidak valid" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const product = await updateProduct(params.id, validated.data, session.userId, ip);

    return NextResponse.json({ message: "Produk berhasil diperbarui", product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui produk" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["produk:manage"])) {
    return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin menghapus produk." }, { status: 403 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const product = await deleteProduct(params.id, session.userId, ip);
    return NextResponse.json({ message: "Produk berhasil dinonaktifkan", product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal menonaktifkan produk" },
      { status: 400 }
    );
  }
}

