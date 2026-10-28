import type { Metadata } from "next";

import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { checkStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";

import { ContinueForm } from "../continue-form";
import { loadStep, StepFrame } from "../step-frame";
import { BASIS_LABELS } from "./options";
import { RightToWorkForm } from "./right-to-work-form";

export const metadata: Metadata = { title: "Right to work" };

export default async function RightToWorkPage() {
  const { worker, mode } = await loadStep();
  const supabase = await createClient();
  const { data: rights } = await supabase
    .from("work_rights")
    .select(
      "basis, citizenship_evidence, evidence_path, passport_number, passport_country, visa_grant_number, visa_subclass, status, rejection_reason, vevo_checked_at, updated_at",
    )
    .eq("worker_id", worker.id)
    .maybeSingle();

  return (
    <StepFrame
      mode={mode}
      step="right-to-work"
      completed={worker.onboarding_steps}
      title="Right to work"
      description="As your employer, we must check you're allowed to work in Australia."
    >
      {rights?.status === "verified" ? (
        <div className="max-w-xl space-y-4">
          <WhatsNext
            title={BASIS_LABELS[rights.basis]}
            status={checkStatuses.verified}
            detail={`Checked on ${formatDate(rights.vevo_checked_at ?? rights.updated_at)}. Contact us if anything changes, such as a new visa.`}
          />
          {mode === "wizard" ? <ContinueForm step="right-to-work" /> : null}
        </div>
      ) : (
        <div className="space-y-6">
          {rights?.status === "rejected" ? (
            <Alert variant="destructive" className="max-w-xl">
              <AlertDescription className="text-foreground">
                We couldn&apos;t confirm your right to work:{" "}
                {rights.rejection_reason ?? "please check your details."} Fix it
                below and save again.
              </AlertDescription>
            </Alert>
          ) : null}
          <RightToWorkForm
            mode={mode}
            workerId={worker.id}
            values={{
              basis: rights?.basis ?? null,
              evidence: rights?.citizenship_evidence ?? null,
              evidencePath: rights?.evidence_path ?? null,
              passportNumber: rights?.passport_number ?? "",
              passportCountry: rights?.passport_country ?? "",
              visaGrantNumber: rights?.visa_grant_number ?? "",
              visaSubclass: rights?.visa_subclass ?? "",
            }}
          />
        </div>
      )}
    </StepFrame>
  );
}
