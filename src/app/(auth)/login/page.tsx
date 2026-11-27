import { getSettings } from "@/services/settings.service";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let storeName = process.env.STORE_NAME || "Toko Sembako";
  let logoToko = "/logo.png";
  try {
    const settings = await getSettings();
    if (settings?.namaToko) {
      storeName = settings.namaToko;
    }
    if (settings?.logoToko) {
      logoToko = settings.logoToko;
    }
  } catch {
    // Gunakan fallback jika database belum siap
  }

  return <LoginClient storeName={storeName} logoToko={logoToko} />;
}
