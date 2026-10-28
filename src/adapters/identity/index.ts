/**
 * Identity checks: photo ID plus a selfie (brief §4.1 step 4). v1 is manual:
 * an admin compares them in the verification queue. Later: Stripe Identity
 * or a DVS driver licence check provider (brief §8).
 */
export type IdentityDocumentType = "driver_licence" | "passport";

export type IdentityCheckRequest = {
  workerId: string;
  documentType: IdentityDocumentType;
  documentPath: string;
  selfiePath: string;
};

export type CheckOutcome =
  | { status: "pending_review"; instructions: string }
  | { status: "verified"; reference: string }
  | { status: "failed"; reason: string };

export interface IdentityVerifier {
  readonly name: string;
  readonly automatic: boolean;
  submit(request: IdentityCheckRequest): Promise<CheckOutcome>;
}

export class ManualIdentityVerifier implements IdentityVerifier {
  readonly name = "manual";
  readonly automatic = false;

  async submit(): Promise<CheckOutcome> {
    return {
      status: "pending_review",
      instructions:
        "Compare the photo ID with the selfie and the name and date of birth entered, then approve or reject.",
    };
  }
}

export function getIdentityVerifier(): IdentityVerifier {
  return new ManualIdentityVerifier();
}
