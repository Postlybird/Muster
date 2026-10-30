"use client";

import Link from "next/link";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Badge } from "@/components/ui/badge";
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

import { saveJurisdiction, saveLicence } from "./actions";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
const STATUSES = {
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

type JurisdictionValues = {
  code: string;
  name: string;
  open_for_work: boolean;
  licence_required: boolean;
  worker_notice_required: boolean;
  show_licence_on_invoice: boolean;
  licensing_body: string;
  notes: string;
};

export function JurisdictionRow({
  values,
  licensed,
  holidays,
}: {
  values: JurisdictionValues;
  licensed: boolean;
  /** Public holidays on file for the next 12 months. */
  holidays: number;
}) {
  const { state, onSubmit, pending } = useServerForm(
    saveJurisdiction.bind(null, values.code),
  );
  const id = (field: string) => `${values.code}-${field}`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={values.name}
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{values.name}</h3>
        {values.open_for_work ? (
          <Badge variant="success">Taking work</Badge>
        ) : (
          <Badge variant="neutral">Not open yet</Badge>
        )}
        {values.licence_required ? (
          licensed ? (
            <Badge variant="success">Licensed</Badge>
          ) : (
            <Badge variant="danger">Licence needed</Badge>
          )
        ) : (
          <Badge variant="neutral">No licence scheme</Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3">
        <Label
          htmlFor={id("open_for_work")}
          className="flex-col items-start gap-1"
        >
          <span>Open for work</span>
          <span className="text-sm font-normal text-muted-foreground">
            Businesses here can post work. Turn on once we have workers&apos;
            compensation cover here
            {values.licence_required ? ", a current licence" : ""} and its
            public holidays on file.
          </span>
        </Label>
        <Switch
          id={id("open_for_work")}
          name="open_for_work"
          defaultChecked={values.open_for_work}
        />
      </div>
      {values.open_for_work && values.licence_required && !licensed ? (
        <p className="text-sm font-medium text-destructive">
          Open, but jobs here stay blocked until a current licence is recorded
          above.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {holidays === 1
          ? "1 public holiday"
          : `${holidays === 0 ? "No" : holidays} public holidays`}{" "}
        on file for the next 12 months (
        <Link
          href="/admin/rates/holidays"
          className="underline underline-offset-4"
        >
          public holidays
        </Link>
        ).
      </p>
      {values.open_for_work && holidays === 0 ? (
        <p className="text-sm font-medium text-destructive">
          Open, but shifts here are paid without public holiday rates until its
          holidays are entered, from the state&apos;s official list.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["licence_required", "Licence required"],
            ["worker_notice_required", "Worker notice each supply"],
            ["show_licence_on_invoice", "Licence number on invoices"],
          ] as const
        ).map(([field, label]) => (
          <div key={field} className="flex items-center gap-3">
            <Switch
              id={id(field)}
              name={field}
              defaultChecked={values[field]}
            />
            <Label htmlFor={id(field)} className="font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={id("licensing_body")} label="Licensing body">
          {(props) => (
            <Input
              {...props}
              name="licensing_body"
              defaultValue={values.licensing_body}
            />
          )}
        </FormField>
        <FormField id={id("notes")} label="Notes">
          {(props) => (
            <Input {...props} name="notes" defaultValue={values.notes} />
          )}
        </FormField>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        Save {values.code}
      </SubmitButton>
    </form>
  );
}

type LicenceValues = {
  id: string | null;
  jurisdiction: string;
  licence_number: string;
  holder_name: string;
  issued_on: string;
  expires_on: string;
  status: keyof typeof STATUSES;
  notes: string;
};

export function LicenceForm({ values }: { values: LicenceValues }) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveLicence.bind(null, values.id),
  );
  const id = (field: string) => `${values.id ?? "new"}-${field}`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={
        values.id ? `Licence ${values.licence_number}` : "New licence"
      }
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id={id("jurisdiction")}
          label="State"
          error={fieldErrors?.jurisdiction}
        >
          {(props) => (
            <Select
              name="jurisdiction"
              defaultValue={values.jurisdiction || undefined}
            >
              <SelectTrigger {...props}>
                <SelectValue placeholder="Choose a state" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          id={id("licence_number")}
          label="Licence number"
          error={fieldErrors?.licence_number}
        >
          {(props) => (
            <Input
              {...props}
              name="licence_number"
              defaultValue={values.licence_number}
            />
          )}
        </FormField>
        <FormField
          id={id("holder_name")}
          label="Licence holder"
          error={fieldErrors?.holder_name}
        >
          {(props) => (
            <Input
              {...props}
              name="holder_name"
              defaultValue={values.holder_name}
            />
          )}
        </FormField>
        <FormField
          id={id("issued_on")}
          label="Issued"
          error={fieldErrors?.issued_on}
        >
          {(props) => (
            <Input
              {...props}
              name="issued_on"
              type="date"
              defaultValue={values.issued_on}
            />
          )}
        </FormField>
        <FormField
          id={id("expires_on")}
          label="Expires"
          error={fieldErrors?.expires_on}
        >
          {(props) => (
            <Input
              {...props}
              name="expires_on"
              type="date"
              defaultValue={values.expires_on}
            />
          )}
        </FormField>
        <FormField id={id("status")} label="Status" error={fieldErrors?.status}>
          {(props) => (
            <Select name="status" defaultValue={values.status}>
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUSES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>
      <FormField id={id("notes")} label="Notes" error={fieldErrors?.notes}>
        {(props) => (
          <Input {...props} name="notes" defaultValue={values.notes} />
        )}
      </FormField>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} size="sm">
        {values.id ? "Save licence" : "Add licence"}
      </SubmitButton>
    </form>
  );
}
