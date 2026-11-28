"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { formatDateTime } from "@/lib/formatters";
import { Menu } from "lucide-react";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";

interface NavbarProps {
  storeName: string;
  onMenuToggle?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/kasir": "Kasir",
  "/transaksi": "Transaksi",
  "/stok/barang-masuk": "Barang Masuk",
  "/stok/perlu-belanja": "Stok",
  "/stok/opname": "Opname",
  "/member": "Piutang",
  "/owner/dashboard": "Dashboard",
  "/owner/produk": "Produk & Harga",
  "/owner/satuan": "Satuan & Konversi",
  "/owner/kategori": "Kategori Produk",
  "/owner/promo": "Aturan Promo",
  "/owner/activity-log": "Log Kontrol",
  "/owner/pengaturan": "Pengaturan",
  "/owner/laporan": "Laporan",
  "/owner/produk-terlaris": "Produk Terlaris",
  "/owner/go-live": "Checklist Go-Live",
  "/admin": "Platform Console",
};

export function Navbar({ storeName, onMenuToggle }: NavbarProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [logoSrc, setLogoSrc] = useState<string>("/logo.png");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings?.logoToko) setLogoSrc(d.settings.logoToko);
      })
      .catch(() => {});

    const onStoreUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLogoSrc(detail?.logoToko || "/logo.png");
    };
    window.addEventListener("kasirku-store-updated", onStoreUpdated);
    return () => window.removeEventListener("kasirku-store-updated", onStoreUpdated);
  }, []);

  useEffect(() => {
    setCurrentDate(new Date());
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine current page title
  let currentTitle = PAGE_TITLES[pathname];
  if (pathname === "/owner/laporan") {
    const tab = searchParams.get("tab");
    if (tab === "debts") {
      currentTitle = "Laporan Piutang";
    } else {
      currentTitle = "Laporan Pendapatan";
    }
  } else if (!currentTitle && pathname.startsWith("/member/")) {
    currentTitle = "Detail Bon";
  }

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] z-10 transition-all">
      <div className="flex items-center gap-3">
        {onMenuToggle && pathname === "/kasir" && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-10 h-10 rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-sm text-slate-600 dark:text-zinc-300 hover:text-slate-900 flex items-center justify-center transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Breadcrumb: Point of Sale / Toko Gagan 2 / Halaman */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1 text-xs min-w-0"
        >
          {/* Logo brand */}
          <img
            src={logoSrc}
            alt="Logo"
            className="w-5 h-5 rounded-full object-contain shrink-0"
          />

          <span className="hidden md:inline font-semibold text-slate-500 dark:text-zinc-400">
            Point of Sale
          </span>

          <span className="hidden md:inline text-slate-300 dark:text-zinc-600 font-bold select-none">/</span>

          <span className="font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[110px] sm:max-w-none">
            {storeName || "Toko Gagan 2"}
          </span>

          {currentTitle && (
            <>
              <span className="text-slate-300 dark:text-zinc-600 font-bold select-none">/</span>
              <span className="font-black text-[#F0090F] dark:text-red-400 truncate max-w-[120px] sm:max-w-none">
                {currentTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-zinc-400 font-sans">
        <OfflineIndicator />
        <span className="hidden sm:inline px-2 py-1 text-slate-500 dark:text-zinc-400">
          {currentDate ? formatDateTime(currentDate) : "Memuat jam..."}
        </span>
      </div>
    </header>
  );
}
