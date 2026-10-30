import { describe, expect, it } from "vitest";

import {
  groupByIndustry,
  industryCode,
  industrySlug,
  OTHER_WORK,
  workTypeNeeds,
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

describe("workTypeNeeds", () => {
  const ticket = (name: string, sort_order: number, active = true) => ({
    credential_types: { name, sort_order, active },
  });

  it("lists active tickets in order, and a police check where required", () => {
    expect(
      workTypeNeeds({
        police_check_required: true,
        category_credentials: [
          ticket("Traffic controller card", 20),
          ticket("Old ticket", 5, false),
          ticket("White Card", 10),
        ],
      }),
    ).toEqual([
      "White Card",
      "Traffic controller card",
      "National Police Check",
    ]);
  });

  it("doesn't add a second police check", () => {
    expect(
      workTypeNeeds({
        police_check_required: true,
        category_credentials: [ticket("National Police Check", 10)],
      }),
    ).toEqual(["National Police Check"]);
  });

  it("names a ticket issued state by state by what every state's has in common", () => {
    const rsa = (name: string) => ({
      credential_types: {
        name,
        family: "Responsible Service of Alcohol (RSA)",
        sort_order: 10,
        active: true,
      },
    });
    expect(
      workTypeNeeds({
        police_check_required: false,
        category_credentials: [
          rsa("RSA (NSW Competency Card)"),
          rsa("RSA (Victoria)"),
        ],
      }),
    ).toEqual(["Responsible Service of Alcohol (RSA)"]);
  });
});
