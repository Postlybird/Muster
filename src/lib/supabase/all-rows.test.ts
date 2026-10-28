import { describe, expect, it } from "vitest";

import { allRows, PAGE_SIZE } from "./all-rows";

function tableOf(length: number) {
  const table = Array.from({ length }, (_, i) => i);
  const asked: number[][] = [];
  const page = async (from: number, to: number) => {
    asked.push([from, to]);
    return { data: table.slice(from, to + 1), error: null };
  };
  return { table, asked, page };
}

describe("reading every row", () => {
  it("goes a page at a time until a page isn't full", async () => {
    const { table, asked, page } = tableOf(PAGE_SIZE * 2 + 3);
    expect(await allRows("numbers", page)).toEqual(table);
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("checks for more after a full page", async () => {
    const { table, asked, page } = tableOf(PAGE_SIZE);
    expect(await allRows("numbers", page)).toEqual(table);
    expect(asked).toHaveLength(2);
  });

  it("says what it couldn't load", async () => {
    await expect(
      allRows("tickets", async () => ({
        data: null,
        error: { message: "timeout" },
      })),
    ).rejects.toThrow("Couldn't load tickets: timeout");
  });
});
