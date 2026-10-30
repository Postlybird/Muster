import { describe, expect, it } from "vitest";

import {
  groupByIndustry,
  industryCode,
  industrySlug,
  OTHER_WORK,
} from "./industries";

const hospitality = { name: "Hospitality", sort_order: 10 };
const retail = { name: "Retail", sort_order: 50 };

describe("groupByIndustry", () => {
  it("groups work types in the industries' order, keeping their own order", () => {
    const groups = groupByIndustry([
      { name: "Retail sales assistant", industries: retail },
      { name: "Bartender", industries: hospitality },
      { name: "Merchandiser", industries: retail },
      { name: "Barista", industries: hospitality },
    ]);
    expect(groups.map((g) => [g.name, g.items.map((i) => i.name)])).toEqual([
      ["Hospitality", ["Bartender", "Barista"]],
      ["Retail", ["Retail sales assistant", "Merchandiser"]],
    ]);
  });

  it("lists work types without an industry last, as other work", () => {
    const groups = groupByIndustry([
      { name: "Odd job", industries: null },
      { name: "Bartender", industries: hospitality },
    ]);
    expect(groups.map((g) => g.name)).toEqual(["Hospitality", OTHER_WORK]);
  });
});

describe("industry page addresses", () => {
  it("use hyphens for the code's underscores, and back", () => {
    expect(industrySlug("warehousing_logistics")).toBe("warehousing-logistics");
    expect(industryCode("warehousing-logistics")).toBe("warehousing_logistics");
  });
});
