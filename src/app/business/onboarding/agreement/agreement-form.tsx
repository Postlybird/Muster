"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { WizardActions } from "@/components/wizard/wizard-actions";

import { acceptServicesAgreement } from "./actions";

export function AgreementForm({
  agreementId,
  legalName,
}: {
  agreementId: string;
  legalName: string;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(acceptServicesAgreement.bind(null, agreementId));
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id="accept"
            name="accept"
            className="mt-0.5"
            aria-invalid={errors?.accept ? true : undefined}
            aria-describedby={errors?.accept ? "accept-error" : undefined}
          />
          <Label htmlFor="accept" className="leading-snug font-normal">
            I accept this agreement on behalf of {legalName}, and I&apos;m
            authorised to do so.
          </Label>
        </div>
        {errors?.accept ? (
          <p id="accept-error" className="text-sm text-destructive">
            {errors.accept[0]}
          </p>
        ) : null}
      </div>
      <ActionFeedback state={state} />
      <WizardActions
        pending={pending}
        primaryLabel="Accept and continue"
        backHref="/business/onboarding/team"
      />
    </form>
  );
}
