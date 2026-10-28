import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { Markdown } from "@/components/markdown";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement } from "@/server/agreements";

import { ContinueBusinessForm } from "../continue-form";
import { BusinessStepFrame, loadBusinessStep } from "../frame";
import { AgreementForm } from "./agreement-form";

export const metadata: Metadata = { title: "Services agreement" };

export default async function AgreementStepPage() {
  const { business } = await loadBusinessStep("agreement");
  if (!business) return null;
  const agreement = await currentAgreement("labour_hire_services");
  let acceptedAt: string | null = null;
  if (agreement) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("agreement_acceptances")
      .select("accepted_at")
      .eq("agreement_id", agreement.id)
      .eq("business_id", business.id)
      .maybeSingle();
    acceptedAt = data?.accepted_at ?? null;
  }

  return (
    <BusinessStepFrame
      step="agreement"
      completed={business.onboarding_steps}
      title="Labour Hire Services Agreement"
      description="How we work together: safety, rates, timesheets, cancellations and invoices."
    >
      {agreement ? (
        <div className="max-w-2xl space-y-6">
          <div className="max-h-[28rem] overflow-y-auto rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">
              {agreement.title}{" "}
              <span className="font-normal text-muted-foreground">
                (version {agreement.version})
              </span>
            </h2>
            <Markdown>{agreement.body_md}</Markdown>
          </div>
          {acceptedAt ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                Accepted on {formatDate(acceptedAt)}
              </p>
              <ContinueBusinessForm step="agreement" />
            </>
          ) : (
            <AgreementForm
              agreementId={agreement.id}
              legalName={business.legal_name}
            />
          )}
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          <p className="text-muted-foreground">
            The agreement isn&apos;t ready yet. We&apos;ll send it to you before
            your first job.
          </p>
          <ContinueBusinessForm step="agreement" />
        </div>
      )}
    </BusinessStepFrame>
  );
}
