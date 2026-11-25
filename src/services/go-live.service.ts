import { prisma } from "@/lib/db";
import { getSettings } from "./settings.service";
import fs from "fs";
import path from "path";

export interface GoLiveChecklistResult {
  isReady: boolean;
  score: number;
  totalChecks: number;
  checks: {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    actionUrl?: string;
  }[];
}

export async function getGoLiveChecklist(): Promise<GoLiveChecklistResult> {
  const [settings, staffCount, productCount, stockMovementCount, memberCount, trxCount] =
    await Promise.all([
      getSettings(),
      prisma.user.count({ where: { role: "STAFF", aktif: true } }),
      prisma.produk.count({ where: { aktif: true } }),
      prisma.stokMutasi.count(),
      prisma.member.count({ where: { aktif: true } }),
      prisma.transaksi.count({ where: { status: "SELESAI" } }),
    ]);

  // Periksa script backup
  const backupScriptExists =
    fs.existsSync(path.resolve(process.cwd(), "scripts/backup-db.sh")) ||
    fs.existsSync(path.resolve(process.cwd(), "scripts/backup.ts"));

  const checks = [
    {
      id: "settings",
      label: "Pengaturan Toko Lengkap",
      description: "Nama toko, alamat, dan nomor telepon sudah diisi.",
      completed: Boolean(settings.namaToko && settings.alamat && settings.telepon),
      actionUrl: "/owner/pengaturan",
    },
    {
      id: "pin",
      label: "PIN Owner Dikonfigurasi",
      description: "PIN keamanan 6-digit sudah dibuat untuk otorisasi aksi sensitif staff.",
      completed: Boolean(settings.pinOwnerHash),
      actionUrl: "/owner/pengaturan",
    },
    {
      id: "staff",
      label: "Minimal Satu Kasir/Staff Aktif",
      description: "Memiliki setidaknya 1 staf kasir aktif untuk operasional kasir.",
      completed: staffCount >= 1,
      actionUrl: "/owner/users",
    },
    {
      id: "products",
      label: "Data Produk & Harga Terisi",
      description: "Tersedia katalog produk dan harga jual terdaftar.",
      completed: productCount >= 1,
      actionUrl: "/owner/produk",
    },
    {
      id: "stock",
      label: "Stok Awal Tercatat",
      description: "Stok awal telah tercatat via Barang Masuk atau Opname.",
      completed: stockMovementCount >= 1,
      actionUrl: "/stok/barang-masuk",
    },
    {
      id: "members",
      label: "Data Member Kasbon Terdaftar",
      description: "Member pelanggan kasbon beserta limit piutang sudah dimasukkan.",
      completed: memberCount >= 1,
      actionUrl: "/member",
    },
    {
      id: "backup",
      label: "Skrip Backup Database Siap",
      description: "Skrip backup database teruji dan siap dijalankan berkala.",
      completed: backupScriptExists,
      actionUrl: "/owner/go-live",
    },
    {
      id: "test_trx",
      label: "Uji Coba Transaksi Selesai",
      description: "Telah berhasil menguji alur checkout kasir minimal 1 transaksi.",
      completed: trxCount >= 1,
      actionUrl: "/kasir",
    },
  ];

  const score = checks.filter((c) => c.completed).length;
  const isReady = score === checks.length;

  return {
    isReady,
    score,
    totalChecks: checks.length,
    checks,
  };
}

