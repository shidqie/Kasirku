import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { createProduct, updateProduct } from "./product.service";
import {
  CreateProposalInput,
  createPriceChangeProposalPayloadSchema,
  createProductProposalPayloadSchema,
} from "@/lib/validations/proposal.schema";

const PROPOSAL_INCLUDE = {
  produk: {
    select: {
      id: true,
      sku: true,
      nama: true,
      barcode: true,
      satuanDasar: true,
      satuanProduk: {
        select: {
          id: true,
          namaSatuan: true,
          faktorKeDasar: true,
          hargaJual: true,
          isDefault: true,
        },
        orderBy: { faktorKeDasar: "asc" as const },
      },
    },
  },
  diajukanOleh: {
    select: { id: true, nama: true, username: true, role: true },
  },
  ditinjauOleh: {
    select: { id: true, nama: true, username: true, role: true },
  },
} satisfies Prisma.PengajuanPerubahanInclude;

export async function createProposal(
  input: CreateProposalInput,
  submitter: { id: string; role: string },
  ip?: string
) {
  let produkId: string | null = null;
  let namaProduk: string;
  let normalizedPayload: Prisma.InputJsonValue;

  if (input.tipe === "PRODUK_BARU") {
    const cleanBarcode = input.payload.barcode ? input.payload.barcode.trim() : null;
    if (cleanBarcode) {
      const [existingMain, existingExtra] = await Promise.all([
        prisma.produk.findUnique({ where: { barcode: cleanBarcode }, select: { id: true, nama: true } }),
        prisma.productBarcode.findFirst({ where: { code: cleanBarcode }, select: { productId: true } }),
      ]);
      if (existingMain || existingExtra) {
        throw new Error(`Barcode '${cleanBarcode}' sudah terdaftar di katalog produk`);
      }
    }

    const hasDefault = input.payload.satuanList.some((s) => s.isDefault);
    const sanitizedUnits = input.payload.satuanList.map((s, idx) => ({
      namaSatuan: s.namaSatuan.trim(),
      faktorKeDasar: s.faktorKeDasar,
      hargaJual: s.hargaJual,
      isDefault: hasDefault ? !!s.isDefault : idx === 0,
    }));

    namaProduk = input.payload.nama.trim();
    normalizedPayload = {
      nama: namaProduk,
      kategoriId: input.payload.kategoriId || null,
      barcode: cleanBarcode,
      satuanDasar: input.payload.satuanDasar.trim(),
      stokMinimum: input.payload.stokMinimum ?? 0,
      satuanList: sanitizedUnits,
    };
  } else {
    const product = await prisma.produk.findUnique({
      where: { id: input.payload.produkId },
      include: { satuanProduk: true },
    });
    if (!product || !product.aktif) {
      throw new Error("Produk tidak ditemukan atau sudah dinonaktifkan");
    }

    produkId = product.id;
    namaProduk = product.nama;

    const normalizedChanges = input.payload.perubahan.map((item) => {
      const matched =
        (item.satuanId ? product.satuanProduk.find((u) => u.id === item.satuanId) : undefined) ||
        product.satuanProduk.find(
          (u) => u.namaSatuan.trim().toLowerCase() === item.namaSatuan.trim().toLowerCase()
        );

      return {
        ...(matched ? { satuanId: matched.id } : {}),
        namaSatuan: matched ? matched.namaSatuan : item.namaSatuan.trim(),
        faktorKeDasar: matched ? Number(matched.faktorKeDasar) : item.faktorKeDasar,
        hargaLama: matched ? matched.hargaJual : item.hargaLama ?? 0,
        hargaBaru: item.hargaBaru,
        isDefault: matched ? matched.isDefault : !!item.isDefault,
      };
    });

    normalizedPayload = {
      produkId: product.id,
      perubahan: normalizedChanges,
    };
  }

  const created = await prisma.pengajuanPerubahan.create({
    data: {
      tipe: input.tipe,
      status: "MENUNGGU",
      produkId,
      namaProduk,
      payloadJson: normalizedPayload,
      catatanPengaju: input.catatanPengaju?.trim() || null,
      diajukanOlehId: submitter.id,
    },
    include: PROPOSAL_INCLUDE,
  });

  await logActivity({
    userId: submitter.id,
    role: submitter.role,
    aksi: "AJUKAN_PERUBAHAN",
    entitas: "PengajuanPerubahan",
    entitasId: created.id,
    sesudahJson: {
      tipe: created.tipe,
      namaProduk: created.namaProduk,
      produkId: created.produkId,
      catatanPengaju: created.catatanPengaju,
    },
    ip,
  });

  return created;
}

export async function listProposals(params: {
  status?: string;
  tipe?: string;
  canReview: boolean;
  userId: string;
}) {
  const where: Prisma.PengajuanPerubahanWhereInput = {};

  if (!params.canReview) {
    where.diajukanOlehId = params.userId;
  }
  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }
  if (params.tipe && params.tipe !== "ALL") {
    where.tipe = params.tipe;
  }

  const pendingWhere: Prisma.PengajuanPerubahanWhereInput = {
    status: "MENUNGGU",
    ...(params.canReview ? {} : { diajukanOlehId: params.userId }),
  };

  const [proposals, pendingCount] = await Promise.all([
    prisma.pengajuanPerubahan.findMany({
      where,
      include: PROPOSAL_INCLUDE,
      orderBy: [{ dibuatPada: "desc" }],
      take: 100,
    }),
    prisma.pengajuanPerubahan.count({ where: pendingWhere }),
  ]);

  return { proposals, pendingCount };
}

