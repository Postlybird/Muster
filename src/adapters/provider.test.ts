import { afterEach, describe, expect, it, vi } from "vitest";

import { providerFor } from "./provider";

describe("providerFor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the mock", () => {
    vi.stubEnv("SMS_PROVIDER", "");
    expect(providerFor("SMS_PROVIDER", ["mock"])).toBe("mock");
  });

  it("refuses providers that haven't been set up", () => {
    vi.stubEnv("SMS_PROVIDER", "twilio");
    expect(() => providerFor("SMS_PROVIDER", ["mock"])).toThrow(
      /isn't available/,
    );
  });
});
