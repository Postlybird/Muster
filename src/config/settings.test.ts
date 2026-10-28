import { describe, expect, it } from "vitest";

import { parseSetting, SETTINGS, settingKeys } from "./settings";

describe("settings registry", () => {
  it.each(settingKeys)("%s: the default passes its own validation", (key) => {
    expect(
      SETTINGS[key].schema.safeParse(SETTINGS[key].defaultValue).success,
    ).toBe(true);
  });

  it("keeps commercial values private", () => {
    for (const key of [
      "margin_pct",
      "on_costs_pct",
      "urgent_loading_pct",
    ] as const) {
      expect(SETTINGS[key].isPublic).toBe(false);
    }
  });

  it("falls back to the default when a stored value is invalid", () => {
    expect(parseSetting("geofence_radius_m", "two hundred")).toEqual({
      value: 200,
      valid: false,
    });
    expect(parseSetting("geofence_radius_m", 350)).toEqual({
      value: 350,
      valid: true,
    });
    expect(
      parseSetting("quiet_hours", { start: "25:00", end: "06:00" }).valid,
    ).toBe(false);
  });
});
