"use client";

import { CheckCircle2 } from "lucide-react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { StepActions } from "../step-actions";
import { acceptPaperwork } from "./actions";

export type PaperworkDocument = {
  id: string;
  kind: string;
  title: string;
  /** The document, rendered on the server. */
  body: React.ReactNode;
  acceptedOn: string | null;
};

const CONFIRM: Record<string, string> = {
  casual_employment_contract:
    "I've read and accept the casual employment contract",
  fair_work_information_statement:
    "I've received the Fair Work Information Statement",
  casual_employment_information_statement:
    "I've received the Casual Employment Information Statement",
};

export function PaperworkForm({
  mode,
  documents,
}: {
  mode: "wizard" | "edit";
  documents: PaperworkDocument[];
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(acceptPaperwork);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <ul className="space-y-4">
        {documents.map((document) => {
          const error = errors?.[`agreement_${document.id}`]?.[0];
          return (
            <li key={document.id} className="space-y-3 rounded-lg border p-4">
              <h2 className="font-semibold">{document.title}</h2>
              <details className="group rounded-md bg-muted/50">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Read it
                </summary>
                <div className="max-h-96 overflow-y-auto border-t px-3 py-3">
                  {document.body}
                </div>
              </details>
              {document.acceptedOn ? (
                <p className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  Done on {document.acceptedOn}
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`agreement_${document.id}`}
                      name="agreement_ids"
                      value={document.id}
                      className="mt-0.5"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        error ? `agreement_${document.id}-error` : undefined
                      }
                    />
                    <Label
                      htmlFor={`agreement_${document.id}`}
                      className="leading-snug font-normal"
                    >
                      {CONFIRM[document.kind] ?? `I accept ${document.title}`}
                    </Label>
                  </div>
                  {error ? (
                    <p
                      id={`agreement_${document.id}-error`}
                      className="pl-9 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section
        aria-labelledby="payroll"
        className="space-y-2 rounded-lg bg-muted/50 p-4"
      >
        <h2 id="payroll" className="font-semibold">
          Tax, super and bank details
        </h2>
        <p className="text-sm">
          Once we&apos;ve verified you, our payroll provider will email you a
          link to add your tax file number, super fund and bank account. We
          never see or keep those details.
        </p>
      </section>

      <ActionFeedback state={state} />
      {mode === "wizard" || documents.some((d) => !d.acceptedOn) ? (
        <StepActions
          mode={mode}
          step="paperwork"
          pending={pending}
          primaryLabel={mode === "wizard" ? "Save and continue" : "Confirm"}
        />
      ) : null}
    </form>
  );
}
