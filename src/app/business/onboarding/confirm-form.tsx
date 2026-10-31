"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { formatAbn } from "@/adapters/abn/validate";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { checkAbn, setUpBusiness, type AbnCheck } from "./actions";

export type ConfirmedBusiness = {
  name: string;
  legalName: string;
  abn: string;
  details: { label: string; value: string }[];
};

/** The business's register details, as we'll save them. */
function BusinessDetails({ business }: { business: ConfirmedBusiness }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xl font-bold text-deep">{business.name}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {business.details.map((item) => (
          <div key={item.label}>
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function fromCheck(check: Extract<AbnCheck, { ok: true }>): ConfirmedBusiness {
  return {
    name: check.businessNames[0] ?? check.legalName,
    legalName: check.legalName,
    abn: check.abn,
    details: [
      { label: "Legal name", value: check.legalName },
      { label: "ABN", value: formatAbn(check.abn) },
      { label: "Type", value: check.entityType },
      ...(check.location ? [{ label: "Location", value: check.location }] : []),
      {
        label: "GST",
        value: check.gstRegisteredFrom ? "Registered" : "Not registered",
      },
    ],
  };
}

/**
 * Confirm the business and accept the agreement: one screen, then it's with
 * our team (owner, 01/11/2026). If the ABN from the register form can't be
 * used, or finds the wrong business, the owner types another one here.
 */
export function ConfirmForm({
  initial,
  initialError,
  typedAbn,
  canChangeAbn,
  agreementId,
  billingNote,
}: {
  initial: ConfirmedBusiness | null;
  initialError: string | null;
  typedAbn: string;
  /** False once the business is saved: its ABN can't change after that. */
  canChangeAbn: boolean;
  agreementId: string | null;
  billingNote: string;
}) {
  const [business, setBusiness] = useState(initial);
  const [abn, setAbn] = useState(typedAbn);
  const [lookupError, setLookupError] = useState(initialError);
  const [looking, startLookup] = useTransition();
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(
    setUpBusiness.bind(null, business?.abn ?? null, agreementId),
  );

  if (!business) {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setLookupError(null);
          startLookup(async () => {
            const check = await checkAbn(abn);
            if (check.ok) setBusiness(fromCheck(check));
            else setLookupError(check.error);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="abn">Your ABN</Label>
          <Input
            id="abn"
            name="abn"
            inputMode="numeric"
            placeholder="12 345 678 901"
            value={abn}
            onChange={(event) => setAbn(event.target.value)}
            aria-invalid={lookupError ? true : undefined}
            aria-describedby={lookupError ? "abn-error" : undefined}
            className="h-12 max-w-xs text-base"
          />
        </div>
        <div aria-live="polite">
          {lookupError ? (
            <Alert variant="destructive" id="abn-error">
              <AlertDescription className="text-foreground">
                {lookupError}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={looking}>
          {looking ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Look up my business
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <BusinessDetails business={business} />
      {canChangeAbn ? (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={() => setBusiness(null)}
        >
          Use a different ABN
        </Button>
      ) : null}
      <p className="text-sm text-muted-foreground">{billingNote}</p>
      {agreementId ? (
        <div className="space-y-1">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <Checkbox
              id="accept"
              name="accept"
              className="mt-0.5"
              aria-invalid={errors?.accept ? true : undefined}
              aria-describedby={errors?.accept ? "accept-error" : undefined}
            />
            <Label htmlFor="accept" className="leading-snug font-normal">
              I accept the Labour Hire Services Agreement on behalf of{" "}
              {business.legalName}, and I&apos;m authorised to do so.
            </Label>
          </div>
          {errors?.accept ? (
            <p id="accept-error" className="text-sm text-destructive">
              {errors.accept[0]}
            </p>
          ) : null}
        </div>
      ) : null}
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full sm:w-auto">
        Create my account
      </SubmitButton>
    </form>
  );
}
