import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/services/settings.service";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const settings = await getSettings();

  return (
    <DashboardShell user={session} storeName={settings.namaToko}>
      {children}
    </DashboardShell>
  );
}
