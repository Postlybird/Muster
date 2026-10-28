export type AbnDetails = {
  /** 11 digits, no spaces. */
  abn: string;
  status: "active" | "cancelled";
  statusEffectiveFrom: string | null;
  entityName: string;
  entityTypeCode: string;
  entityTypeName: string;
  businessNames: string[];
  /** Date GST registration started (yyyy-mm-dd), or null if not registered. */
  gstRegisteredFrom: string | null;
  acn: string | null;
  state: string | null;
  postcode: string | null;
};

export type AbnLookupResult =
  | { found: true; details: AbnDetails }
  | {
      found: false;
      reason: "invalid" | "not_found" | "unavailable";
      message: string;
    };

/** Looks up an ABN on the Australian Business Register (brief §4.2). */
export interface AbnLookup {
  readonly name: string;
  lookup(abn: string): Promise<AbnLookupResult>;
}
