"use client";

import { Loader2 } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { useBotCheck } from "@/components/forms/bot-check";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGISTER_NEXT, type RegisterKind } from "@/lib/register";
import { useHydrated } from "@/lib/use-hydrated";

import { CodeStep } from "../code-step";
import { sendRegisterCode, type RegisterFields } from "./actions";

type FieldKey = keyof RegisterFields;

const EMPTY: RegisterFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  abn: "",
};

/**
 * The short sign-up form (owner, 01/11/2026), then the emailed code. No
 * password, and nothing we can ask for later.
 */
export function RegisterForm({ kind }: { kind: RegisterKind }) {
  const [fields, setFields] = useState<RegisterFields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formErrorId = useId();
  const hydrated = useHydrated();
  const business = kind === "business";
  // Rendered in both steps, as "send a new code" needs it too.
  const botCheck = useBotCheck();

  async function request(): Promise<string | null> {
    const captchaToken = await botCheck.getToken();
    const result = await sendRegisterCode(kind, fields, captchaToken);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      return result.error;
    }
    setErrors({});
    setSentTo(result.destination);
    return null;
  }

  if (sentTo) {
    return (
      <>
        {botCheck.element}
        <CodeStep
          destination={sentTo}
          next={REGISTER_NEXT[kind]}
          submitLabel="Continue"
          onBack={() => {
            setSentTo(null);
            setError(null);
          }}
          onResend={request}
        />
      </>
    );
  }

  const field = (
    key: FieldKey,
    label: string,
    input: React.ComponentProps<typeof Input>,
    hint?: string,
  ) => {
    const id = `register-${key}`;
    const describedBy = [
      hint ? `${id}-hint` : null,
      errors[key] ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <Input
          id={id}
          name={key}
          value={fields[key] ?? ""}
          onChange={(event) =>
            setFields((now) => ({ ...now, [key]: event.target.value }))
          }
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="h-12 text-base"
          required
          {...input}
        />
        {errors[key] ? (
          <p
            id={`${id}-error`}
            className="text-sm font-medium text-destructive"
          >
            {errors[key]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {botCheck.element}
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hydrated) return;
          setError(null);
          startTransition(async () => setError(await request()));
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {field("firstName", "First name", { autoComplete: "given-name" })}
          {field("lastName", "Last name", { autoComplete: "family-name" })}
        </div>
        {field(
          "email",
          business ? "Work email" : "Email address",
          {
            type: "email",
            inputMode: "email",
            autoComplete: "email",
            placeholder: "you@example.com",
          },
          "We'll email you a code to confirm it. No password to remember.",
        )}
        {business
          ? field("phone", "Mobile number", {
              type: "tel",
              inputMode: "tel",
              autoComplete: "tel",
              placeholder: "0412 345 678",
            })
          : null}
        {business
          ? field(
              "abn",
              "ABN",
              { inputMode: "numeric", placeholder: "12 345 678 901" },
              "We fill in your business details from the ABN register.",
            )
          : null}
        <div aria-live="polite">
          {error ? (
            <Alert variant="destructive" id={formErrorId}>
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
    </>
  );
}
