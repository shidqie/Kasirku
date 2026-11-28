import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const { barcode, source } = await req.json();
    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode) {
      return NextResponse.json(
        { error: "Barcode tidak boleh kosong" },
        { status: 400 }
      );
    }
    if (/^https?:\/\//i.test(cleanBarcode)) {
      return NextResponse.json(
        { error: "Kode barcode tidak boleh berupa link URL" },
        { status: 400 }
      );
    }

    // Cek apakah barcode sudah dipakai produk lain (di Produk maupun ProductBarcode)
    const [existing, existingExtra] = await Promise.all([
      prisma.produk.findFirst({
        where: { barcode: cleanBarcode, id: { not: params.id } },
        select: { id: true, nama: true },
      }),
      prisma.productBarcode.findFirst({
        where: { code: cleanBarcode, productId: { not: params.id } },
        include: { product: { select: { nama: true } } },
      }),
    ]);

    if (existing) {
      return NextResponse.json(
        { error: `Barcode ${cleanBarcode} sudah dipakai oleh produk "${existing.nama}"` },
        { status: 409 }
      );
    }
    if (existingExtra) {
      return NextResponse.json(
        { error: `Barcode ${cleanBarcode} sudah dipakai oleh produk "${existingExtra.product.nama}"` },
        { status: 409 }
      );
    }

    const src = ["ean", "gtin", "qr", "manual"].includes(source) ? String(source) : "manual";

    // Simpan ke ProductBarcode + update barcode utama jika belum ada
    const updated = await prisma.$transaction(async (tx) => {
      await tx.productBarcode.upsert({
        where: { code: cleanBarcode },
        update: { productId: params.id, source: src },
        create: { productId: params.id, code: cleanBarcode, source: src },
      });
      return tx.produk.update({
        where: { id: params.id },
        data: { barcode: cleanBarcode },
        include: {
          satuanProduk: true,
          kategori: true,
          barcodes: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json({
      message: `Barcode berhasil didaftarkan ke produk "${updated.nama}"`,
      product: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mendaftarkan barcode" },
      { status: 400 }
    );
  }
}
