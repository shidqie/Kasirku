import type { Role } from "@prisma/client";

export type AppRole = Role;

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
  // Produk & Master
  | "produk:view"
  | "produk:manage"
  | "produk:price"
  | "satuan:manage"
  | "kategori:manage"
  // Stok & Opname
  | "stok:view"
  | "stok:barang_masuk"
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
  STAFF_KASIR: "Staff 1 (Kasir)",
  STAFF_GUDANG: "Staff 2 (Stok/Gudang)",
  STAFF: "Staff 1 (Kasir)",
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
    "reports:debts",
    "reports:top_products",
    "reports:operational",
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
    "satuan:manage",
    "kategori:manage",
    "stok:view",
    "stok:barang_masuk",
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
    "stok:view",
    "stok:barang_masuk",
    "stok:opname_submit",
    "stok:opname_approve",
    "reports:operational",
    "reports:top_products",
  ],
  STAFF_KASIR: [
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "pelanggan:view",
    "piutang:view",
  ],
  STAFF: [
    "kasir:access",
    "kasir:checkout",
    "kasir:kasbon",
    "transaksi:view",
    "transaksi:print",
    "pelanggan:view",
    "piutang:view",
  ],
  STAFF_GUDANG: [
    "produk:view",
    "stok:view",
    "stok:barang_masuk",
    "stok:opname_submit",
  ],
};

export const DELEGATABLE_PERMISSIONS: {
  permission: Permission;
  label: string;
  description: string;
}[] = [
  {
    permission: "piutang:pay",
    label: "Terima Pembayaran Piutang",
    description: "Mengizinkan staff/kepala toko menerima pembayaran cicilan atau pelunasan kasbon.",
  },
  {
    permission: "piutang:limit",
    label: "Ubah Limit Kasbon",
    description: "Mengizinkan penyesuaian batas limit kasbon pelanggan.",
  },
  {
    permission: "produk:manage",
    label: "Kelola Produk",
    description: "Menambah atau mengubah data produk di master barang.",
  },
  {
    permission: "produk:price",
    label: "Ubah Harga Jual",
    description: "Mengubah harga jual dan satuan produk.",
  },
  {
    permission: "kasir:void",
    label: "Void Transaksi Tanpa PIN",
    description: "Membatalkan transaksi penjualan secara langsung.",
  },
  {
    permission: "reports:sales",
    label: "Lihat Laporan Pendapatan",
    description: "Mengakses laporan omzet dan rincian pendapatan.",
  },
  {
    permission: "reports:debts",
    label: "Lihat Laporan Piutang",
    description: "Mengakses rekap piutang dan umur utang pelanggan.",
  },
  {
    permission: "users:manage",
    label: "Pengawasan & Kelola Staff",
    description: "Melihat dan mengelola akun staff operasional toko.",
  },
];

export function resolvePermissions(
  role: AppRole,
  customPermissions?: string[] | null
): Permission[] {
  const base = ROLE_DEFAULT_PERMISSIONS[role] || [];
  if (!customPermissions || customPermissions.length === 0) {
    return base;
  }
  // Super Admin tidak pernah mendapat izin operasional toko lewat delegasi
  if (role === "SUPER_ADMIN") {
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
  const effective =
    Array.isArray(user.permissions) && user.permissions.length > 0
      ? (user.permissions as Permission[])
      : resolvePermissions(user.role as AppRole);
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
    case "STAFF_GUDANG":
      return "/stok/perlu-belanja";
    case "STAFF_KASIR":
    case "STAFF":
    default:
      return "/kasir";
  }
}
