"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { FileUpload } from "@/components/forms/file-upload";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { credentialBucket } from "@/lib/uploads";
import type { TicketType } from "@/server/tickets";

import { StepActions } from "../step-actions";
import { removeTicket, saveTicket } from "./actions";

export function TicketForm({
  mode,
  workerId,
  type,
  open,
  today,
  policeMaxAgeMonths,
}: {
  mode: "wizard" | "edit";
  workerId: string;
  type: TicketType;
  /** The copy waiting to be checked, if any: the form edits it. */
  open: {
    id: string;
    number: string | null;
    issuedOn: string | null;
    expiresOn: string | null;
    documentPath: string | null;
  } | null;
  today: string;
  policeMaxAgeMonths: number;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveTicket.bind(null, type.code));
  const [uploading, setUploading] = useState(false);
  const isPolice = type.kind === "police_check";

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      {type.has_number ? (
        <FormField
          id="number"
          label={isPolice ? "Reference number" : "Ticket or licence number"}
          error={errors?.number}
        >
          {(props) => (
            <Input
              {...props}
              name="number"
              defaultValue={open?.number ?? ""}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </FormField>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="issued_on"
          label={isPolice ? "Date issued" : "Date issued (if shown)"}
          hint={
            isPolice
              ? `We accept checks issued in the last ${policeMaxAgeMonths} months.`
              : undefined
          }
          error={errors?.issued_on}
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              name="issued_on"
              max={today}
              defaultValue={open?.issuedOn ?? ""}
            />
          )}
        </FormField>
        {type.has_expiry ? (
          <FormField
            id="expires_on"
            label="Expiry date"
            error={errors?.expires_on}
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                name="expires_on"
                min={today}
                defaultValue={open?.expiresOn ?? ""}
              />
            )}
          </FormField>
        ) : null}
      </div>

      {type.needs_document ? (
        <FileUpload
          id="document"
          name="document_path"
          label={
            isPolice
              ? "Your police check certificate"
              : "Photo or PDF of your ticket"
          }
          hint={
            isPolice
              ? "The PDF you were emailed, or a clear photo. We delete it once we've checked it."
              : "Make sure your name, the number and any dates are easy to read."
          }
          error={errors?.document_path}
          bucket={credentialBucket(type.kind)}
          folder={workerId}
          prefix="ticket"
          accept="document"
          maxDimension={2000}
          existing={open?.documentPath ? { path: open.documentPath } : null}
          onBusyChange={setUploading}
        />
      ) : null}

      <ActionFeedback state={state} />
      <StepActions
        mode={mode}
        step="tickets"
        pending={pending}
        disabled={uploading}
        primaryLabel="Save ticket"
        backHref="/worker/onboarding/tickets"
        secondary={
          open ? (
            <ConfirmAction
              trigger={
                <Button type="button" variant="ghost" size="lg">
                  Remove
                </Button>
              }
              title={`Remove ${type.name}?`}
              description="It hasn't been checked yet. You can add it again later."
              confirmLabel="Remove"
              action={removeTicket.bind(null, open.id)}
            />
          ) : null
        }
      />
    </form>
  );
}
