"use client";

import { Loader2 } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/lib/use-hydrated";

import { CodeStep } from "../code-step";
import { sendCode } from "./actions";

type Props = {
  as?: "worker" | "business";
  next?: string;
};

/**
 * Sign in with an email address (owner, 31/10/2026: email only). We email a
 * 6-digit code and a link; there's no password.
 */
export function LoginForm({ as, next }: Props) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();
  // Until the page's script has loaded, a tap would reload the page with
  // the email in the address, so the form waits.
  const hydrated = useHydrated();

  async function request(): Promise<string | null> {
    const result = await sendCode({ method: "email", value: email, as, next });
    if (!result.ok) return result.error;
    setSentTo(result.destination);
    return null;
  }

  if (sentTo) {
    return (
      <CodeStep
        destination={sentTo}
        next={next}
        onBack={() => {
          setSentTo(null);
          setError(null);
        }}
        onResend={request}
      />
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hydrated) return;
        setError(null);
        startTransition(async () => setError(await request()));
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
      <div aria-live="polite">
        {error ? (
          <Alert variant="destructive" id={errorId}>
            <AlertDescription className="text-foreground">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
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