export async function approveProposal(
  proposalId: string,
  reviewer: { id: string; role: string },
  catatanPeninjau?: string,
  ip?: string
) {
  const proposal = await prisma.pengajuanPerubahan.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error("Pengajuan tidak ditemukan");
  }
  if (proposal.status !== "MENUNGGU") {
    throw new Error(`Pengajuan ini sudah berstatus ${proposal.status}`);
  }

  let appliedProductId: string | null = proposal.produkId;

  if (proposal.tipe === "PRODUK_BARU") {
    const parsed = createProductProposalPayloadSchema.safeParse(proposal.payloadJson);
    if (!parsed.success) {
      throw new Error("Data pengajuan produk baru tidak valid");
    }

    const createdProduct = await createProduct(
      {
        nama: parsed.data.nama,
        kategoriId: parsed.data.kategoriId ?? null,
        barcode: parsed.data.barcode ?? null,
        satuanDasar: parsed.data.satuanDasar,
        stokMinimum: parsed.data.stokMinimum ?? 0,
        satuanList: parsed.data.satuanList.map((s) => ({
          namaSatuan: s.namaSatuan,
          faktorKeDasar: s.faktorKeDasar,
          hargaJual: s.hargaJual,
          isDefault: s.isDefault,
        })),
      },
      reviewer.id,
      ip,
      { allowEditHargaBeli: false, userRole: reviewer.role }
    );

    appliedProductId = createdProduct.id;
  } else if (proposal.tipe === "UBAH_HARGA") {
    const parsed = createPriceChangeProposalPayloadSchema.safeParse(proposal.payloadJson);
    if (!parsed.success) {
      throw new Error("Data pengajuan perubahan harga tidak valid");
    }

    const existing = await prisma.produk.findUnique({
      where: { id: parsed.data.produkId },
      include: { satuanProduk: true },
    });
    if (!existing) {
      throw new Error("Produk target sudah tidak ditemukan di database");
    }

    // Pertahankan seluruh satuan yang ada dan perbarui hanya hargaJual yang diajukan;
    // allowEditHargaBeli: false memastikan hargaBeli lama tetap terlindungi dan RiwayatHarga tercatat.
    const nextUnits = existing.satuanProduk.map((unit) => {
      const patch =
        parsed.data.perubahan.find((p) => p.satuanId && p.satuanId === unit.id) ||
        parsed.data.perubahan.find(
          (p) => p.namaSatuan.trim().toLowerCase() === unit.namaSatuan.trim().toLowerCase()
        );
      return {
        id: unit.id,
        namaSatuan: unit.namaSatuan,
        faktorKeDasar: Number(unit.faktorKeDasar),
        hargaJual: patch ? patch.hargaBaru : unit.hargaJual,
        isDefault: unit.isDefault,
      };
    });

    await updateProduct(
      existing.id,
      { satuanList: nextUnits },
      reviewer.id,
      ip,
      { allowEditHargaBeli: false, userRole: reviewer.role }
    );
    appliedProductId = existing.id;
  } else {
    throw new Error(`Tipe pengajuan '${proposal.tipe}' tidak dikenali`);
  }

  const updated = await prisma.pengajuanPerubahan.update({
    where: { id: proposalId },
    data: {
      status: "DISETUJUI",
      produkId: appliedProductId,
      ditinjauOlehId: reviewer.id,
      ditinjauPada: new Date(),
      catatanPeninjau: catatanPeninjau?.trim() || null,
    },
    include: PROPOSAL_INCLUDE,
  });

  await logActivity({
    userId: reviewer.id,
    role: reviewer.role,
    aksi: "SETUJUI_PENGAJUAN",
    entitas: "PengajuanPerubahan",
    entitasId: updated.id,
    sebelumJson: { status: "MENUNGGU" },
    sesudahJson: {
      status: "DISETUJUI",
      tipe: updated.tipe,
      produkId: appliedProductId,
      catatanPeninjau: updated.catatanPeninjau,
    },
    ip,
  });

  return updated;
}

export async function rejectProposal(
  proposalId: string,
  reviewer: { id: string; role: string },
  catatanPeninjau?: string,
  ip?: string
) {
  const proposal = await prisma.pengajuanPerubahan.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error("Pengajuan tidak ditemukan");
  }
  if (proposal.status !== "MENUNGGU") {
    throw new Error(`Pengajuan ini sudah berstatus ${proposal.status}`);
  }

  const updated = await prisma.pengajuanPerubahan.update({
    where: { id: proposalId },
    data: {
      status: "DITOLAK",
      ditinjauOlehId: reviewer.id,
      ditinjauPada: new Date(),
      catatanPeninjau: catatanPeninjau?.trim() || null,
    },
    include: PROPOSAL_INCLUDE,
  });

  await logActivity({
    userId: reviewer.id,
    role: reviewer.role,
    aksi: "TOLAK_PENGAJUAN",
    entitas: "PengajuanPerubahan",
    entitasId: updated.id,
    sebelumJson: { status: "MENUNGGU" },
    sesudahJson: {
      status: "DITOLAK",
      tipe: updated.tipe,
      catatanPeninjau: updated.catatanPeninjau,
    },
    ip,
  });

  return updated;
}
