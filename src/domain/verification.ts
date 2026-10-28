/**
 * Checking workers (brief §4.1 step 10, §6). Pure rules shared by the
 * verification screens; the database enforces the same activation rule.
 */
import { addMonths } from "./onboarding";

type CheckStatus = "pending" | "verified" | "rejected" | "expired";

export type ActivationState = {
  status: "draft" | "pending" | "active" | "suspended" | "offboarded";
  photoStatus: CheckStatus | null;
  rightToWorkStatus: CheckStatus | null;
  identityStatus: CheckStatus | null;
  payrollStatus: "not_started" | "invited" | "complete";
};

/** What still stands between a worker and Active (plan question 9). */
export function activationBlockers(state: ActivationState): string[] {
  if (state.status !== "pending")
    return ["Only a worker waiting for checks can be activated"];
  const blockers: string[] = [];
  if (state.photoStatus !== "verified") blockers.push("Photo");
  if (state.rightToWorkStatus !== "verified") blockers.push("Right to work");
  if (state.identityStatus !== "verified") blockers.push("Photo ID");
  if (state.payrollStatus !== "complete") blockers.push("Payroll setup");
  return blockers;
}

/** Bridging visas are subclasses 010 to 070 (BVA to BVE). */
export function isBridgingVisa(subclass: string | null): boolean {
  return !!subclass && /^0[1-7]0$/.test(subclass.trim());
}

/**
 * When VEVO should be checked again (brief §4.1 step 3): at visa expiry,
 * or every few months for a bridging visa with no expiry date. Permanent
 * visas and citizens need no re-check.
 */
export function nextVevoCheck({
  basis,
  subclass,
  visaExpiry,
  checkedOn,
  bridgingRecheckMonths,
}: {
  basis: "citizen" | "permanent_resident" | "nz_citizen" | "visa";
  subclass: string | null;
  visaExpiry: string | null;
  checkedOn: string;
  bridgingRecheckMonths: number;
}): string | null {
  if (basis === "citizen") return null;
  if (visaExpiry) return visaExpiry;
  if (isBridgingVisa(subclass))
    return addMonths(checkedOn, bridgingRecheckMonths);
  return null;
}

/** Visa conditions that limit work (e.g. 8105 for students) are flagged for admin (brief §4.4). */
export function hasWorkLimit(conditions: string | null): boolean {
  if (!conditions || /\bno work limitation\b/i.test(conditions)) return false;
  return /\b810[45]\b|limited to|\d+ hours (per|a) (week|fortnight)/i.test(
    conditions,
  );
}
