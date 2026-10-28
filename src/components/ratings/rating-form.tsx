"use client";

import { Star } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId, useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

const WORDS = ["Poor", "Not great", "OK", "Good", "Excellent"];

/** One to five stars, as a radio group a keyboard can use. */
function StarsField({
  idPrefix,
  legend,
  error,
}: {
  idPrefix: string;
  legend: string;
  error?: string[];
}) {
  const [value, setValue] = useState("");
  const legendId = useId();
  const chosen = Number(value) || 0;
  return (
    <fieldset className="space-y-2">
      <legend id={legendId} className="text-sm leading-none font-medium">
        {legend}
      </legend>
      <RadioGroupPrimitive.Root
        name="score"
        value={value}
        onValueChange={setValue}
        aria-labelledby={legendId}
        aria-describedby={`${idPrefix}-stars-status`}
        aria-invalid={error ? true : undefined}
        className="flex gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <RadioGroupPrimitive.Item
            key={n}
            value={String(n)}
            id={`${idPrefix}-stars-${n}`}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${WORDS[n - 1]!.toLowerCase()}`}
            className="flex size-11 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Star
              aria-hidden
              className={cn(
                "size-8",
                n <= chosen
                  ? "fill-warning text-warning"
                  : "text-muted-foreground",
              )}
            />
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      <p
        id={`${idPrefix}-stars-status`}
        className="text-sm text-muted-foreground"
      >
        {chosen ? WORDS[chosen - 1] : "Choose 1 to 5 stars."}
      </p>
      {error ? <p className="text-sm text-destructive">{error[0]}</p> : null}
    </fieldset>
  );
}

/**
 * Stars, tags and a private note for our team (brief §4.7), plus any
 * extra fields (a business's favourite or block).
 */
export function RatingForm({
  action,
  idPrefix,
  starsLegend,
  tags,
  submitLabel = "Send rating",
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  idPrefix: string;
  starsLegend: string;
  /** Tag codes and their labels. */
  tags: Readonly<Record<string, string>>;
  submitLabel?: string;
  children?: React.ReactNode;
}) {
  // The page swaps the form for the rating once it's saved.
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <StarsField
        idPrefix={idPrefix}
        legend={starsLegend}
        error={fieldErrors?.score}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm leading-none font-medium">
          What stood out? (optional)
        </legend>
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          {Object.entries(tags).map(([code, label]) => (
            <div key={code} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={`${idPrefix}-tag-${code}`}
                name="tag"
                value={code}
              />
              <Label
                htmlFor={`${idPrefix}-tag-${code}`}
                className="font-normal"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>
      {children}
      <FormField
        id={`${idPrefix}-note`}
        label="Anything else? (optional)"
        hint="Only our team sees this."
        error={fieldErrors?.note}
      >
        {(props) => (
          <Textarea {...props} name="note" rows={3} maxLength={1000} />
        )}
      </FormField>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} pendingText="Sending…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
