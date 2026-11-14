import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

import { appleAppSiteAssociation, assetLinks } from "./app-links";

const PRINT = Array.from({ length: 32 }, () => "AB").join(":");

describe("assetLinks", () => {
  it("isn't there until Google Play gives the app's fingerprint", () => {
    expect(assetLinks(undefined)).toBeNull();
    expect(assetLinks("not a fingerprint")).toBeNull();
  });

  it("names the app and each fingerprint", () => {
    expect(assetLinks(` ${PRINT.toLowerCase()} , junk`)).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: brand.appId,
          sha256_cert_fingerprints: [PRINT],
        },
      },
    ]);
  });
});

describe("appleAppSiteAssociation", () => {
  it("isn't there until Apple gives the Team ID", () => {
    expect(appleAppSiteAssociation(undefined)).toBeNull();
    expect(appleAppSiteAssociation("short")).toBeNull();
  });

  it("opens every page but the API in the app", () => {
    expect(appleAppSiteAssociation("abcde12345")).toEqual({
      applinks: {
        details: [
          {
            appIDs: [`ABCDE12345.${brand.appId}`],
            components: [{ "/": "/api/*", exclude: true }, { "/": "*" }],
          },
        ],
      },
    });
  });
});
