"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/lib/use-hydrated";

import { sendCode, verifyCode } from "./actions";

type Props = {
  as?: "worker" | "business";
  next?: string;
};

/**
 * Sign in or sign up with an email address (owner, 31/10/2026: email only).
 * We email a 6-digit code and a link; there's no password.
 */
export function LoginForm({ as, next }: Props) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  // Until the page's script has loaded, a tap would reload the page with
  // the email in the address, so the form waits.
  const hydrated = useHydrated();

  function requestCode() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendCode({
        method: "email",
        value: email,
        as,
        next,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentTo(result.destination);
      setCode("");
      setNotice(sentTo ? "We've sent a new code." : null);
      requestAnimationFrame(() => codeRef.current?.focus());
    });
  }

  function submitCode() {
    if (!sentTo) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await verifyCode({
        method: "email",
        destination: sentTo,
        code,
        next,
      });
      // Success redirects, so we only get here on failure.
      if (result && !result.ok) setError(result.error);
    });
  }

  const errorAlert = error ? (
    <Alert variant="destructive" id={errorId}>
      <AlertDescription className="text-foreground">{error}</AlertDescription>
    </Alert>
  ) : null;

  if (sentTo) {
    return (
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitCode();
        }}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-deep">
            Check your email
          </h2>
          <p className="text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-semibold [overflow-wrap:anywhere] text-foreground">
              {sentTo}
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
            autoFocus
            required
          />
        </div>

        <div aria-live="polite" className="space-y-3">
          {errorAlert}
          {notice ? <p className="text-sm text-success">{notice}</p> : null}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base"
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Sign in
        </Button>

        <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSentTo(null);
              setError(null);
              setNotice(null);
            }}
          >
            <ArrowLeft aria-hidden />
            Use a different email
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={requestCode}
            disabled={pending}
          >
            Send a new code
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (hydrated) requestCode();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${errorId} email-hint` : "email-hint"}
          className="h-12 text-base"
          required
        />
        <p id="email-hint" className="text-sm text-muted-foreground">
          We&apos;ll email you a code to sign in. No password to remember.
        </p>
      </div>
      <div aria-live="polite">{errorAlert}</div>
      <Button
        type="submit"
        size="lg"
        className="h-12 w-full text-base"
        disabled={pending || !hydrated}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Email me a code
      </Button>
    </form>
  );
}
