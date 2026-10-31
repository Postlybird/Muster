/**
 * Business sign-up (brief §4.2; owner, 01/11/2026): the owner confirms the
 * business from its ABN, we fill in the billing contact from their details,
 * and they accept the services agreement. Then it's submitted for our
 * approval. Sites are added while setting up the first shift.
 */

export const BUSINESS_STEPS = [
  { key: "abn", title: "Your business" },
  { key: "details", title: "Billing contact" },
  { key: "agreement", title: "Services agreement" },
] as const;

export type BusinessStepKey = (typeof BUSINESS_STEPS)[number]["key"];

export type BusinessSnapshot = {
  abnActive: boolean;
  billingContactName: string | null;
  accountsEmail: string | null;
  agreementAccepted: boolean;
};

/** What's still missing before a business can be submitted. */
export function missingBusinessSteps(
  snapshot: BusinessSnapshot,
): BusinessStepKey[] {
  const missing: BusinessStepKey[] = [];
  if (!snapshot.abnActive) missing.push("abn");
  if (!snapshot.billingContactName || !snapshot.accountsEmail) {
    missing.push("details");
  }
  if (!snapshot.agreementAccepted) missing.push("agreement");
  return missing;
}
