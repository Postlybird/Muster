"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { saveTicket } from "../actions";
import { kindLabels, verificationLabels } from "./labels";

export type TicketFormValues = {
  id: string | null;
  name: string;
  description: string;
  kind: keyof typeof kindLabels;
  issuer: string | null;
  has_number: boolean;
  has_expiry: boolean;
  needs_document: boolean;
  verification_method: keyof typeof verificationLabels;
  active: boolean;
};

function SwitchRow({
  id,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="flex-col items-start gap-1">
        <span>{label}</span>
        <span className="text-sm font-normal text-muted-foreground">
          {hint}
        </span>
      </Label>
      <Switch id={id} name={id} defaultChecked={defaultChecked} />
    </div>
  );
}

export function TicketForm({ values }: { values: TicketFormValues }) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveTicket.bind(null, values.id));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <FormField id="name" label="Name" error={errors?.name}>
        {(props) => (
          <Input {...props} name="name" defaultValue={values.name} required />
        )}
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="kind" label="Type" error={errors?.kind}>
          {(props) => (
            <Select name="kind" defaultValue={values.kind}>
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(kindLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          id="issuer"
          label="Issued by"
          hint="Optional."
          error={errors?.issuer}
        >
          {(props) => (
            <Input
              {...props}
              name="issuer"
              defaultValue={values.issuer ?? ""}
            />
          )}
        </FormField>
      </div>

      <FormField
        id="verification_method"
        label="How it's checked"
        error={errors?.verification_method}
      >
        {(props) => (
          <Select
            name="verification_method"
            defaultValue={values.verification_method}
          >
            <SelectTrigger {...props}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(verificationLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField
        id="description"
        label="Description"
        hint="Helps workers pick the right ticket, e.g. the unit code."
        error={errors?.description}
      >
        {(props) => (
          <Textarea
            {...props}
            name="description"
            defaultValue={values.description}
            rows={2}
          />
        )}
      </FormField>

      <div className="space-y-4 rounded-lg border p-4">
        <SwitchRow
          id="has_number"
          label="Has a number"
          hint="Workers enter the ticket or licence number."
          defaultChecked={values.has_number}
        />
        <SwitchRow
          id="has_expiry"
          label="Expires"
          hint="Workers enter an expiry date, and we warn them before it expires."
          defaultChecked={values.has_expiry}
        />
        <SwitchRow
          id="needs_document"
          label="Needs a photo or PDF"
          hint="Workers upload a copy for checking."
          defaultChecked={values.needs_document}
        />
        <SwitchRow
          id="active"
          label="Active"
          hint="Turn off to stop workers adding this ticket."
          defaultChecked={values.active}
        />
      </div>

      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>
        {values.id ? "Save changes" : "Add ticket"}
      </SubmitButton>
    </form>
  );
}
