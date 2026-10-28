import type { CheckOutcome } from "../identity";

/**
 * National Police Checks (brief §4.1 step 7). v1: the worker uploads an
 * existing certificate and an admin reviews it. Ordering a check in the app
 * comes in Phase 2 through an ACIC-accredited provider (brief §8).
 */
export type PoliceCheckUpload = {
  workerId: string;
  documentPath: string;
  issuedOn: string;
  reference: string | null;
};

export interface PoliceCheckProvider {
  readonly name: string;
  /** Whether workers can order a new check through the app. */
  readonly canOrder: boolean;
  submitExisting(upload: PoliceCheckUpload): Promise<CheckOutcome>;
}

export class ManualPoliceCheckProvider implements PoliceCheckProvider {
  readonly name = "manual";
  readonly canOrder = false;

  async submitExisting(): Promise<CheckOutcome> {
    return {
      status: "pending_review",
      instructions:
        "Check the certificate is a National Police Check in the worker's name, note the issue date and reference, and check it's within the maximum accepted age.",
    };
  }
}

export function getPoliceCheckProvider(): PoliceCheckProvider {
  return new ManualPoliceCheckProvider();
}
