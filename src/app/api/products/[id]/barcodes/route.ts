import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getCostAccessContext } from "@/lib/auth/cost-access";
import { sanitizeProductCost } from "@/lib/product-visibility";

function validateBarcodeValue(raw: unknown): { code?: string; error?: string } {
  const clean = String(raw || "").trim();
  if (!clean) return { error: "Kode barcode tidak boleh kosong" };
  if (/^https?:\/\//i.test(clean)) {
    return { error: "Kode barcode tidak boleh berupa link URL" };
  }
  return { code: clean };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { id } = await params;
  const barcodes = await prisma.productBarcode.findMany({
    where: { productId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ barcodes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { code, error } = validateBarcodeValue(body?.code);
    if (error || !code) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const source = ["ean", "gtin", "qr", "manual"].includes(body?.source)
      ? String(body.source)
      : "manual";
    const makePrimary = Boolean(body?.makePrimary);

    const product = await prisma.produk.findUnique({
      where: { id },
      select: { id: true, nama: true, barcode: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    // Cek duplikat di ProductBarcode & Produk.barcode
    const [dupExtra, dupMain] = await Promise.all([
      prisma.productBarcode.findUnique({
        where: { code },
        include: { product: { select: { id: true, nama: true } } },
      }),
      prisma.produk.findFirst({
        where: { barcode: code, id: { not: id } },
        select: { id: true, nama: true },
      }),
    ]);

    if (dupExtra && dupExtra.productId !== id) {
      return NextResponse.json(
        { error: `Kode ${code} sudah dipakai oleh produk "${dupExtra.product.nama}"` },
        { status: 409 }
      );
    }
    if (dupMain) {
      return NextResponse.json(
        { error: `Kode ${code} sudah dipakai oleh produk "${dupMain.nama}"` },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.productBarcode.upsert({
        where: { code },
        update: { productId: id, source },
        create: { productId: id, code, source },
      });

      if (makePrimary || !product.barcode) {
        await tx.produk.update({
          where: { id },
          data: { barcode: code },
        });
      }

      const allBarcodes = await tx.productBarcode.findMany({
        where: { productId: id },
        orderBy: { createdAt: "asc" },
      });
      const updatedProduct = await tx.produk.findUnique({
        where: { id },
        include: {
          kategori: true,
          satuanProduk: true,
          barcodes: { orderBy: { createdAt: "asc" } },
        },
      });
      return { entry, barcodes: allBarcodes, product: updatedProduct };
    });

    const costCtx = await getCostAccessContext(session);
    return NextResponse.json(
      {
        message: `Kode ${code} ditambahkan ke "${product.nama}"`,
        entry: result.entry,
        barcodes: result.barcodes,
        product: result.product ? sanitizeProductCost(result.product, costCtx.showCost) : result.product,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menambahkan kode barcode" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { barcodeId } = await req.json();
    const target = await prisma.productBarcode.findFirst({
      where: { id: barcodeId, productId: id },
    });
    if (!target) {
      return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.produk.update({
      where: { id },
      data: { barcode: target.code },
      include: {
        kategori: true,
        satuanProduk: true,
        barcodes: { orderBy: { createdAt: "asc" } },
      },
    });

    const costCtx = await getCostAccessContext(session);
    return NextResponse.json({
      message: `Kode ${target.code} dijadikan barcode utama`,
      product: sanitizeProductCost(updated, costCtx.showCost),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menjadikan barcode utama" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const barcodeId = searchParams.get("barcodeId");
    if (!barcodeId) {
      return NextResponse.json({ error: "barcodeId wajib diisi" }, { status: 400 });
    }

    const target = await prisma.productBarcode.findFirst({
      where: { id: barcodeId, productId: id },
    });
    if (!target) {
      return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productBarcode.delete({ where: { id: barcodeId } });

      const prod = await tx.produk.findUnique({
        where: { id },
        select: { barcode: true },
      });

      if (prod?.barcode === target.code) {
        const next = await tx.productBarcode.findFirst({
          where: { productId: id },
          orderBy: { createdAt: "asc" },
        });
        await tx.produk.update({
          where: { id },
          data: { barcode: next?.code || null },
        });
      }

      return tx.produk.findUnique({
        where: { id },
        include: {
          kategori: true,
          satuanProduk: true,
          barcodes: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    const costCtx = await getCostAccessContext(session);
    return NextResponse.json({
      message: `Kode ${target.code} dihapus`,
      product: updated ? sanitizeProductCost(updated, costCtx.showCost) : updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus kode barcode" },
      { status: 400 }
    );
  }
}
