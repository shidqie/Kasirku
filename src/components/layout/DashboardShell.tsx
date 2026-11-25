"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SessionPayload } from "@/lib/auth/session";

interface DashboardShellProps {
  user: SessionPayload;
  storeName: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, storeName, children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#121214] flex flex-col transition-colors">
      {/* Full Page Shell Container */}
      <div className="w-full h-screen flex overflow-hidden">
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
          <main className="flex-1 min-h-0 flex flex-col overflow-y-auto relative px-4 sm:px-8 pb-6 pt-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
