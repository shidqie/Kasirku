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
    const { barcode } = await req.json();
    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode) {
      return NextResponse.json(
        { error: "Barcode tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Cek apakah barcode sudah dipakai produk lain
    const existing = await prisma.produk.findFirst({
      where: {
        barcode: cleanBarcode,
        id: { not: params.id },
      },
      select: { id: true, nama: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Barcode ${cleanBarcode} sudah dipakai oleh produk "${existing.nama}"` },
        { status: 400 }
      );
    }

    // Update barcode pada produk yang dipilih
    const updated = await prisma.produk.update({
      where: { id: params.id },
      data: { barcode: cleanBarcode },
      include: {
        satuanProduk: true,
        kategori: true,
      },
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
