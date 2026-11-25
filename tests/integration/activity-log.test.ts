import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { logActivity, getActivityLogs } from "@/services/activity-log.service";

describe("Activity Log Integration Tests", () => {
  let ownerId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    ownerId = owner?.id || "fallback";
  });

  it("User Story A4: Mencatat log aktivitas audit trail dengan informasi lengkap", async () => {
    const log = await logActivity({
      userId: ownerId,
      role: "OWNER",
      aksi: "TEST_ACTION_A4",
      entitas: "TestEntitas",
      entitasId: "item-123",
      sebelumJson: { harga: 10000 },
      sesudahJson: { harga: 12000 },
      ip: "127.0.0.1",
    });

    expect(log).toBeDefined();
    expect(log?.aksi).toBe("TEST_ACTION_A4");
    expect(log?.entitas).toBe("TestEntitas");

    // Ambil log dari database
    const { items, total } = await getActivityLogs({
      aksi: "TEST_ACTION_A4",
      entitas: "TestEntitas",
    });

    expect(total).toBeGreaterThanOrEqual(1);
    const found = items.find((i) => i.id === log?.id);
    expect(found).toBeDefined();
    expect(found?.aksi).toBe("TEST_ACTION_A4");
  });
});
