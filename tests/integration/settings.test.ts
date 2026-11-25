import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getSettings, updateSettings, getPublicStoreInfo } from "@/services/settings.service";

describe("Settings Service Integration Tests", () => {
  let originalSettings: any;

  beforeAll(async () => {
    originalSettings = await getSettings();
  });

  afterAll(async () => {
    if (originalSettings) {
      await updateSettings(
        {
          namaToko: originalSettings.namaToko,
          alamat: originalSettings.alamat,
          telepon: originalSettings.telepon,
          footerStruk: originalSettings.footerStruk,
          pesanWhatsApp: originalSettings.pesanWhatsApp,
          pembulatan: originalSettings.pembulatan,
          batasDiskonStaff: originalSettings.batasDiskonStaff,
          ambangUtangLamaHari: originalSettings.ambangUtangLamaHari,
          bolehJualStokNol: originalSettings.bolehJualStokNol,
        },
        "test_restore"
      );
    }
  });
  it("Dapat mengambil pengaturan toko default dan info publik untuk struk", async () => {
    const settings = await getSettings();
    expect(settings).toBeDefined();
    expect(settings.id).toBe("default");

    const publicInfo = await getPublicStoreInfo();
    expect(publicInfo.namaToko).toBe(settings.namaToko);
    // Tidak boleh mengekspos PIN hash
    expect((publicInfo as any).pinOwnerHash).toBeUndefined();
  });

  it("Owner dapat memperbarui pengaturan toko dan mencatat perubahannya", async () => {
    const updated = await updateSettings(
      {
        namaToko: "Toko Sembako Berkah Mandiri",
        alamat: "Jl. Pasar Induk Blok A",
        telepon: "081299998888",
        footerStruk: "Terima kasih, selamat berbelanja kembali",
        pesanWhatsApp: "Halo Kak, ini struk belanja Anda.",
        pembulatan: "BULAT_100",
        batasDiskonStaff: 5000,
        ambangUtangLamaHari: 30,
        bolehJualStokNol: false,
      },
      "dummy_owner_id"
    );

    expect(updated.namaToko).toBe("Toko Sembako Berkah Mandiri");
    expect(updated.pembulatan).toBe("BULAT_100");
    expect(updated.batasDiskonStaff).toBe(5000);
  });
});

