import type { CheckOutcome } from "../identity";

/**
 * Right to work (brief §4.1 step 3). Australian citizens upload proof of
 * citizenship (VEVO can't confirm citizenship). Everyone else gives consent
 * for a VEVO check. v1 is manual: an admin checks VEVO in ImmiAccount and
 * records the result. Later: VEVO via a provider (brief §8).
 */
export type RightToWorkRequest =
  | { workerId: string; basis: "citizen"; evidencePath: string }
  | {
      workerId: string;
      basis: "visa";
      passportNumber: string;
      passportCountry: string;
      visaGrantNumber: string | null;
      consentedAt: string;
    };

export interface RightToWorkChecker {
  readonly name: string;
  readonly automatic: boolean;
  submit(request: RightToWorkRequest): Promise<CheckOutcome>;
}

export class ManualVevoChecker implements RightToWorkChecker {
  readonly name = "manual-vevo";
  readonly automatic = false;

  async submit(request: RightToWorkRequest): Promise<CheckOutcome> {
    return {
      status: "pending_review",
      instructions:
        request.basis === "citizen"
          ? "Check the citizenship evidence (Australian passport, or birth or citizenship certificate) matches the worker's name and date of birth."
          : "Run a VEVO check in ImmiAccount using the passport details, then record the result, visa subclass, expiry date and any work conditions.",
    };
  }
}

export function getRightToWorkChecker(): RightToWorkChecker {
  return new ManualVevoChecker();
}
