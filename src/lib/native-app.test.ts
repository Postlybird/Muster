import { describe, expect, it } from "vitest";

import { appLinkPath, inNativeApp, nativePlatform } from "./native-app";

describe("appLinkPath", () => {
  const origin = "https://www.example.test";

  it("keeps the path, query and fragment of a link to this site", () => {
    expect(
      appLinkPath("https://www.example.test/worker/shifts/abc?x=1#top", origin),
    ).toBe("/worker/shifts/abc?x=1#top");
  });

  it("ignores links to other sites, and anything that isn't a link", () => {
    expect(appLinkPath("https://evil.example/worker", origin)).toBeNull();
    expect(appLinkPath("http://www.example.test/worker", origin)).toBeNull();
    expect(appLinkPath("not a url", origin)).toBeNull();
  });
});

describe("outside the app", () => {
  it("is the web", () => {
    expect(inNativeApp()).toBe(false);
    expect(nativePlatform()).toBe("web");
  });
});
