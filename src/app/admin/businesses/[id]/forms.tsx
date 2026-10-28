"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

import {
  approveBusiness,
  decideBusiness,
  holdBusiness,
  recheckAbn,
  saveAccountTerms,
} from "./actions";

type Errors = Record<string, string[] | undefined> | undefined;

export type TermsValues = { approved: boolean; days: number };

/**
 * Runs an action and toasts on success straight away: after a decision the
 * page shows different forms, so this one may not be there to show it.
 */
function useDecision(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  return useServerForm(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.status === "success") toast.success(result.message);
    return result;
  });
}

function TermsFields({
  id,
  values,
  errors,
}: {
  id: string;
  values: TermsValues;
  errors: Errors;
}) {
  const [approved, setApproved] = useState(values.approved);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-terms`}
          name="account_terms"
          checked={approved}
          onCheckedChange={(checked) => setApproved(checked === true)}
          aria-describedby={`${id}-terms-hint`}
        />
        <div className="space-y-1">
          <Label htmlFor={`${id}-terms`}>Approved for account terms</Label>
          <p id={`${id}-terms-hint`} className="text-sm text-muted-foreground">
            They pay weekly invoices after the work. Without account terms they
            can&apos;t post work yet.
          </p>
        </div>
      </div>
      {approved ? (
        <FormField
          id={`${id}-days`}
          label="Payment terms in days"
          hint="Days after the invoice date that payment is due."
          error={errors?.payment_terms_days}
        >
          {(props) => (
            <Input
              {...props}
              name="payment_terms_days"
              inputMode="numeric"
              defaultValue={String(values.days)}
              className="w-28"
            />
          )}
        </FormField>
      ) : null}
    </div>
  );
}

function ReasonFields({
  id,
  reasons,
  errors,
}: {
  id: string;
  reasons: string[];
  errors: Errors;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${id}-template`}>Reason</Label>
        <NativeSelect
          id={`${id}-template`}
          defaultValue=""
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="">Choose a reason, or write your own</option>
          {reasons.map((text) => (
            <option key={text} value={text}>
              {text}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-reason`}>Message to the business</Label>
        <Textarea
          id={`${id}-reason`}
          name="reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={errors?.reason ? true : undefined}
          aria-describedby={`${id}-reason-hint`}
        />
        <p id={`${id}-reason-hint`} className="text-sm text-muted-foreground">
          {errors?.reason?.[0] ??
            "We email this to the owner and show it on their dashboard."}
        </p>
      </div>
    </div>
  );
}

/** Approve or decline a business that's waiting. */
export function DecisionForm({
  businessId,
  terms,
  reasons,
}: {
  businessId: string;
  terms: TermsValues;
  reasons: string[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useDecision(
    decideBusiness.bind(null, businessId),
  );
  const [decision, setDecision] = useState("");
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <ChoiceField
        id="decision"
        name="decision"
        legend="Decision"
        value={decision}
        onValueChange={setDecision}
        error={fieldErrors?.decision}
        choices={[
          { value: "approve", label: "Approve" },
          { value: "decline", label: "Decline" },
        ]}
      />
      {decision === "approve" ? (
        <TermsFields id="approve" values={terms} errors={fieldErrors} />
      ) : null}
      {decision === "decline" ? (
        <ReasonFields id="decline" reasons={reasons} errors={fieldErrors} />
      ) : null}
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} disabled={!decision}>
        Save decision
      </SubmitButton>
    </form>
  );
}

/** Account terms for an approved business. */
export function AccountTermsForm({
  businessId,
  terms,
}: {
  businessId: string;
  terms: TermsValues;
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveAccountTerms.bind(null, businessId),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <TermsFields id="terms" values={terms} errors={fieldErrors} />
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} variant="outline">
        Save account terms
      </SubmitButton>
    </form>
  );
}

/** Takes a business off hold, confirming its account terms. */
export function ReinstateForm({
  businessId,
  terms,
  label,
}: {
  businessId: string;
  terms: TermsValues;
  label: string;
}) {
  const { state, onSubmit, pending, fieldErrors } = useDecision(
    approveBusiness.bind(null, businessId),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <TermsFields id="reinstate" values={terms} errors={fieldErrors} />
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending}>{label}</SubmitButton>
    </form>
  );
}

/** Puts an approved business on hold, with a message to the owner. */
export function HoldForm({
  businessId,
  reasons,
}: {
  businessId: string;
  reasons: string[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useDecision(
    holdBusiness.bind(null, businessId),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <ReasonFields id="hold" reasons={reasons} errors={fieldErrors} />
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} variant="destructive">
        Put on hold
      </SubmitButton>
    </form>
  );
}

/** Looks the ABN up on the register again. */
export function RecheckForm({ businessId }: { businessId: string }) {
  const { state, onSubmit, pending } = useServerForm(() =>
    recheckAbn(businessId),
  );
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ActionFeedback state={state} />
      <SubmitButton
        pending={pending}
        pendingText="Checking…"
        variant="outline"
        size="sm"
      >
        Check the register again
      </SubmitButton>
    </form>
  );
}
