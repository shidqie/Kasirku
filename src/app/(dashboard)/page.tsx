import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function DashboardIndexPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "OWNER") {
    redirect("/owner/dashboard");
  } else {
    redirect("/kasir");
  }
}

