import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OldStockManagementPage() {
  redirect("/owner/produk?tab=stok");
}
