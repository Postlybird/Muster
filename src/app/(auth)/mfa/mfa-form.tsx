"use client";

import { useState, useTransition } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { failure, idle, type ActionState } from "@/lib/forms";

import {
  confirmAuthenticatorCode,
  startAuthenticatorSetup,
  type SetupResult,
} from "./actions";

function CodeForm({ factorId }: { factorId: string }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<ActionState>(idle);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await confirmAuthenticatorCode(factorId, code);
          setState(failure(result.error));
        });
      }}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="mfa-code">6-digit code from your app</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="max-w-40 text-lg tracking-widest"
          aria-invalid={state.status === "error" ? true : undefined}
        />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} pendingText="Checking…" size="lg">
        Continue
      </SubmitButton>
    </form>
  );
}

/** First time: link an authenticator app by scanning a QR code. */
export function SetupAuthenticator() {
  const [setup, setSetup] = useState<SetupResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!setup || !setup.ok) {
    return (
      <div className="space-y-4">
        {setup && !setup.ok ? (
          <ActionFeedback state={failure(setup.error)} />
        ) : null}
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () =>
              setSetup(await startAuthenticatorSetup()),
            )
          }
        >
          Show the QR code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          Open your authenticator app (for example Google Authenticator,
          Microsoft Authenticator or 1Password) and add an account.
        </li>
        <li className="space-y-3">
          <span>Scan this QR code.</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data from Supabase */}
          <img
            src={setup.qrCode}
            alt="QR code to scan with your authenticator app"
            className="size-48 rounded-md border bg-white p-2"
          />
          <span className="block text-sm text-muted-foreground">
            Can&apos;t scan it? Enter this key instead:{" "}
            <code
              className="font-mono break-all text-foreground"
              data-testid="mfa-secret"
            >
              {setup.secret}
            </code>
          </span>
        </li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <CodeForm factorId={setup.factorId} />
    </div>
  );
}

/** Every sign-in after that: enter the current code. */
export function VerifyAuthenticator({ factorId }: { factorId: string }) {
  return <CodeForm factorId={factorId} />;
}
