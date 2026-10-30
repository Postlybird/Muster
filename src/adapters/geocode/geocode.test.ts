import { describe, expect, it } from "vitest";

import { searchSuburbs } from "@/data/suburbs";

import { MockGeocoder } from "./mock";

describe("suburb search", () => {
  it("puts names that start with the query first", () => {
    expect(searchSuburbs("parra")[0]?.name).toBe("Parramatta");
    expect(searchSuburbs("par").map((s) => s.name)).toContain("Parap");
  });

  it("knows suburbs in every state and territory", () => {
    const states = new Set(
      ["Fremantle", "Glenelg", "Fortitude Valley", "Fitzroy", "Braddon"]
        .concat(["Sandy Bay", "Darwin City", "Parramatta"])
        .map((name) => searchSuburbs(name)[0]?.state),
    );
    expect(states).toEqual(
      new Set(["WA", "SA", "QLD", "VIC", "ACT", "TAS", "NT", "NSW"]),
    );
  });

  it("searches by postcode", () => {
    expect(searchSuburbs("2170").map((s) => s.name)).toEqual([
      "Liverpool",
      "Moorebank",
      "Prestons",
    ]);
  });
});

describe("mock geocoder", () => {
  const geocoder = new MockGeocoder();

  it("offers each state's suburb when two share a name, unless the state is typed", async () => {
    const both = await geocoder.suggest("12 Swan St, Richmond");
    expect(both.map((s) => s.label)).toEqual([
      "12 Swan St, Richmond NSW 2753",
      "12 Swan St, Richmond VIC 3121",
    ]);
    const [vic] = await geocoder.suggest("12 Swan St, Richmond VIC");
    expect(vic?.label).toBe("12 Swan St, Richmond VIC 3121");
    const resolved = await geocoder.resolve(vic!.id);
    expect(resolved).toMatchObject({ state: "VIC", postcode: "3121" });
  });

  it("suggests suburbs only when asked for a suburb", async () => {
    const suggestions = await geocoder.suggest("12 George St, Parramatta", {
      kind: "suburb",
    });
    expect(suggestions).toEqual([]);
    const [suburb] = await geocoder.suggest("parra", { kind: "suburb" });
    expect(suburb?.label).toBe("Parramatta NSW 2150");
    expect(await geocoder.resolve(suburb!.id)).toMatchObject({
      line1: null,
      suburb: "Parramatta",
      postcode: "2150",
    });
  });

  it("turns a street address and suburb into one suggestion", async () => {
    const [suggestion] = await geocoder.suggest("12 george st, parramatta");
    expect(suggestion?.label).toBe("12 George St, Parramatta NSW 2150");
  });

  it("prefers the longest suburb name", async () => {
    const [suggestion] = await geocoder.suggest("1 Miller St North Sydney");
    expect(suggestion?.label).toBe("1 Miller St, North Sydney NSW 2060");
  });

  it("takes the suburb at the end, not one in the street name", async () => {
    const [suggestion] = await geocoder.suggest("42 Parramatta Rd, Granville");
    expect(suggestion?.label).toMatch(/^42 Parramatta Rd, Granville NSW/);
  });

  it("places an address near its suburb, the same way every time", async () => {
    const [suggestion] = await geocoder.suggest("12 George St, Parramatta");
    const first = await geocoder.resolve(suggestion!.id);
    const second = await geocoder.resolve(suggestion!.id);
    expect(first).toEqual(second);
    expect(first?.postcode).toBe("2150");
    expect(Math.abs(first!.lat - -33.815)).toBeLessThan(0.005);
    expect(Math.abs(first!.lng - 151.0011)).toBeLessThan(0.006);
  });

  it("offers suburbs while the suburb is being typed", async () => {
    const suggestions = await geocoder.suggest("chats");
    expect(suggestions[0]?.label).toBe("Chatswood NSW 2067");
  });

  it("returns nothing it can't place", async () => {
    expect(await geocoder.suggest("12 Unknown Rd")).toEqual([]);
    expect(await geocoder.resolve("not-an-id")).toBeNull();
  });
});
