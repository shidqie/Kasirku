"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  PackagePlus,
  AlertTriangle,
  ClipboardCheck,
  Users,
  LayoutDashboard,
  Package,
  Layers,
  BarChart3,
  Settings,
  History,
  LogOut,
  Upload,
  ShieldCheck,
  ChevronDown,
  X,
  Sun,
  Moon,
  Boxes,
  Database,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
} from "lucide-react";
import { SessionPayload } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface SidebarProps {
  user: SessionPayload;
  storeName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItemConfig {
  label: string;
  href: string;
  icon: any;
  badgeKey?: "lowStock" | "pendingOpname";
  hideIfGoLiveDone?: boolean;
}

interface NavGroupConfig {
  key: string;
  title: string;
  collapsible?: boolean;
  items: NavItemConfig[];
}

export function Sidebar({ user, storeName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [pendingOpnameCount, setPendingOpnameCount] = useState<number>(0);
  const [goLiveDone, setGoLiveDone] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const isOwner = user.role === "OWNER";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("app_theme") as "light" | "dark" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeMode(initial);
    document.documentElement.setAttribute("data-theme", initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("app_theme", mode);
    document.documentElement.setAttribute("data-theme", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const groups: NavGroupConfig[] = (() => {
    if (user.role === "SUPER_ADMIN") {
      return [
        {
          key: "platform",
          title: "PLATFORM",
          items: [{ label: "Platform Console", href: "/admin", icon: ShieldCheck }],
        },
      ];
    }

    if (user.role === "OWNER") {
      return [
        {
          key: "utama",
          title: "UTAMA",
          items: [{ label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard }],
        },
        {
          key: "bisnis",
          title: "PENJUALAN & PIUTANG",
          collapsible: true,
          items: [
            { label: "Piutang", href: "/member", icon: Users },
          ],
        },
        {
          key: "master",
          title: "DATA MASTER",
          collapsible: true,
          items: [
            { label: "Produk & Harga", href: "/owner/produk", icon: Package },
            { label: "Satuan & Konversi", href: "/owner/satuan", icon: Boxes },
            { label: "Kategori Produk", href: "/owner/kategori", icon: Layers },
            { label: "Aturan Promo", href: "/owner/promo", icon: Tag },
          ],
        },
        {
          key: "laporan",
          title: "LAPORAN",
          collapsible: true,
          items: [
            { label: "Laporan Pendapatan", href: "/owner/laporan?tab=sales", icon: TrendingUp },
            { label: "Laporan Piutang", href: "/owner/laporan?tab=debts", icon: Users },
            { label: "Produk Terlaris", href: "/owner/produk-terlaris", icon: BarChart3 },
          ],
        },
        {
          key: "sistem",
          title: "SISTEM",
          collapsible: true,
          items: [
            { label: "Pengaturan", href: "/owner/pengaturan", icon: Settings },
            { label: "Log Kontrol", href: "/owner/activity-log", icon: History },
            { label: "Checklist Go-Live", href: "/owner/go-live", icon: ShieldCheck, hideIfGoLiveDone: true },
          ],
        },
      ];
    }

    if (user.role === "KEPALA_TOKO") {
      const kelolaItems: NavItemConfig[] = [];
      if (hasAnyPermission(user, ["produk:view", "produk:manage"])) {
        kelolaItems.push({ label: "Produk & Harga", href: "/owner/produk", icon: Package });
      }
      if (hasPermission(user, "satuan:manage")) {
        kelolaItems.push({ label: "Satuan & Konversi", href: "/owner/satuan", icon: Boxes });
      }
      if (hasPermission(user, "kategori:manage")) {
        kelolaItems.push({ label: "Kategori Produk", href: "/owner/kategori", icon: Layers });
      }
      if (hasAnyPermission(user, ["produk:view", "produk:manage"])) {
        kelolaItems.push({ label: "Aturan Promo", href: "/owner/promo", icon: Tag });
      }
      if (hasAnyPermission(user, ["reports:sales", "reports:operational"])) {
        kelolaItems.push({ label: "Laporan Pendapatan", href: "/owner/laporan?tab=sales", icon: TrendingUp });
      }
      if (hasAnyPermission(user, ["reports:debts", "reports:operational"])) {
        kelolaItems.push({ label: "Laporan Piutang", href: "/owner/laporan?tab=debts", icon: Users });
      }
      if (hasPermission(user, "reports:top_products")) {
        kelolaItems.push({ label: "Produk Terlaris", href: "/owner/produk-terlaris", icon: BarChart3 });
      }
      if (hasPermission(user, "users:manage")) {
        kelolaItems.push({ label: "Kelola Staff", href: "/owner/pengaturan?tab=pengguna", icon: Settings });
      }

      const result: NavGroupConfig[] = [
        {
          key: "utama",
          title: "UTAMA",
          items: [{ label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard }],
        },
        {
          key: "operasional",
          title: "OPERASIONAL",
          collapsible: true,
          items: [
            { label: "Kasir", href: "/kasir", icon: ShoppingCart },
            { label: "Riwayat Transaksi", href: "/transaksi", icon: History },
            { label: "Piutang", href: "/member", icon: Users },
          ],
        },
        {
          key: "persediaan",
          title: "PERSEDIAAN & STOK",
          collapsible: true,
          items: [
            { label: "Stok Menipis", href: "/stok/perlu-belanja", icon: AlertTriangle, badgeKey: "lowStock" },
            { label: "Stok Opname", href: "/stok/opname", icon: ClipboardCheck, badgeKey: "pendingOpname" },
            { label: "Barang Masuk", href: "/stok/barang-masuk", icon: PackagePlus },
          ],
        },
      ];

      if (kelolaItems.length > 0) {
        result.push({
          key: "kelola",
          title: "MASTER & LAPORAN",
          collapsible: true,
          items: kelolaItems,
        });
      }
      return result;
    }

    // Legacy STAFF_GUDANG tanpa izin operasional tidak lagi memakai menu gudang terpisah
    // STAFF_KASIR / STAFF (default kasir) + izin delegasi tambahan
    const delegatedItems: NavItemConfig[] = [];
    if (hasPermission(user, "satuan:manage")) {
      delegatedItems.push({ label: "Satuan & Konversi", href: "/owner/satuan", icon: Boxes });
    }
    if (hasPermission(user, "kategori:manage")) {
      delegatedItems.push({ label: "Kategori Produk", href: "/owner/kategori", icon: Layers });
    }
    if (hasPermission(user, "stok:view")) {
      delegatedItems.push({ label: "Stok Menipis", href: "/stok/perlu-belanja", icon: AlertTriangle, badgeKey: "lowStock" });
    }
    if (hasPermission(user, "stok:barang_masuk")) {
      delegatedItems.push({ label: "Barang Masuk", href: "/stok/barang-masuk", icon: PackagePlus });
    }
    if (hasPermission(user, "reports:sales")) {
      delegatedItems.push({ label: "Laporan Pendapatan", href: "/owner/laporan?tab=sales", icon: TrendingUp });
    }
    if (hasPermission(user, "reports:debts")) {
      delegatedItems.push({ label: "Laporan Piutang", href: "/owner/laporan?tab=debts", icon: Users });
    }
    if (hasPermission(user, "users:manage")) {
      delegatedItems.push({ label: "Kelola Staff", href: "/owner/pengaturan?tab=pengguna", icon: Settings });
    }

    const operasionalKasir: NavItemConfig[] = [
      { label: "Kasir", href: "/kasir", icon: ShoppingCart },
      { label: "Piutang", href: "/member", icon: Users },
    ];
    if (hasPermission(user, "transaksi:view")) {
      operasionalKasir.splice(1, 0, { label: "Riwayat Transaksi", href: "/transaksi", icon: History });
    }

    const staffGroups: NavGroupConfig[] = [
      {
        key: "operasional",
        title: "OPERASIONAL",
        items: operasionalKasir,
      },
      {
        key: "datamaster",
        title: "PRODUK & HARGA",
        collapsible: true,
        items: [
          { label: "Produk & Harga", href: "/owner/produk", icon: Package },
          { label: "Aturan Promo", href: "/owner/promo", icon: Tag },
        ],
      },
    ];

    if (delegatedItems.length > 0) {
      staffGroups.push({
        key: "delegasi",
        title: "IZIN TAMBAHAN",
        collapsible: true,
        items: delegatedItems,
      });
    }

    return staffGroups;
  })();

  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});
  const [storeLogo, setStoreLogo] = useState<string>("/logo.png");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    badge: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("kasirku_sidebar_minimized");
    if (saved === "true") setIsMinimized(true);
  }, []);

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      localStorage.setItem("kasirku_sidebar_minimized", String(next));
      return next;
    });
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings?.logoToko) setStoreLogo(d.settings.logoToko);
      })
      .catch(() => {});

    const onStoreUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStoreLogo(detail?.logoToko || "/logo.png");
    };
    window.addEventListener("kasirku-store-updated", onStoreUpdated);
    return () => window.removeEventListener("kasirku-store-updated", onStoreUpdated);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial: { [key: string]: boolean } = {};
    groups.forEach((g) => {
      if (g.collapsible) {
        const key = `sidebar_collapsed_${g.key}_${user.userId}`;
        const saved = localStorage.getItem(key);
        const hasActiveItem = g.items.some((item) => isItemActive(item.href));
        initial[g.key] = hasActiveItem ? false : saved !== null ? saved === "true" : false;
      }
    });
    setCollapsedGroups(initial);
  }, [user.userId]);

  useEffect(() => {
    groups.forEach((g) => {
      if (g.collapsible) {
        const hasActiveItem = g.items.some((item) => isItemActive(item.href));
        if (hasActiveItem) {
          setCollapsedGroups((prev) => {
            if (prev[g.key]) {
              const updated = { ...prev, [g.key]: false };
              localStorage.setItem(`sidebar_collapsed_${g.key}_${user.userId}`, "false");
              return updated;
            }
            return prev;
          });
        }
      }
    });
  }, [pathname]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const nextState = !prev[groupKey];
      localStorage.setItem(`sidebar_collapsed_${groupKey}_${user.userId}`, String(nextState));
      return { ...prev, [groupKey]: nextState };
    });
  };

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const resLow = await fetch("/api/stock/low-count");
        if (resLow.ok) {
          const data = await resLow.json();
          setLowStockCount(data.total || 0);
        }
      } catch {}

      if (isOwner) {
        try {
          const resOp = await fetch("/api/opname/pending-count");
          if (resOp.ok) {
            const data = await resOp.json();
            setPendingOpnameCount(data.count || 0);
          }
        } catch {}

        try {
          const resGl = await fetch("/api/settings/go-live-status");
          if (resGl.ok) {
            const data = await resGl.json();
            if (data.isReady || (data.score && data.score === data.totalChecks)) {
              setGoLiveDone(true);
            }
          }
        } catch {}
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [pathname, isOwner]);

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (pathname.startsWith(`${href}/`)) return true;
    return false;
  };

  /* ─── SIDEBAR CONTENT ─────────────────────────────────────── */
  const renderSidebarContent = (compact: boolean) => (
    <div className="flex flex-col h-full select-none bg-white dark:bg-[#18181B] border-r border-slate-200/70 dark:border-zinc-800">

      {/* ── Brand Header ── */}
      <div
        className={`pt-4 pb-3 flex items-center shrink-0 ${
          compact ? "flex-col gap-2 px-2" : "justify-between px-4 sm:px-5"
        }`}
      >
        <div className={`flex items-center gap-3 min-w-0 ${compact ? "justify-center" : ""}`}>
          {/* Logo Brand */}
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm bg-white border border-slate-100 dark:border-zinc-700 flex items-center justify-center p-0.5">
            <img
              src={storeLogo}
              alt={storeName}
              className="w-full h-full object-contain"
            />
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                {storeName}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Minimize / Expand Toggle */}
        <button
          type="button"
          onClick={toggleMinimize}
          title={compact ? "Perbesar Sidebar" : "Kecilkan Sidebar"}
          aria-label={compact ? "Perbesar Sidebar" : "Kecilkan Sidebar"}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
        >
          {compact ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {onClose && !compact && (
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className={`flex-1 overflow-y-auto py-2 ${compact ? "px-2 space-y-3" : "px-3 space-y-5"}`}>
        {groups.map((group, gIdx) => {
          const isCollapsed = !compact && (collapsedGroups[group.key] || false);
          const visibleItems = group.items.filter((item) => {
            if (item.hideIfGoLiveDone && goLiveDone) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key}>
              {/* Group label */}
              {compact ? (
                gIdx > 0 && <div className="border-t border-slate-100 dark:border-zinc-800 mx-2 mb-2" />
              ) : (
                <div
                  className={`flex items-center justify-between px-2 mb-1 ${
                    group.collapsible ? "cursor-pointer" : ""
                  }`}
                  onClick={() => group.collapsible && toggleGroup(group.key)}
                >
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                    {group.title}
                  </span>
                  {group.collapsible && (
                    <ChevronDown
                      className={`w-3 h-3 text-slate-300 dark:text-zinc-600 transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  )}
                </div>
              )}

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.href);

                    let badgeValue = 0;
                    if (item.badgeKey === "lowStock") badgeValue = lowStockCount;
                    if (item.badgeKey === "pendingOpname" && isOwner) badgeValue = pendingOpnameCount;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onMouseEnter={(e) => {
                          if (!compact) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredItem({
                            label: item.label,
                            badge: badgeValue,
                            top: rect.top + rect.height / 2,
                          });
                        }}
                        onMouseLeave={() => {
                          if (compact) setHoveredItem(null);
                        }}
                        onClick={() => {
                          setHoveredItem(null);
                          if (onClose) onClose();
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new CustomEvent("sidebar-navigated"));
                          }
                        }}
                        className={`group relative flex items-center ${
                          compact ? "justify-center px-0 h-10" : "justify-between px-3 h-11"
                        } rounded-2xl text-[13px] font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-red-50 dark:bg-red-950/40 text-[#F0090F] dark:text-red-400 font-bold shadow-2xs"
                            : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-800 dark:hover:text-zinc-200"
                        }`}
                      >
                        <div className={`flex items-center min-w-0 ${compact ? "justify-center" : "gap-3"}`}>
                          <Icon
                            className={`w-[17px] h-[17px] shrink-0 ${
                              isActive
                                ? "text-[#F0090F] dark:text-red-400"
                                : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300"
                            }`}
                          />
                          {!compact && <span className="truncate">{item.label}</span>}
                        </div>
                        {badgeValue > 0 && (
                          <span
                            className={
                              compact
                                ? "absolute top-1.5 right-2 w-2 h-2 rounded-full"
                                : "px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0"
                            }
                            style={{ background: "var(--primary)" }}
                          >
                            {!compact && badgeValue}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: User + Theme Toggle ── */}
      <div
        className={`pb-4 pt-3 border-t border-slate-100 dark:border-zinc-800 shrink-0 ${
          compact ? "px-2 space-y-2 flex flex-col items-center" : "px-4 space-y-3"
        }`}
      >
        {/* User row */}
        {compact ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${user.nama} (@${user.username})`}
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 shrink-0"
            >
              {user.nama.slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* User avatar */}
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 shrink-0">
                {user.nama.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-zinc-200 truncate leading-tight">
                  {user.nama}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Theme toggle */}
        {compact ? (
          <button
            type="button"
            onClick={() => toggleTheme(themeMode === "light" ? "dark" : "light")}
            title={themeMode === "light" ? "Ganti ke Mode Gelap" : "Ganti ke Mode Terang"}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {themeMode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        ) : (
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-2xl p-1 gap-1">
            {/* Sun / Terang */}
            <button
              onClick={() => toggleTheme("light")}
              title="Mode Terang"
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                themeMode === "light"
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Terang</span>
            </button>
            {/* Moon / Gelap */}
            <button
              onClick={() => toggleTheme("dark")}
              title="Mode Gelap"
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                themeMode === "dark"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Gelap</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop (Collapsible / Minimisable) */}
      <aside
        className={`hidden lg:flex flex-col h-full shrink-0 relative z-30 transition-[width] duration-200 ease-out ${
          isMinimized ? "w-[72px]" : "w-60"
        }`}
      >
        {renderSidebarContent(isMinimized)}

        {/* Instant Floating Hover Tooltip saat Sidebar Minimized */}
        {isMinimized && hoveredItem && (
          <div
            style={{ top: hoveredItem.top }}
            className="fixed left-[66px] -translate-y-1/2 z-[100] pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-zinc-800 text-white text-xs font-semibold shadow-lg border border-slate-800 dark:border-zinc-700 whitespace-nowrap flex items-center gap-1.5 animate-in fade-in duration-100"
          >
            <span>{hoveredItem.label}</span>
            {hoveredItem.badge > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                {hoveredItem.badge}
              </span>
            )}
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Drawer (Selalu Full Expanded, muncul dari kiri) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-start">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm drawer-backdrop"
            onClick={onClose}
          />
          <div className="relative w-64 max-w-[85vw] h-[100dvh] z-10 shadow-2xl drawer-panel-left">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Keluar dari Sistem?"
        description="Sesi Anda saat ini akan diakhiri dan Anda akan diarahkan ke halaman login."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}
