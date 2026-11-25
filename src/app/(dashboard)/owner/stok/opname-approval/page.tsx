import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OldOpnameApprovalPage() {
  redirect("/stok/opname?tab=persetujuan");
}
