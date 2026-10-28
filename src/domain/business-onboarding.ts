/**
 * Business onboarding (brief §4.2): the wizard steps and what's missing
 * before a business can be submitted for approval.
 */

export const BUSINESS_STEPS = [
  { key: "abn", title: "Your ABN" },
  { key: "details", title: "Billing contact" },
  { key: "sites", title: "Sites" },
  { key: "team", title: "Your team", optional: true },
  { key: "agreement", title: "Services agreement" },
  { key: "submit", title: "Check and submit" },
] as const;

export type BusinessStepKey = (typeof BUSINESS_STEPS)[number]["key"];

const KEYS: BusinessStepKey[] = BUSINESS_STEPS.map((step) => step.key);

export function nextBusinessStep(key: BusinessStepKey): BusinessStepKey {
  return KEYS[KEYS.indexOf(key) + 1] ?? "submit";
}

export function previousBusinessStep(
  key: BusinessStepKey,
): BusinessStepKey | null {
  return KEYS[KEYS.indexOf(key) - 1] ?? null;
}

export function resumeBusinessStep(done: readonly string[]): BusinessStepKey {
  return (
    KEYS.find((key) => key !== "submit" && !done.includes(key)) ?? "submit"
  );
}

export type BusinessSnapshot = {
  abnActive: boolean;
  billingContactName: string | null;
  accountsEmail: string | null;
  siteCount: number;
  agreementAccepted: boolean;
};

export function missingBusinessSteps(
  snapshot: BusinessSnapshot,
): BusinessStepKey[] {
  const missing: BusinessStepKey[] = [];
  if (!snapshot.abnActive) missing.push("abn");
  if (!snapshot.billingContactName || !snapshot.accountsEmail) {
    missing.push("details");
  }
  if (snapshot.siteCount === 0) missing.push("sites");
  if (!snapshot.agreementAccepted) missing.push("agreement");
  return missing;
}
