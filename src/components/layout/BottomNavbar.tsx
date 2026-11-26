"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  PackagePlus,
  ClipboardCheck,
  Database,
  ShieldCheck,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { SessionPayload } from "@/lib/auth/session";

interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface BottomNavbarProps {
  user: SessionPayload;
  onMenuToggle: () => void;
}

export function BottomNavbar({ user, onMenuToggle }: BottomNavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Halaman kasir memakai bottom bar checkout sendiri agar tidak bertumpuk
  if (pathname === "/kasir") {
    return null;
  }

  const items: BottomNavItem[] = (() => {
    switch (user.role) {
      case "SUPER_ADMIN":
        return [
          { label: "Toko", href: "/admin?tab=tenants", icon: Database },
          { label: "Pengguna", href: "/admin?tab=users", icon: Users },
          { label: "Audit", href: "/admin?tab=audit", icon: ShieldCheck },
        ];
      case "KEPALA_TOKO":
        return [
          { label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
          { label: "Kasir", href: "/kasir", icon: ShoppingCart },
          { label: "Riwayat", href: "/transaksi", icon: History },
          { label: "Stok", href: "/stok/perlu-belanja", icon: AlertTriangle },
        ];
      case "STAFF_KASIR":
      case "STAFF":
        return [
          { label: "Kasir", href: "/kasir", icon: ShoppingCart },
          { label: "Riwayat", href: "/transaksi", icon: History },
          { label: "Piutang", href: "/member", icon: Users },
        ];
      case "STAFF_GUDANG":
        return [
          { label: "Belanja", href: "/stok/perlu-belanja", icon: AlertTriangle },
          { label: "Masuk", href: "/stok/barang-masuk", icon: PackagePlus },
          { label: "Opname", href: "/stok/opname", icon: ClipboardCheck },
        ];
      case "OWNER":
      default:
        return [
          { label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
          { label: "Riwayat", href: "/transaksi", icon: History },
          { label: "Piutang", href: "/member", icon: Users },
          { label: "Produk", href: "/owner/produk", icon: Package },
        ];
    }
  })();

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [base, query] = href.split("?");
      const tab = new URLSearchParams(query).get("tab");
      return pathname === base && (searchParams.get("tab") || "tenants") === tab;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full min-w-0 px-1 transition-colors ${
                active
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.2 : 1.75} />
              <span
                className={`text-[10px] leading-none truncate max-w-full ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuToggle}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full min-w-0 px-1 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Buka semua menu"
        >
          <Menu className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          <span className="text-[10px] leading-none font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
