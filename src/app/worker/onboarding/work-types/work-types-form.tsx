"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { StepActions } from "../step-actions";
import { saveWorkTypes } from "./actions";

export type CategoryOption = {
  id: string;
  name: string;
  description: string;
  needs: string[];
};

const YEARS = Array.from({ length: 11 }, (_, years) => ({
  value: years,
  label:
    years === 0
      ? "Less than 1 year"
      : years === 10
        ? "10 years or more"
        : `${years} year${years === 1 ? "" : "s"}`,
}));

export function WorkTypesForm({
  mode,
  categories,
  chosen,
  bio,
}: {
  mode: "wizard" | "edit";
  categories: CategoryOption[];
  /** Category id → years of experience. */
  chosen: Record<string, number>;
  bio: string;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveWorkTypes);
  const [selected, setSelected] = useState(() => new Set(Object.keys(chosen)));
  const [bioLength, setBioLength] = useState(bio.length);
  const categoryError = errors?.category_ids?.[0];

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      <fieldset
        className="space-y-3"
        aria-describedby={categoryError ? "category_ids-error" : undefined}
      >
        <legend className="text-sm leading-none font-medium">
          What work do you want?
        </legend>
        <p className="text-sm text-muted-foreground">
          Choose all that suit you. You&apos;ll see shifts in these, once you
          have the tickets they need.
        </p>
        <ul className="space-y-3">
          {categories.map((category) => {
            const isChosen = selected.has(category.id);
            return (
              <li
                key={category.id}
                className={cn(
                  "space-y-3 rounded-lg border p-3",
                  isChosen && "border-primary bg-accent",
                  categoryError && "border-destructive",
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`category-${category.id}`}
                    name="category_ids"
                    value={category.id}
                    checked={isChosen}
                    onCheckedChange={(checked) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (checked) next.add(category.id);
                        else next.delete(category.id);
                        return next;
                      })
                    }
                    className="mt-0.5"
                    aria-describedby={`category-${category.id}-needs`}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="flex-col items-start gap-1 leading-snug"
                  >
                    <span className="text-base">{category.name}</span>
                    {category.description ? (
                      <span className="font-normal text-muted-foreground">
                        {category.description}
                      </span>
                    ) : null}
                  </Label>
                </div>
                <p
                  id={`category-${category.id}-needs`}
                  className="pl-9 text-sm text-muted-foreground"
                >
                  {category.needs.length > 0
                    ? `Needs: ${category.needs.join(", ")}`
                    : "No tickets needed"}
                </p>
                {isChosen ? (
                  <div className="space-y-2 pl-9">
                    <Label htmlFor={`years-${category.id}`}>
                      Experience in this work
                    </Label>
                    <NativeSelect
                      id={`years-${category.id}`}
                      name={`years_${category.id}`}
                      defaultValue={chosen[category.id] ?? 0}
                      className="sm:w-60"
                    >
                      {YEARS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {categoryError ? (
          <p id="category_ids-error" className="text-sm text-destructive">
            {categoryError}
          </p>
        ) : null}
      </fieldset>

      <FormField
        id="bio"
        label="A little about you (optional)"
        hint={`What businesses see when you apply. ${500 - bioLength} characters left.`}
        error={errors?.bio}
      >
        {(props) => (
          <Textarea
            {...props}
            name="bio"
            defaultValue={bio}
            rows={4}
            maxLength={500}
            placeholder="For example: three years on water damage jobs, happy to start early."
            onChange={(event) => setBioLength(event.target.value.length)}
          />
        )}
      </FormField>

      <ActionFeedback state={state} />
      <StepActions mode={mode} step="work-types" pending={pending} />
    </form>
  );
}
