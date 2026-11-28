import type { Role } from "@prisma/client";

export type AppRole = Role;

/** 3 role utama yang tersedia untuk akun operasional Toko Gagan */
export const STORE_ASSIGNABLE_ROLES = ["OWNER", "KEPALA_TOKO", "STAFF_KASIR"] as const;
export type StoreAssignableRole = (typeof STORE_ASSIGNABLE_ROLES)[number];

export type Permission =
  // Platform (Super Admin)
  | "platform:stores"
  | "platform:users"
  | "platform:config"
  | "platform:services"
  | "platform:audit"
  // Dashboard & Laporan
  | "dashboard:view"
  | "reports:sales"
  | "reports:profit"
  | "reports:debts"
  | "reports:top_products"
  | "reports:operational"
  // Kasir & Transaksi
  | "kasir:access"
  | "kasir:checkout"
  | "kasir:kasbon"
  | "kasir:void"
  | "kasir:discount_bypass"
  | "transaksi:view"
  | "transaksi:print"
  // Piutang & Pelanggan
  | "piutang:view"
  | "piutang:pay"
  | "piutang:limit"
  | "piutang:adjust"
  | "pelanggan:view"
  | "pelanggan:manage"
  // Produk, Harga & Pengajuan
  | "produk:view"
  | "produk:manage"
  | "produk:price"
  | "produk:cost"
  | "satuan:manage"
  | "kategori:manage"
  | "pengajuan:create"
  | "pengajuan:approve"
  // Stok, Pembelian & Opname
  | "stok:view"
  | "stok:barang_masuk"
  | "stok:barang_keluar"
  | "stok:adjust"
  | "stok:opname_submit"
  | "stok:opname_approve"
  // Sistem & Pengaturan
  | "settings:view"
  | "settings:manage"
  | "users:manage"
  | "users:delegate"
  | "audit:view"
  | "golive:view";

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Pemilik Toko",
  KEPALA_TOKO: "Kepala Toko",
  STAFF_KASIR: "Kasir",
  STAFF: "Kasir",
  STAFF_GUDANG: "Petugas Gudang (Perlu Migrasi)",
};

export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: [
    "platform:stores",
    "platform:users",
    "platform:config",
    "platform:services",
    "platform:audit",
  ],
  OWNER: [
    "dashboard:view",
    "reports:sales",
    "reports:profit",
    "reports:debts",
    "reports:top_products",
    "reports:operational",
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "kasir:void",
    "kasir:discount_bypass",
    "piutang:view",
    "piutang:pay",
    "piutang:limit",
    "piutang:adjust",
    "pelanggan:view",
    "pelanggan:manage",
    "produk:view",
    "produk:manage",
    "produk:price",
    "produk:cost",
    "satuan:manage",
    "kategori:manage",
    "pengajuan:create",
    "pengajuan:approve",
    "stok:view",
    "stok:barang_masuk",
    "stok:barang_keluar",
    "stok:adjust",
    "stok:opname_submit",
    "stok:opname_approve",
    "settings:view",
    "settings:manage",
    "users:manage",
    "users:delegate",
    "audit:view",
    "golive:view",
  ],
  KEPALA_TOKO: [
    "dashboard:view",
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "piutang:view",
    "piutang:pay",
    "pelanggan:view",
    "pelanggan:manage",
    "produk:view",
    "produk:manage",
    "produk:price",
    "satuan:manage",
    "kategori:manage",
    "pengajuan:approve",
    "stok:view",
    "stok:barang_masuk",
    "stok:barang_keluar",
    "stok:adjust",
    "stok:opname_submit",
    "stok:opname_approve",
    "reports:operational",
    "reports:top_products",
    "reports:debts",
  ],
  STAFF_KASIR: [
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "pelanggan:view",
    "piutang:view",
    "produk:view",
    "pengajuan:create",
  ],
  STAFF: [
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "pelanggan:view",
    "piutang:view",
    "produk:view",
    "pengajuan:create",
  ],
  // Role Petugas Gudang dihapus dari operasional aktif; akun lama menunggu migrasi oleh Pemilik
  STAFF_GUDANG: [],
};

