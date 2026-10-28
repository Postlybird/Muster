"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type Choice = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
};

/**
 * One choice from a short list, shown as large tappable cards. Works as an
 * uncontrolled form field (`name`, `defaultValue`) or controlled (`value`).
 */
export function ChoiceField({
  id,
  name,
  legend,
  hint,
  error,
  choices,
  defaultValue,
  value,
  onValueChange,
  columns = 2,
}: {
  id: string;
  name: string;
  legend: React.ReactNode;
  hint?: React.ReactNode;
  error?: string[];
  choices: Choice[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  columns?: 1 | 2;
}) {
  const legendId = useId();
  const message = error?.[0];
  const describedBy =
    [message ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <fieldset className="space-y-3">
      <legend id={legendId} className="text-sm leading-none font-medium">
        {legend}
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <RadioGroup
        name={name}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
        aria-labelledby={legendId}
        aria-describedby={describedBy}
        aria-invalid={message ? true : undefined}
        className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
      >
        {choices.map((choice) => (
          <Label
            key={choice.value}
            htmlFor={`${id}-${choice.value}`}
            className={cn(
              "flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 leading-snug font-normal",
              "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent",
              message && "border-destructive",
            )}
          >
            <RadioGroupItem
              id={`${id}-${choice.value}`}
              value={choice.value}
              className="mt-0.5"
            />
            <span className="space-y-1">
              <span className="block font-medium">{choice.label}</span>
              {choice.description ? (
                <span className="block text-sm text-muted-foreground">
                  {choice.description}
                </span>
              ) : null}
            </span>
          </Label>
        ))}
      </RadioGroup>
      {message ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}

export const YES_NO: Choice[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function yesNo(value: boolean | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return value ? "yes" : "no";
}
