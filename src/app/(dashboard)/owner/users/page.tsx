import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OldUsersPage() {
  redirect("/owner/pengaturan?tab=pengguna");
}
