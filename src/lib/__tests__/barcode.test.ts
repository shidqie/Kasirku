import { describe, expect, it } from "vitest";
import { isValidEan13Checksum, parseScan } from "../barcode";

describe("parseScan", () => {
  it("menerima angka EAN-13, EAN-8, UPC-A, dan GTIN-14 (8-14 digit)", () => {
    expect(parseScan("8996001600142")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "ean",
    });
    expect(parseScan("  12345670  ")).toEqual({
      type: "product",
      code: "12345670",
      source: "ean",
    });
    expect(parseScan("08996001600142")).toEqual({
      type: "product",
      code: "08996001600142",
      source: "ean",
    });
  });

  it("mengabaikan link domain halal BPJPH / SiHalal beserta subdomainnya", () => {
    expect(parseScan("https://halal.go.id/sertifikat/123")).toEqual({ type: "ignore" });
    expect(parseScan("https://bpjph.halal.go.id/info/ID12345")).toEqual({ type: "ignore" });
    expect(parseScan("https://sihalal.halal.go.id/cek?id=99")).toEqual({ type: "ignore" });
    expect(parseScan("http://cek.halal.go.id/01/08996001600142")).toEqual({ type: "ignore" });
  });

  it("mengekstrak GTIN dari GS1 Digital Link yang valid", () => {
    expect(parseScan("https://id.example.com/01/08996001600142")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "qr",
    });
    expect(parseScan("https://produk.toko.id/01/8996001600142/10/BATCH1")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "qr",
    });
  });

  it("mengabaikan link acak dan teks acak", () => {
    expect(parseScan("https://instagram.com/cimoryindonesia")).toEqual({ type: "ignore" });
    expect(parseScan("https://google.com")).toEqual({ type: "ignore" });
    expect(parseScan("HALAL INDONESIA")).toEqual({ type: "ignore" });
    expect(parseScan("12345")).toEqual({ type: "ignore" });
    expect(parseScan("")).toEqual({ type: "ignore" });
  });

  it("mengekstrak GTIN dari format GS1 mentah (01)... dan 01...", () => {
    expect(parseScan("(01)08996001600142")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "gtin",
    });
    expect(parseScan("(01)08996001600142(10)LOT99")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "gtin",
    });
    expect(parseScan("0108996001600142")).toEqual({
      type: "product",
      code: "8996001600142",
      source: "gtin",
    });
  });
});

describe("isValidEan13Checksum", () => {
  it("memvalidasi checksum EAN-13 yang benar dan salah", () => {
    expect(isValidEan13Checksum("8996001600146")).toBe(true);
    expect(isValidEan13Checksum("4006381333931")).toBe(true);
    expect(isValidEan13Checksum("8996001600149")).toBe(false);
    expect(isValidEan13Checksum("12345")).toBe(false);
  });
});
