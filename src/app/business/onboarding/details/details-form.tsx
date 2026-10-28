"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { WizardActions } from "@/components/wizard/wizard-actions";

import { saveBusinessDetails } from "./actions";

export type DetailsValues = {
  tradingName: string;
  contactName: string;
  contactPhone: string;
  accountsEmail: string;
};

export function DetailsForm({
  context,
  values,
}: {
  context: "onboarding" | "page";
  values: DetailsValues;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveBusinessDetails.bind(null, context));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <FormField
        id="trading_name"
        label="Trading name (optional)"
        hint="The name your customers know. We show it to workers."
        error={errors?.trading_name}
      >
        {(props) => (
          <Input
            {...props}
            name="trading_name"
            defaultValue={values.tradingName}
            autoComplete="organization"
          />
        )}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="billing_contact_name"
          label="Billing contact"
          error={errors?.billing_contact_name}
        >
          {(props) => (
            <Input
              {...props}
              name="billing_contact_name"
              defaultValue={values.contactName}
              autoComplete="name"
            />
          )}
        </FormField>
        <FormField
          id="billing_contact_phone"
          label="Their phone"
          error={errors?.billing_contact_phone}
        >
          {(props) => (
            <Input
              {...props}
              name="billing_contact_phone"
              type="tel"
              defaultValue={values.contactPhone}
              autoComplete="tel"
            />
          )}
        </FormField>
      </div>
      <FormField
        id="accounts_email"
        label="Accounts email"
        hint="Where we send weekly invoices."
        error={errors?.accounts_email}
      >
        {(props) => (
          <Input
            {...props}
            name="accounts_email"
            type="email"
            inputMode="email"
            defaultValue={values.accountsEmail}
            autoComplete="email"
          />
        )}
      </FormField>
      <ActionFeedback state={state} />
      {context === "onboarding" ? (
        <WizardActions pending={pending} backHref="/business/onboarding/abn" />
      ) : (
        <SubmitButton pending={pending}>Save details</SubmitButton>
      )}
    </form>
  );
}
