"use client";

import { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavbar } from "@/components/layout/BottomNavbar";
import { SessionPayload } from "@/lib/auth/session";

interface DashboardShellProps {
  user: SessionPayload;
  storeName: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, storeName, children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] w-full bg-white dark:bg-[#121214] flex flex-col transition-colors overflow-x-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Full Page Shell Container */}
        <div className="w-full h-[100dvh] flex overflow-hidden">
          {/* Sidebar Component */}
          <Sidebar
            user={user}
            storeName={storeName}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#121214]">
            <Navbar
              storeName={storeName}
              onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
            />
            <main
              className={`flex-1 min-h-0 flex flex-col overflow-y-auto relative px-4 sm:px-8 pt-4 ${
                pathname === "/kasir" ? "pb-6" : "pb-24 lg:pb-6"
              }`}
            >
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 lg:min-h-0 flex flex-col"
              >
                {children}
              </motion.div>
            </main>
            <Suspense fallback={null}>
              <BottomNavbar
                user={user}
                onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
