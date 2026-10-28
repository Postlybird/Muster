import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/worker/shifts?tab=open", "/")).toBe(
      "/worker/shifts?tab=open",
    );
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example/login"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["/worker\nSet-Cookie: x=1"],
  ])("falls back for %j", (input) => {
    expect(safeNextPath(input, "/fallback")).toBe("/fallback");
  });
});
