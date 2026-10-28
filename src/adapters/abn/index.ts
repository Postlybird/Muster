import "server-only";

import { AbrAbnLookup } from "./abr";
import { MockAbnLookup } from "./mock";
import type { AbnLookup } from "./types";

export type { AbnDetails, AbnLookup, AbnLookupResult } from "./types";
export { formatAbn, isValidAbn, normaliseAbn } from "./validate";

/** Live ABN Lookup when a GUID is configured, otherwise the demo mock. */
export function getAbnLookup(): AbnLookup {
  const guid = process.env.ABN_LOOKUP_GUID;
  if (guid && process.env.ABN_PROVIDER !== "mock")
    return new AbrAbnLookup(guid);
  return new MockAbnLookup();
}
