import type { AbnDetails, AbnLookup, AbnLookupResult } from "./types";
import { isValidAbn, normaliseAbn } from "./validate";

const company = (
  abn: string,
  entityName: string,
  businessNames: string[],
  overrides: Partial<AbnDetails> = {},
): AbnDetails => ({
  abn,
  status: "active",
  statusEffectiveFrom: "2015-07-01",
  entityName,
  entityTypeCode: "PRV",
  entityTypeName: "Australian Private Company",
  businessNames,
  gstRegisteredFrom: "2015-07-01",
  acn: abn.slice(2),
  state: "NSW",
  postcode: "2000",
  ...overrides,
});

/** Made-up businesses used by the demo data. Valid checksums, fictional names. */
export const DEMO_ABNS: Record<string, AbnDetails> = {
  "90551661605": company(
    "90551661605",
    "HARBOUR RESTORATION GROUP PTY LTD",
    ["Harbour Restoration"],
    {
      postcode: "2150",
    },
  ),
  "87192327523": company(
    "87192327523",
    "WESTSIDE PROPERTY SERVICES PTY LTD",
    ["Westside Cleaning"],
    {
      postcode: "2148",
    },
  ),
  "28322761077": company(
    "28322761077",
    "NORTHERN BEACHES MAKE SAFE PTY LTD",
    ["Beaches Make Safe"],
    {
      postcode: "2100",
    },
  ),
  "50893268002": company(
    "50893268002",
    "SOUTHERN CROSS CONTENTS PTY LTD",
    ["Southern Cross Pack-out"],
    {
      postcode: "2232",
    },
  ),
  "21533645048": company("21533645048", "PARKER, JORDAN", ["JP Carpet Care"], {
    entityTypeCode: "IND",
    entityTypeName: "Individual/Sole Trader",
    gstRegisteredFrom: null,
    acn: null,
    postcode: "2770",
  }),
  "74077011037": company(
    "74077011037",
    "OLD MATE CLEANING PTY LTD",
    ["Old Mate Cleaning"],
    {
      status: "cancelled",
      statusEffectiveFrom: "2023-06-30",
    },
  ),
  "41824754014": company(
    "41824754014",
    "SHUTTERED SERVICES PTY LTD",
    ["Shuttered Services"],
    {
      status: "cancelled",
      statusEffectiveFrom: "2024-03-31",
    },
  ),
};

/**
 * Demo lookups: the businesses above, plus a made-up active company for any
 * other ABN with a valid checksum, so new demo sign-ups can get through.
 */
export class MockAbnLookup implements AbnLookup {
  readonly name = "mock";

  async lookup(input: string): Promise<AbnLookupResult> {
    const abn = normaliseAbn(input);
    if (!isValidAbn(abn)) {
      return {
        found: false,
        reason: "invalid",
        message: "That isn't a valid ABN. Check the 11 digits.",
      };
    }
    const known = DEMO_ABNS[abn];
    if (known) return { found: true, details: known };
    return {
      found: true,
      details: company(abn, `DEMO BUSINESS ${abn.slice(-4)} PTY LTD`, [
        `Demo Business ${abn.slice(-4)}`,
      ]),
    };
  }
}
