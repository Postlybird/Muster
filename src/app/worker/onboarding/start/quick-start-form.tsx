"use client";

import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { PlacePicker } from "@/components/forms/place-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { IndustryIcon } from "@/components/industries/industry-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RADIUS_OPTIONS_KM } from "@/config/worker-options";
import { formatAuPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { confirmMobileCode, finishQuickStart, sendMobileCode } from "./actions";

export type QuickIndustry = {
  name: string;
  icon: string;
  workTypes: { id: string; name: string }[];
};

/** Step 1: the worker's mobile, confirmed with a texted code. */
function MobileStep({
  confirmed,
  onConfirmed,
}: {
  confirmed: string | null;
  onConfirmed: (phone: string) => void;
}) {
  const [value, setValue] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (confirmed) {
    return (
      <p className="flex items-center gap-2 rounded-xl border bg-card p-4 font-medium">
        <CheckCircle2 className="size-5 text-success" aria-hidden />
        Mobile confirmed: {formatAuPhone(confirmed)}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        start(async () => {
          if (!sentTo) {
            const result = await sendMobileCode(value);
            if (result.ok) setSentTo(result.destination);
            else setError(result.error);
            return;
          }
          const result = await confirmMobileCode(sentTo, code);
          if (result.ok) onConfirmed(sentTo);
          else setError(result.error);
        });
      }}
    >
      {sentTo ? (
        <div className="space-y-2">
          <Label htmlFor="mobile-code">6-digit code</Label>
          <p id="mobile-code-hint" className="text-sm text-muted-foreground">
            We texted a code to{" "}
            <span className="font-medium text-foreground">
              {formatAuPhone(sentTo)}
            </span>
            .
          </p>
          <Input
            id="mobile-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-describedby="mobile-code-hint"
            className="h-12 max-w-40 text-lg tracking-widest"
            autoFocus
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <p id="mobile-hint" className="text-sm text-muted-foreground">
            We text you about shifts, call-outs and reminders. We&apos;ll send a
            code to confirm it.
          </p>
          <Input
            id="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby="mobile-hint"
            className="h-12 text-base sm:max-w-xs"
          />
        </div>
      )}
      <div aria-live="polite">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="text-foreground">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {sentTo ? "Confirm" : "Text me a code"}
        </Button>
        {sentTo ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => {
              setSentTo(null);
              setCode("");
              setError(null);
            }}
          >
            Use a different number
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * The quick sign-up (owner, 01/11/2026): confirm a mobile, then where and
 * what, and the worker sees shifts near them. The rest waits until they're
 * ready.
 */
export function QuickStartForm({
  phone,
  suburbLabel,
  radiusKm,
  industries,
  chosen,
}: {
  phone: string | null;
  suburbLabel: string;
  radiusKm: number;
  industries: QuickIndustry[];
  chosen: string[];
}) {
  const [confirmed, setConfirmed] = useState(phone);
  const [selected, setSelected] = useState(() => new Set(chosen));
  const [open, setOpen] = useState<string | null>(
    () =>
      industries.find((industry) =>
        industry.workTypes.some((type) => chosen.includes(type.id)),
      )?.name ?? null,
  );
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(finishQuickStart);
  const workError = errors?.category_ids?.[0];

  return (
    <div className="space-y-8">
      <section aria-labelledby="mobile-title" className="space-y-3">
        <h2 id="mobile-title" className="text-lg font-semibold">
          1. Your mobile
        </h2>
        <MobileStep confirmed={confirmed} onConfirmed={setConfirmed} />
      </section>

      <section aria-labelledby="work-title" className="space-y-3">
        <h2
          id="work-title"
          className={cn(
            "text-lg font-semibold",
            !confirmed && "text-muted-foreground",
          )}
        >
          2. Where and what
        </h2>
        {confirmed ? (
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <FormField
                id="home_place"
                label="Your suburb"
                hint="To find work near you. Businesses never see it."
                error={errors?.home_place}
              >
                {(props) => (
                  <PlacePicker
                    {...props}
                    name="home_place"
                    kind="suburb"
                    defaultLabel={suburbLabel}
                    placeholder="Start typing your suburb or postcode"
                  />
                )}
              </FormField>
              <FormField
                id="travel_radius_km"
                label="How far will you travel?"
                error={errors?.travel_radius_km}
              >
                {(props) => (
                  <NativeSelect
                    {...props}
                    name="travel_radius_km"
                    defaultValue={String(radiusKm)}
                    className="sm:w-44"
                  >
                    {RADIUS_OPTIONS_KM.map((km) => (
                      <option key={km} value={km}>
                        Up to {km} km
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            </div>

            <fieldset
              className="space-y-3"
              aria-describedby={workError ? "category_ids-error" : "work-hint"}
            >
              <legend className="text-sm leading-none font-medium">
                What work do you want?
              </legend>
              <p id="work-hint" className="text-sm text-muted-foreground">
                Tap an industry, then tick the work that suits you. Choose as
                many as you like.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {industries.map((industry) => {
                  const count = industry.workTypes.filter((type) =>
                    selected.has(type.id),
                  ).length;
                  const isOpen = open === industry.name;
                  return (
                    <li
                      key={industry.name}
                      className={cn(
                        "rounded-xl border bg-card",
                        isOpen && "sm:col-span-2",
                        count > 0 && "border-primary",
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : industry.name)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <IndustryIcon
                            name={industry.icon}
                            className="size-5"
                          />
                        </span>
                        <span className="flex-1 font-semibold">
                          {industry.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {count > 0 ? `${count} chosen` : null}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      <ul
                        hidden={!isOpen}
                        className="grid gap-2 px-3 pb-3 sm:grid-cols-2"
                      >
                        {industry.workTypes.map((type) => (
                          <li
                            key={type.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                          >
                            <Checkbox
                              id={`work-${type.id}`}
                              name="category_ids"
                              value={type.id}
                              checked={selected.has(type.id)}
                              onCheckedChange={(checked) =>
                                setSelected((current) => {
                                  const next = new Set(current);
                                  if (checked) next.add(type.id);
                                  else next.delete(type.id);
                                  return next;
                                })
                              }
                            />
                            <Label
                              htmlFor={`work-${type.id}`}
                              className="font-normal"
                            >
                              {type.name}
                            </Label>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
              {workError ? (
                <p
                  id="category_ids-error"
                  className="text-sm font-medium text-destructive"
                >
                  {workError}
                </p>
              ) : null}
            </fieldset>

            <ActionFeedback state={state} />
            <SubmitButton
              pending={pending}
              size="lg"
              className="w-full sm:w-auto"
            >
              Show me shifts near me
            </SubmitButton>
          </form>
        ) : (
          <p className="text-muted-foreground">
            Next: your suburb and the work you want.
          </p>
        )}
      </section>
    </div>
  );
}
