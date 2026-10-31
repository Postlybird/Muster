import { describe, expect, it } from "vitest";

import { BIO_MAX, WORKER_WORDS_MAX, workerWordsProblem } from "./worker-words";

describe("workerWordsProblem", () => {
  it("accepts ordinary words about experience", () => {
    for (const text of [
      "",
      "Three years on flood and fire jobs. White card, my own boots and a ute.",
      "Worked for a restoration company from 2018-2022 and 2023 to now.",
      "Did 2,000 hours of strip-out work, e.g. kitchens and bathrooms.",
      "Level 2 first aid. ABN 12 345 678 901 is not a phone number.",
    ]) {
      expect(workerWordsProblem(text)).toBeNull();
    }
  });

  it(`stops at ${WORKER_WORDS_MAX} characters, counting emoji once`, () => {
    expect(workerWordsProblem("a".repeat(WORKER_WORDS_MAX))).toBeNull();
    expect(workerWordsProblem("a".repeat(WORKER_WORDS_MAX + 1))).toMatch(
      /300 characters/,
    );
    expect(workerWordsProblem("👍".repeat(WORKER_WORDS_MAX))).toBeNull();
  });

  it(`lets a bio run to ${BIO_MAX} characters`, () => {
    expect(workerWordsProblem("a".repeat(BIO_MAX), BIO_MAX)).toBeNull();
    expect(workerWordsProblem("a".repeat(BIO_MAX + 1), BIO_MAX)).toMatch(
      /500 characters/,
    );
  });

  it("finds phone numbers however they're written", () => {
    for (const text of [
      "Call me on 0412 345 678",
      "ring 0412345678",
      "+61 412 345 678 any time",
      "(02) 9876 5432",
      "0412-345-678",
      "0412.345.678",
      "1300 123 456",
      "13 14 50",
    ]) {
      expect(workerWordsProblem(text), text).toMatch(/phone number/);
    }
  });

  it("finds email addresses and links", () => {
    expect(workerWordsProblem("sam.lee@example.com")).toMatch(/email/);
    expect(workerWordsProblem("See https://example.org/me")).toMatch(/link/);
    expect(workerWordsProblem("my site www.samlee.dev")).toMatch(/link/);
    expect(workerWordsProblem("samlee.com.au has photos")).toMatch(/link/);
  });
});
