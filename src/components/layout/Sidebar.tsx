"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Receipt,
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
} from "lucide-react";
import { SessionPayload } from "@/lib/auth/session";

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

  const groups: NavGroupConfig[] = isOwner
    ? [
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
            { label: "Barang Masuk", href: "/stok/barang-masuk", icon: PackagePlus },
            { label: "Stok", href: "/stok/perlu-belanja", icon: AlertTriangle, badgeKey: "lowStock" },
            { label: "Opname", href: "/stok/opname", icon: ClipboardCheck, badgeKey: "pendingOpname" },
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
          ],
        },
        {
          key: "laporan",
          title: "LAPORAN",
          collapsible: true,
          items: [
            { label: "Laporan Pendapatan", href: "/owner/laporan?tab=sales", icon: TrendingUp },
            { label: "Laporan Piutang", href: "/owner/laporan?tab=debts", icon: Users },
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
      ]
    : [
        {
          key: "operasional",
          title: "OPERASIONAL",
          collapsible: true,
          items: [
            { label: "Kasir", href: "/kasir", icon: ShoppingCart },
            { label: "Barang Masuk", href: "/stok/barang-masuk", icon: PackagePlus },
            { label: "Stok", href: "/stok/perlu-belanja", icon: AlertTriangle, badgeKey: "lowStock" },
            { label: "Opname", href: "/stok/opname", icon: ClipboardCheck },
            { label: "Piutang", href: "/member", icon: Users },
          ],
        },
      ];

  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});

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

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    }
  };

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (pathname.startsWith(`${href}/`)) return true;
    return false;
  };

  /* ─── SIDEBAR CONTENT ─────────────────────────────────────── */
  const sidebarContent = (
    <div className="flex flex-col h-full select-none bg-white dark:bg-[#18181B] border-r border-slate-200/70 dark:border-zinc-800">

      {/* ── Brand Header ── */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo Brand Toko Gagan 2 */}
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm bg-white border border-slate-100 dark:border-zinc-700 flex items-center justify-center p-0.5">
            <img
              src="/logo.png"
              alt={storeName}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-tight truncate">
              {storeName}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Kasirku POS
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group.key] || false;
          const visibleItems = group.items.filter((item) => {
            if (item.hideIfGoLiveDone && goLiveDone) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key}>
              {/* Group label */}
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
                        onClick={() => {
                          if (onClose) onClose();
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new CustomEvent("sidebar-navigated"));
                          }
                        }}
                        className={`group relative flex items-center justify-between px-3 h-11 rounded-2xl text-[13px] font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-red-50 dark:bg-red-950/40 text-[#F0090F] dark:text-red-400 font-bold shadow-2xs"
                            : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-800 dark:hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-[17px] h-[17px] shrink-0 ${
                              isActive
                                ? "text-[#F0090F] dark:text-red-400"
                                : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {badgeValue > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0"
                            style={{ background: "var(--primary)" }}
                          >
                            {badgeValue}
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
      <div className="px-4 pb-5 pt-3 border-t border-slate-100 dark:border-zinc-800 shrink-0 space-y-3">
        {/* User row */}
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
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme toggle — pill with two buttons, moon icon on inactive left + sun on inactive right */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-2xl p-1 gap-1">
          {/* Sun / Terang */}
          <button
            onClick={() => toggleTheme("light")}
            title="Mode Terang"
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold transition-all ${
              themeMode === "dark"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Gelap</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-60 flex-col h-full shrink-0 relative z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
