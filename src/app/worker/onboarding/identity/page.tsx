import type { Metadata } from "next";

import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { checkStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";

import { ContinueForm } from "../continue-form";
import { loadStep, StepFrame } from "../step-frame";
import { IdentityForm } from "./identity-form";

export const metadata: Metadata = { title: "Photo ID" };

export default async function IdentityPage() {
  const { worker, mode } = await loadStep();
  const supabase = await createClient();
  const { data: check } = await supabase
    .from("identity_checks")
    .select(
      "document_type, document_path, selfie_path, status, rejection_reason, reviewed_at, updated_at",
    )
    .eq("worker_id", worker.id)
    .maybeSingle();

  return (
    <StepFrame
      mode={mode}
      step="identity"
      completed={worker.onboarding_steps}
      title="Photo ID"
      description="A photo of your driver licence or passport, and a selfie, so we know it's really you."
    >
      {check?.status === "verified" ? (
        <div className="max-w-xl space-y-4">
          <WhatsNext
            title="Photo ID"
            status={checkStatuses.verified}
            detail={`Checked on ${formatDate(check.reviewed_at ?? check.updated_at)}.`}
          />
          {mode === "wizard" ? <ContinueForm step="identity" /> : null}
        </div>
      ) : (
        <div className="space-y-6">
          {check?.status === "rejected" ? (
            <Alert variant="destructive" className="max-w-xl">
              <AlertDescription className="text-foreground">
                We couldn&apos;t check your ID:{" "}
                {check.rejection_reason ?? "please upload clearer photos."}{" "}
                Upload new photos below.
              </AlertDescription>
            </Alert>
          ) : null}
          <IdentityForm
            mode={mode}
            workerId={worker.id}
            values={{
              documentType: check?.document_type ?? null,
              documentPath:
                check?.status === "rejected"
                  ? null
                  : (check?.document_path ?? null),
              selfiePath:
                check?.status === "rejected"
                  ? null
                  : (check?.selfie_path ?? null),
            }}
          />
        </div>
      )}
    </StepFrame>
  );
}
