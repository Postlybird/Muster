"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { failure, idle, type ActionState } from "@/lib/forms";
import { formatAuPhone } from "@/lib/phone";

import { StepActions } from "../step-actions";
import {
  confirmContactCode,
  continueFromContact,
  sendContactCode,
  type ContactKind,
} from "./actions";

const copy: Record<
  ContactKind,
  {
    label: string;
    why: string;
    placeholder: string;
    inputMode: "tel" | "email";
  }
> = {
  phone: {
    label: "Mobile number",
    why: "We text you about urgent work and send shift reminders.",
    placeholder: "0412 345 678",
    inputMode: "tel",
  },
  email: {
    label: "Email address",
    why: "Our payroll provider emails you to set up your tax, super and bank details.",
    placeholder: "you@example.com",
    inputMode: "email",
  },
};

function Confirmed({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <CheckCircle2
        className="mt-0.5 size-5 shrink-0 text-success"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="truncate text-muted-foreground">{value}</p>
        <p className="text-sm text-success">Confirmed</p>
      </div>
    </div>
  );
}

/** Adds the missing contact method with a code; the main button moves with each stage. */
function AddContact({
  kind,
  mode,
}: {
  kind: ContactKind;
  mode: "wizard" | "edit";
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<ActionState>(idle);
  const [pending, startTransition] = useTransition();
  const text = copy[kind];
  const shown =
    destination && kind === "phone" ? formatAuPhone(destination) : destination;

  function send(event?: React.FormEvent) {
    event?.preventDefault();
    startTransition(async () => {
      const result = await sendContactCode(kind, value);
      if (result.ok) {
        setDestination(result.destination);
        setState(idle);
        if (destination) toast.success("We've sent a new code.");
      } else {
        setState(failure(result.error));
      }
    });
  }

  function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!destination) return;
    startTransition(async () => {
      setState(await confirmContactCode(kind, destination, code));
    });
  }

  if (!destination) {
    return (
      <form onSubmit={send} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`new-${kind}`}>{text.label}</Label>
          <p id={`new-${kind}-hint`} className="text-sm text-muted-foreground">
            {text.why} We&apos;ll send a code to confirm it.
          </p>
          <Input
            id={`new-${kind}`}
            type={kind === "email" ? "email" : "tel"}
            inputMode={text.inputMode}
            autoComplete={kind === "email" ? "email" : "tel"}
            placeholder={text.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby={`new-${kind}-hint`}
            aria-invalid={state.status === "error" ? true : undefined}
          />
        </div>
        <ActionFeedback state={state} />
        <StepActions
          mode={mode}
          step="contact"
          pending={pending}
          primaryLabel="Send code"
        />
      </form>
    );
  }

  return (
    <form onSubmit={confirm} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`code-${kind}`}>6-digit code</Label>
        <p id={`code-${kind}-hint`} className="text-sm text-muted-foreground">
          We sent a code to{" "}
          <span className="font-medium text-foreground">{shown}</span>.
        </p>
        <Input
          id={`code-${kind}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-describedby={`code-${kind}-hint`}
          aria-invalid={state.status === "error" ? true : undefined}
          className="max-w-40 text-lg tracking-widest"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => send()}
        >
          Send a new code
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setDestination(null);
            setCode("");
            setState(idle);
          }}
        >
          {kind === "phone"
            ? "Use a different number"
            : "Use a different email"}
        </Button>
      </div>
      <ActionFeedback state={state} />
      <StepActions
        mode={mode}
        step="contact"
        pending={pending}
        primaryLabel="Confirm"
      />
    </form>
  );
}

export function ContactForm({
  mode,
  phone,
  email,
}: {
  mode: "wizard" | "edit";
  phone: string | null;
  email: string | null;
}) {
  const [state, setState] = useState<ActionState>(idle);
  const [pending, startTransition] = useTransition();
  const missing: ContactKind | null = !phone
    ? "phone"
    : !email
      ? "email"
      : null;

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {phone ? (
          <Confirmed label="Mobile number" value={formatAuPhone(phone)} />
        ) : null}
        {email ? <Confirmed label="Email address" value={email} /> : null}
      </div>

      {missing ? (
        <AddContact key={missing} kind={missing} mode={mode} />
      ) : mode === "wizard" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => setState(await continueFromContact()));
          }}
          className="space-y-4"
        >
          <ActionFeedback state={state} />
          <StepActions
            mode={mode}
            step="contact"
            pending={pending}
            primaryLabel="Continue"
          />
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          To change your mobile number or email address, contact us.
        </p>
      )}
    </div>
  );
}
