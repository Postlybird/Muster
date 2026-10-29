"use client";

import { useState, useTransition } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { failure, idle, type ActionState } from "@/lib/forms";

import { checkAbn, createBusiness, type AbnCheck } from "../actions";

function formatAbn(abn: string) {
  return abn.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
}

/** Look up the ABN, show what the register says, then confirm. */
export function AbnForm() {
  const [value, setValue] = useState("");
  const [found, setFound] = useState<Extract<AbnCheck, { ok: true }> | null>(
    null,
  );
  const [state, setState] = useState<ActionState>(idle);
  const [pending, startTransition] = useTransition();

  if (!found) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await checkAbn(value);
            if (result.ok) {
              setFound(result);
              setState(idle);
            } else {
              setState(failure(result.error));
            }
          });
        }}
        noValidate
        className="max-w-xl space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="abn">ABN</Label>
          <p id="abn-hint" className="text-sm text-muted-foreground">
            We look it up on the Australian Business Register and fill in your
            business details.
          </p>
          <Input
            id="abn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="12 345 678 901"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby="abn-hint"
            aria-invalid={state.status === "error" ? true : undefined}
            className="max-w-60 text-lg tracking-wide"
          />
        </div>
        <ActionFeedback state={state} />
        <WizardActions
          primaryLabel="Look up"
          pendingLabel="Looking up…"
          pending={pending}
        />
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => setState(await createBusiness(found.abn)));
      }}
      className="max-w-xl space-y-6"
    >
      <dl className="space-y-3 rounded-lg border bg-card p-4">
        {[
          ["ABN", formatAbn(found.abn)],
          ["Legal name", found.legalName],
          ["Business type", found.entityType],
          [
            "GST",
            found.gstRegisteredFrom
              ? `Registered since ${found.gstRegisteredFrom.split("-").reverse().join("/")}`
              : "Not registered",
          ],
          ["Main location", found.location || "Not shown"],
          ...(found.businessNames.length > 0
            ? [["Business names", found.businessNames.join(", ")]]
            : []),
        ].map(([label, text]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Not your business?{" "}
        <button
          type="button"
          className="min-h-11 font-medium text-primary underline underline-offset-4"
          onClick={() => {
            setFound(null);
            setState(idle);
          }}
        >
          Try a different ABN
        </button>
      </p>
      <ActionFeedback state={state} />
      <WizardActions
        primaryLabel="This is my business"
        pendingLabel="Setting up…"
        pending={pending}
      />
    </form>
  );
}
