import { describe, it, expect } from "vitest";
import { formatRupiah, formatDecimal, formatDate, formatDateTime } from "@/lib/formatters";

describe("Formatters Unit Tests", () => {
  it("formatRupiah harus memformat integer rupiah dengan standar Indonesia tanpa desimal", () => {
    expect(formatRupiah(12500)).toBe("Rp 12.500");
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(1000000)).toBe("Rp 1.000.000");
    expect(formatRupiah(null)).toBe("Rp 0");
    expect(formatRupiah(undefined)).toBe("Rp 0");
  });

  it("formatDecimal harus mendukung hingga 3 desimal tanpa trailing zeros tidak perlu", () => {
    expect(formatDecimal(0.5)).toBe("0,5");
    expect(formatDecimal("0.5")).toBe("0,5");
    expect(formatDecimal(0.25)).toBe("0,25");
    expect(formatDecimal(250)).toBe("250");
    expect(formatDecimal(1.125)).toBe("1,125");
    expect(formatDecimal(0)).toBe("0");
  });

  it("formatDate dan formatDateTime menghasilkan teks yang valid", () => {
    const testDate = new Date("2026-11-20T10:30:00Z");
    expect(formatDate(testDate)).toBeTruthy();
    expect(formatDateTime(testDate)).toBeTruthy();
    expect(formatDate(null)).toBe("-");
  });
});

