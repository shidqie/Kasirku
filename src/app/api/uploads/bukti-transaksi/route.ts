import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { uploadBuktiFile, getBuktiSignedUrl } from "@/lib/storage";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const transaksiId = formData.get("transaksiId")?.toString().trim() || null;
    const source = formData.get("source")?.toString().trim() || "kasir";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File bukti transaksi wajib dipilih" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5 MB" },
        { status: 400 }
      );
    }

    const contentType = file.type || "image/jpeg";
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Format file harus JPG, PNG, WebP, atau PDF" },
        { status: 400 }
      );
    }

    const ext =
      file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
      "jpg";
    const safePrefix = source.replace(/[^a-zA-Z0-9_-]/g, "");
    const key = `bukti-transaksi/${safePrefix}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadBuktiFile(key, bytes, contentType);

    if (transaksiId) {
      await prisma.transaksi.update({
        where: { id: transaksiId },
        data: { buktiKey: key },
      });
    }

    const url = await getBuktiSignedUrl(key, 3600);
    return NextResponse.json({ key, url });
  } catch (err: any) {
    console.error("Upload bukti transaksi error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengunggah bukti transaksi" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key")?.trim();
  if (!key || !key.startsWith("bukti-transaksi/")) {
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 });
  }

  try {
    const url = await getBuktiSignedUrl(key, 3600);
    return NextResponse.json({ key, url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengambil tautan bukti" },
      { status: 500 }
    );
  }
}
