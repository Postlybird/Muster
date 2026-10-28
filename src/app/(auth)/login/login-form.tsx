"use client";

import { ArrowLeft, Loader2, Mail, Smartphone } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAuPhone } from "@/lib/phone";

import { sendCode, verifyCode, type LoginMethod } from "./actions";

type Props = {
  as?: "worker" | "business";
  next?: string;
  defaultMethod: LoginMethod;
};

export function LoginForm({ as, next, defaultMethod }: Props) {
  const [method, setMethod] = useState<LoginMethod>(defaultMethod);
  const [values, setValues] = useState({ phone: "", email: "" });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();
  const codeRef = useRef<HTMLInputElement>(null);

  function requestCode() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendCode({
        method,
        value: values[method],
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
        method,
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
    const shown = method === "phone" ? formatAuPhone(sentTo) : sentTo;
    return (
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          submitCode();
        }}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Enter your code</h2>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{shown}</span>.
            {method === "email"
              ? " You can also tap the link in the email."
              : null}{" "}
            It expires in 15 minutes.
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
            className="text-center text-2xl tracking-[0.4em]"
            autoFocus
            required
          />
        </div>

        <div aria-live="polite" className="space-y-3">
          {errorAlert}
          {notice ? <p className="text-sm text-success">{notice}</p> : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
            {method === "phone"
              ? "Use a different number"
              : "Use a different email"}
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
    <Tabs
      value={method}
      onValueChange={(value) => {
        setMethod(value as LoginMethod);
        setError(null);
      }}
    >
      <TabsList aria-label="How would you like to sign in?">
        <TabsTrigger value="phone">
          <Smartphone aria-hidden />
          Mobile
        </TabsTrigger>
        <TabsTrigger value="email">
          <Mail aria-hidden />
          Email
        </TabsTrigger>
      </TabsList>

      {(["phone", "email"] as const).map((tab) => (
        <TabsContent key={tab} value={tab}>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              requestCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={tab}>
                {tab === "phone" ? "Mobile number" : "Email address"}
              </Label>
              <Input
                id={tab}
                name={tab}
                type={tab === "phone" ? "tel" : "email"}
                inputMode={tab === "phone" ? "tel" : "email"}
                autoComplete={tab === "phone" ? "tel" : "email"}
                placeholder={
                  tab === "phone" ? "0412 345 678" : "you@example.com"
                }
                value={values[tab]}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [tab]: event.target.value }))
                }
                aria-invalid={!!error}
                aria-describedby={error ? errorId : `${tab}-hint`}
                required
              />
              <p id={`${tab}-hint`} className="text-sm text-muted-foreground">
                {tab === "phone"
                  ? "We'll text you a 6-digit code. No password needed."
                  : "We'll email you a 6-digit code and a sign-in link. No password needed."}
              </p>
            </div>

            <div aria-live="polite">{errorAlert}</div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : null}
              Send code
            </Button>
          </form>
        </TabsContent>
      ))}
    </Tabs>
  );
}
