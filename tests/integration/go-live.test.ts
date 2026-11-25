import { describe, it, expect } from "vitest";
import { getGoLiveChecklist } from "@/services/go-live.service";

describe("Checklist Go-Live", () => {
  it("memeriksa kesiapan operasional toko sebelum Go-Live", async () => {
    const checklist = await getGoLiveChecklist();
    expect(checklist.totalChecks).toBe(8);
    expect(checklist.score).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(checklist.checks)).toBe(true);

    const pinCheck = checklist.checks.find((c) => c.id === "pin");
    expect(pinCheck).toBeDefined();
  });
});
