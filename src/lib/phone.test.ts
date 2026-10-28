import { describe, expect, it } from "vitest";

import { formatAuPhone, normaliseAuMobile, normaliseAuPhone } from "./phone";

describe("normaliseAuMobile", () => {
  it.each([
    ["0412 345 678", "+61412345678"],
    ["0412345678", "+61412345678"],
    ["+61 412 345 678", "+61412345678"],
    ["+61412345678", "+61412345678"],
    ["61412345678", "+61412345678"],
    ["0061 412 345 678", "+61412345678"],
    ["(04) 1234-5678", "+61412345678"],
    ["412 345 678", "+61412345678"],
  ])("accepts %s", (input, expected) => {
    expect(normaliseAuMobile(input)).toBe(expected);
  });

  it.each([
    ["02 9876 5432"],
    ["0412 345 67"],
    ["0412 345 6789"],
    ["+1 415 555 0100"],
    ["04123456ab"],
    [""],
  ])("rejects %s", (input) => {
    expect(normaliseAuMobile(input)).toBeNull();
  });
});

describe("normaliseAuPhone", () => {
  it("accepts landlines and mobiles", () => {
    expect(normaliseAuPhone("(02) 9876 5432")).toBe("+61298765432");
    expect(normaliseAuPhone("03 9123 4567")).toBe("+61391234567");
    expect(normaliseAuPhone("0412 345 678")).toBe("+61412345678");
  });

  it("rejects other numbers", () => {
    expect(normaliseAuPhone("05 1234 5678")).toBeNull();
    expect(normaliseAuPhone("1300 123 456")).toBeNull();
  });
});

describe("formatAuPhone", () => {
  it("formats mobiles and landlines", () => {
    expect(formatAuPhone("+61412345678")).toBe("+61 412 345 678");
    expect(formatAuPhone("+61298765432")).toBe("+61 2 9876 5432");
  });

  it("leaves other values alone", () => {
    expect(formatAuPhone("+14155550100")).toBe("+14155550100");
    expect(formatAuPhone(null)).toBe("");
  });
});