export const DELEGATABLE_PERMISSIONS: {
  permission: Permission;
  label: string;
  description: string;
}[] = [
  {
    permission: "produk:cost",
    label: "Lihat & Atur Harga Beli / Margin",
    description: "Melihat harga beli (modal), margin keuntungan, dan riwayat perubahan harga beli.",
  },
  {
    permission: "reports:profit",
    label: "Lihat Laporan Keuntungan (Laba)",
    description: "Mengakses ringkasan HPP dan perhitungan laba kotor toko.",
  },
  {
    permission: "reports:sales",
    label: "Lihat Laporan Pendapatan Lengkap",
    description: "Mengakses laporan omzet dan rincian pendapatan penjualan.",
  },
  {
    permission: "reports:debts",
    label: "Lihat Laporan Piutang",
    description: "Mengakses rekap piutang dan umur utang pelanggan.",
  },
  {
    permission: "produk:manage",
    label: "Kelola Produk Langsung",
    description: "Menambah, mengedit, atau menduplikat data produk langsung tanpa persetujuan.",
  },
  {
    permission: "produk:price",
    label: "Ubah Harga Jual Langsung",
    description: "Mengubah harga jual dan satuan produk secara langsung.",
  },
  {
    permission: "satuan:manage",
    label: "Kelola Satuan & Konversi",
    description: "Mengatur satuan pembelian, penjualan, dan konversi stok.",
  },
  {
    permission: "kategori:manage",
    label: "Kelola Kategori Produk",
    description: "Menambah, mengubah, dan menghapus kategori produk.",
  },
  {
    permission: "pengajuan:approve",
    label: "Setujui Pengajuan Produk & Harga",
    description: "Menyetujui atau menolak pengajuan produk baru maupun perubahan harga dari kasir.",
  },
  {
    permission: "piutang:pay",
    label: "Terima Pembayaran Piutang",
    description: "Menerima pembayaran cicilan atau pelunasan kasbon pelanggan.",
  },
  {
    permission: "piutang:limit",
    label: "Ubah Limit Kasbon",
    description: "Menyesuaikan batas limit kasbon pelanggan.",
  },
  {
    permission: "kasir:void",
    label: "Void Transaksi Tanpa PIN",
    description: "Membatalkan transaksi penjualan secara langsung.",
  },
  {
    permission: "users:manage",
    label: "Pengawasan & Kelola Staff",
    description: "Melihat dan mengelola akun kasir operasional toko.",
  },
];

export function resolvePermissions(
  role: AppRole,
  customPermissions?: string[] | null
): Permission[] {
  const base = ROLE_DEFAULT_PERMISSIONS[role] || [];
  // Akun legacy STAFF_GUDANG tidak diberi izin aktif sampai Pemilik memindahkan rolenya
  if (role === "SUPER_ADMIN" || role === "STAFF_GUDANG") {
    return base;
  }
  if (!customPermissions || customPermissions.length === 0) {
    return base;
  }
  const merged = new Set<Permission>(base);
  for (const p of customPermissions) {
    merged.add(p as Permission);
  }
  return Array.from(merged);
}

export function hasPermission(
  user: { role: AppRole | string; permissions?: string[] } | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  const effective = resolvePermissions(user.role as AppRole, user.permissions);
  return effective.includes(permission);
}

export function hasAnyPermission(
  user: { role: AppRole | string; permissions?: string[] } | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function getRoleLabel(role: AppRole | string): string {
  return ROLE_LABELS[role as AppRole] || role;
}

export function getDefaultLandingRoute(role: AppRole | string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "OWNER":
    case "KEPALA_TOKO":
      return "/owner/dashboard";
    case "STAFF_KASIR":
    case "STAFF":
    case "STAFF_GUDANG":
    default:
      return "/kasir";
  }
}
