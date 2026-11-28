import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/services/settings.service";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { prisma } from "@/lib/db";
import { resolvePermissions } from "@/lib/auth/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, permissions: true, nama: true, aktif: true },
  });

  if (!dbUser || !dbUser.aktif) {
    redirect("/login");
  }

  const freshUser = {
    ...session,
    nama: dbUser.nama,
    role: dbUser.role,
    permissions: resolvePermissions(dbUser.role, dbUser.permissions),
  };

  const settings = await getSettings();

  return (
    <DashboardShell user={freshUser} storeName={settings.namaToko}>
      {children}
    </DashboardShell>
  );
}
