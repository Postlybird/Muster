"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { verifyCode } from "./login/actions";

/**
 * "Check your email": the 6-digit code we sent, for signing in and for
 * registering alike. A right code goes on to `next` (or the person's area);
 * the email's link works too.
 */
export function CodeStep({
  destination,
  next,
  onBack,
  onResend,
  submitLabel = "Sign in",
}: {
  destination: string;
  next?: string;
  onBack: () => void;
  /** Sends a new code; resolves with an error to show, or null. */
  onResend: () => Promise<string | null>;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => codeRef.current?.focus());
  }, []);

  function submit() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await verifyCode({
        method: "email",
        destination,
        code,
        next,
      });
      // Success redirects, so we only get here on failure.
      if (result && !result.ok) setError(result.error);
    });
  }

  function resend() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const problem = await onResend();
      if (problem) {
        setError(problem);
      } else {
        setCode("");
        setNotice("We've sent a new code.");
        codeRef.current?.focus();
      }
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-deep">
          Check your email
        </h2>
        <p className="text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-semibold [overflow-wrap:anywhere] text-foreground">
            {destination}
          </span>
          . Enter it below, or tap the link in the email. It works for 15
          minutes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">6-digit code</Label>
        <Input
          ref={codeRef}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="h-14 text-center text-2xl tracking-[0.4em]"
          required
        />
      </div>

      <div aria-live="polite" className="space-y-3">
        {error ? (
          <Alert variant="destructive" id={errorId}>
            <AlertDescription className="text-foreground">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}
        {notice ? <p className="text-sm text-success">{notice}</p> : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full text-base"
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {submitLabel}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden />
          Use a different email
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={resend}
          disabled={pending}
        >
          Send a new code
        </Button>
      </div>
    </form>
  );
}
