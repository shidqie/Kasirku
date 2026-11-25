import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { verifyOwnerPin, updateOwnerPin } from "@/services/pin.service";
import bcrypt from "bcryptjs";

describe("PIN Owner & Rate-Limiting Integration Tests", () => {
  const TEST_PIN = "123456";

  beforeAll(async () => {
    const hash = await bcrypt.hash(TEST_PIN, 10);
    await prisma.pengaturanToko.upsert({
      where: { id: "default" },
      update: {
        pinOwnerHash: hash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
      create: {
        id: "default",
        namaToko: "Toko Uji PIN",
        pinOwnerHash: hash,
        pembulatan: "BULAT_0",
        batasDiskonStaff: 0,
        ambangUtangLamaHari: 30,
        bolehJualStokNol: false,
      },
    });
  });

  afterAll(async () => {
    // Reset status pin
    const hash = await bcrypt.hash(TEST_PIN, 10);
    await prisma.pengaturanToko.update({
      where: { id: "default" },
      data: {
        pinOwnerHash: hash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });
  });

  it("User Story A3: Verifikasi PIN benar harus valid", async () => {
    const result = await verifyOwnerPin(TEST_PIN);
    expect(result.valid).toBe(true);
  });

  it("User Story A3: PIN salah harus mengurangi sisa percobaan dan mencatat counter", async () => {
    // Percobaan salah 1
    const res1 = await verifyOwnerPin("000000");
    expect(res1.valid).toBe(false);
    expect(res1.remainingAttempts).toBe(2);

    // Percobaan salah 2
    const res2 = await verifyOwnerPin("000000");
    expect(res2.valid).toBe(false);
    expect(res2.remainingAttempts).toBe(1);

    // Percobaan salah 3 -> harus terkunci
    const res3 = await verifyOwnerPin("000000");
    expect(res3.valid).toBe(false);
    expect(res3.remainingAttempts).toBe(0);
    expect(res3.message).toContain("dikunci");
    expect(res3.lockedUntil).toBeDefined();

    // Percobaan saat terkunci (meskipun PIN benar) harus tetap ditolak
    const res4 = await verifyOwnerPin(TEST_PIN);
    expect(res4.valid).toBe(false);
    expect(res4.message).toContain("PIN terkunci");
  });

  it("User Story A3: Owner dapat mengubah PIN setelah lock dibersihkan", async () => {
    // Bersihkan lock untuk pengujian ubah PIN
    await prisma.pengaturanToko.update({
      where: { id: "default" },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });

    const updateRes = await updateOwnerPin(TEST_PIN, "654321", "dummy_owner_id");
    expect(updateRes.success).toBe(true);

    // Verifikasi dengan PIN baru
    const newVerify = await verifyOwnerPin("654321");
    expect(newVerify.valid).toBe(true);

    // Kembalikan ke TEST_PIN
    await updateOwnerPin("654321", TEST_PIN, "dummy_owner_id");
  });
});

