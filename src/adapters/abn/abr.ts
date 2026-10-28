import { z } from "zod";

import type { AbnDetails, AbnLookup, AbnLookupResult } from "./types";
import { isValidAbn, normaliseAbn } from "./validate";

const ENDPOINT = "https://abr.business.gov.au/json/AbnDetails.aspx";

const abrResponse = z.object({
  Abn: z.string().default(""),
  AbnStatus: z.string().default(""),
  AbnStatusEffectiveFrom: z.string().nullish(),
  Acn: z.string().nullish(),
  AddressPostcode: z.string().nullish(),
  AddressState: z.string().nullish(),
  BusinessName: z.array(z.string()).nullish(),
  EntityName: z.string().default(""),
  EntityTypeCode: z.string().default(""),
  EntityTypeName: z.string().default(""),
  Gst: z.string().nullish(),
  Message: z.string().default(""),
});

/**
 * The ABN Lookup JSON service answers with JSONP ("callback({...})"), so we
 * call it server-side and unwrap the JSON (brief §8).
 */
export function unwrapJsonp(body: string): unknown {
  const start = body.indexOf("(");
  const end = body.lastIndexOf(")");
  if (start === -1 || end <= start) {
    throw new Error("ABN Lookup returned an unexpected response.");
  }
  return JSON.parse(body.slice(start + 1, end));
}

export function mapAbrResponse(raw: unknown): AbnLookupResult {
  const parsed = abrResponse.safeParse(raw);
  if (!parsed.success) {
    return {
      found: false,
      reason: "unavailable",
      message: "ABN Lookup returned data we couldn't read.",
    };
  }
  const r = parsed.data;
  if (!r.Abn) {
    return {
      found: false,
      reason: "not_found",
      message: r.Message || "No business is registered with that ABN.",
    };
  }
  const details: AbnDetails = {
    abn: r.Abn,
    status: r.AbnStatus.toLowerCase() === "active" ? "active" : "cancelled",
    statusEffectiveFrom: r.AbnStatusEffectiveFrom || null,
    entityName: r.EntityName,
    entityTypeCode: r.EntityTypeCode,
    entityTypeName: r.EntityTypeName,
    businessNames: r.BusinessName ?? [],
    gstRegisteredFrom: r.Gst || null,
    acn: r.Acn || null,
    state: r.AddressState || null,
    postcode: r.AddressPostcode || null,
  };
  return { found: true, details };
}

/** Live lookups against the Australian Business Register (free; needs a GUID). */
export class AbrAbnLookup implements AbnLookup {
  readonly name = "abr";

  constructor(
    private readonly guid: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async lookup(input: string): Promise<AbnLookupResult> {
    const abn = normaliseAbn(input);
    if (!isValidAbn(abn)) {
      return {
        found: false,
        reason: "invalid",
        message: "That isn't a valid ABN. Check the 11 digits.",
      };
    }
    const url = new URL(ENDPOINT);
    url.searchParams.set("abn", abn);
    url.searchParams.set("callback", "callback");
    url.searchParams.set("guid", this.guid);

    try {
      const response = await this.fetcher(url, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) {
        return {
          found: false,
          reason: "unavailable",
          message: "ABN Lookup isn't responding. Try again shortly.",
        };
      }
      return mapAbrResponse(unwrapJsonp(await response.text()));
    } catch {
      return {
        found: false,
        reason: "unavailable",
        message: "ABN Lookup isn't responding. Try again shortly.",
      };
    }
  }
}
