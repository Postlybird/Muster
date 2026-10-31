"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import { WorkerWordsField } from "@/components/forms/worker-words-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BIO_MAX } from "@/domain/worker-words";
import { cn } from "@/lib/utils";

import { StepActions } from "../step-actions";
import { saveWorkTypes } from "./actions";

export type CategoryOption = {
  id: string;
  name: string;
  description: string;
  needs: string[];
};

export type IndustryOptions = { name: string; categories: CategoryOption[] };

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
  groups,
  chosen,
  bio,
}: {
  mode: "wizard" | "edit";
  /** Work types, by industry. */
  groups: IndustryOptions[];
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
  // Industries start open where the worker has already chosen work.
  const [open, setOpen] = useState(
    () =>
      new Set(
        groups
          .filter((group) => group.categories.some((c) => c.id in chosen))
          .map((group) => group.name),
      ),
  );
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
          Open an industry and choose all that suit you. You&apos;ll see shifts
          in these, once you have the tickets they need.
        </p>
        <div className="space-y-3">
          {groups.map((group) => {
            const count = group.categories.filter((c) =>
              selected.has(c.id),
            ).length;
            return (
              <details
                key={group.name}
                open={open.has(group.name)}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setOpen((current) => {
                    const next = new Set(current);
                    if (isOpen) next.add(group.name);
                    else next.delete(group.name);
                    return next;
                  });
                }}
                className={cn(
                  "group rounded-xl border bg-card",
                  categoryError && "border-destructive",
                )}
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{group.name}</span>
                  <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                    {count > 0
                      ? `${count} chosen`
                      : `${group.categories.length} work ${group.categories.length === 1 ? "type" : "types"}`}
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <ul className="space-y-3 px-3 pb-3">
                  {group.categories.map((category) => {
                    const isChosen = selected.has(category.id);
                    return (
                      <li
                        key={category.id}
                        className={cn(
                          "space-y-3 rounded-lg border p-3",
                          isChosen && "border-primary bg-accent",
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
              </details>
            );
          })}
        </div>
        {categoryError ? (
          <p id="category_ids-error" className="text-sm text-destructive">
            {categoryError}
          </p>
        ) : null}
      </fieldset>

      <WorkerWordsField
        id="bio"
        name="bio"
        label="A little about you (optional)"
        hint="Businesses see this on your profile. No phone numbers, emails or links."
        defaultValue={bio}
        error={errors?.bio}
        max={BIO_MAX}
        placeholder="For example: three years behind a busy bar, happy to start early."
      />

      <ActionFeedback state={state} />
      <StepActions mode={mode} step="work-types" pending={pending} />
    </form>
  );
}
