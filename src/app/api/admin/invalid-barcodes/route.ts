import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["platform:audit", "platform:stores", "produk:manage"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const allWithBarcode = await prisma.produk.findMany({
    where: {
      barcode: { not: null },
    },
    select: {
      id: true,
      nama: true,
      barcode: true,
      aktif: true,
      kategori: { select: { nama: true } },
    },
    orderBy: { nama: "asc" },
  });

  const invalid = allWithBarcode
    .filter((p) => {
      const bc = (p.barcode || "").trim();
      return bc !== "" && !/^\d{8,14}$/.test(bc);
    })
    .map((p) => {
      const bc = (p.barcode || "").trim();
      let alasan = "Lainnya";
      if (/^https?:\/\//i.test(bc)) alasan = "Mengandung URL/Link";
      else if (!/^\d+$/.test(bc)) alasan = "Mengandung karakter non-angka";
      else if (bc.length < 8 || bc.length > 14) alasan = "Panjang bukan 8–14 digit";
      return { ...p, alasan };
    });

  return NextResponse.json({ items: invalid });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasAnyPermission(session, ["platform:audit", "platform:stores", "produk:manage"])) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const { productId, action, newBarcode } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "productId wajib diisi" }, { status: 400 });
    }

    const old = await prisma.produk.findUnique({
      where: { id: productId },
      select: { id: true, barcode: true },
    });
    if (!old) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    if (action === "clear") {
      await prisma.$transaction(async (tx) => {
        if (old.barcode) {
          await tx.productBarcode.deleteMany({
            where: { productId, code: old.barcode },
          });
        }
        await tx.produk.update({
          where: { id: productId },
          data: { barcode: null },
        });
      });
      return NextResponse.json({ message: "Barcode bermasalah dihapus" });
    }

    const clean = String(newBarcode || "").trim();
    if (!/^\d{8,14}$/.test(clean)) {
      return NextResponse.json(
        { error: "Barcode baru harus berupa angka 8–14 digit" },
        { status: 400 }
      );
    }

    const conflict = await prisma.productBarcode.findFirst({
      where: { code: clean, productId: { not: productId } },
      include: { product: { select: { nama: true } } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Barcode ${clean} sudah dipakai oleh "${conflict.product.nama}"` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (old.barcode) {
        await tx.productBarcode.deleteMany({
          where: { productId, code: old.barcode },
        });
      }
      await tx.produk.update({
        where: { id: productId },
        data: { barcode: clean },
      });
      await tx.productBarcode.upsert({
        where: { code: clean },
        update: { productId, source: "manual" },
        create: { productId, code: clean, source: "manual" },
      });
    });

    return NextResponse.json({ message: `Barcode diperbaiki menjadi ${clean}` });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbaiki barcode" },
      { status: 400 }
    );
  }
}
