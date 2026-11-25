import { prisma } from "@/lib/db";
import { logActivity } from "./activity-log.service";
import { Pembulatan } from "@prisma/client";

export interface UpdateSettingsInput {
  namaToko: string;
  alamat?: string | null;
  telepon?: string | null;
  headerStruk?: string | null;
  footerStruk?: string | null;
  catatanRetur?: string | null;
  headerBon?: string | null;
  footerBon?: string | null;
  pesanWhatsApp?: string | null;
  pembulatan: Pembulatan;
  batasDiskonStaff: number;
  ambangUtangLamaHari: number;
  bolehJualStokNol: boolean;
  qrisModeDefault?: string;
  qrisPayload?: string | null;
  qrisStaticImage?: string | null;
  logoToko?: string | null;
}

export async function getSettings() {
  let settings = await prisma.pengaturanToko.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    // Jika belum ada, buat pengaturan default
    settings = await prisma.pengaturanToko.create({
      data: {
        id: "default",
        namaToko: process.env.STORE_NAME || "Toko Sembako",
        telepon: process.env.STORE_PHONE || "08123456789",
        alamat: process.env.STORE_ADDRESS || "Jl. Pasar No. 1",
        footerStruk: "Terima kasih atas kunjungan Anda",
        pesanWhatsApp: "Halo kak, berikut ringkasan transaksi belanja Anda.",
        pembulatan: "BULAT_0",
        batasDiskonStaff: 0,
        pinOwnerHash: "$2a$10$eO1k5s2f.gYf0W5gN9k1me7y3E0q2b8f5/8d/w.9m5j2.", // Default hash fallback
        ambangUtangLamaHari: 30,
        bolehJualStokNol: false,
      },
    });
  }

  return settings;
}

export async function getPublicStoreInfo() {
  const settings = await getSettings();
  return {
    namaToko: settings.namaToko,
    alamat: settings.alamat,
    telepon: settings.telepon,
    footerStruk: settings.footerStruk,
    pembulatan: settings.pembulatan,
  };
}

export async function updateSettings(
  input: UpdateSettingsInput,
  userId: string,
  ip?: string
) {
  const sebelum = await getSettings();

  const sesudah = await prisma.pengaturanToko.update({
    where: { id: "default" },
    data: {
      namaToko: input.namaToko,
      alamat: input.alamat,
      telepon: input.telepon,
      ...(input.headerStruk !== undefined ? { headerStruk: input.headerStruk } : {}),
      footerStruk: input.footerStruk,
      ...(input.catatanRetur !== undefined ? { catatanRetur: input.catatanRetur } : {}),
      ...(input.headerBon !== undefined ? { headerBon: input.headerBon } : {}),
      ...(input.footerBon !== undefined ? { footerBon: input.footerBon } : {}),
      pesanWhatsApp: input.pesanWhatsApp,
      pembulatan: input.pembulatan,
      batasDiskonStaff: input.batasDiskonStaff,
      ambangUtangLamaHari: input.ambangUtangLamaHari,
      bolehJualStokNol: input.bolehJualStokNol,
      ...(input.qrisModeDefault !== undefined ? { qrisModeDefault: input.qrisModeDefault } : {}),
      ...(input.qrisPayload !== undefined ? { qrisPayload: input.qrisPayload } : {}),
      ...(input.qrisStaticImage !== undefined ? { qrisStaticImage: input.qrisStaticImage } : {}),
      ...(input.logoToko !== undefined ? { logoToko: input.logoToko } : {}),
    },
  });

  await logActivity({
    userId,
    role: "OWNER",
    aksi: "UPDATE_PENGATURAN_TOKO",
    entitas: "PengaturanToko",
    entitasId: "default",
    sebelumJson: {
      namaToko: sebelum.namaToko,
      pembulatan: sebelum.pembulatan,
      batasDiskonStaff: sebelum.batasDiskonStaff,
      bolehJualStokNol: sebelum.bolehJualStokNol,
    },
    sesudahJson: {
      namaToko: sesudah.namaToko,
      pembulatan: sesudah.pembulatan,
      batasDiskonStaff: sesudah.batasDiskonStaff,
      bolehJualStokNol: sesudah.bolehJualStokNol,
    },
    ip,
  });

  return sesudah;
}

