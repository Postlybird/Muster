"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_WEEKLY,
  isOvernight,
  WEEKDAYS,
  type WeeklyWindow,
} from "@/domain/availability";
import { cn } from "@/lib/utils";

import { StepActions } from "../../onboarding/step-actions";
import { saveWeekly } from "./actions";

/** The weekly pattern and urgent call-out choice (onboarding and the Availability page). */
export function WeeklyForm({
  context,
  mode = "edit",
  windows,
  urgentOptIn,
}: {
  context: "onboarding" | "page";
  mode?: "wizard" | "edit";
  /** Saved windows; null means nothing saved yet (use the defaults). */
  windows: WeeklyWindow[] | null;
  urgentOptIn: boolean;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveWeekly.bind(null, context));
  const initial = windows ?? DEFAULT_WEEKLY;
  const [days, setDays] = useState(
    () =>
      Object.fromEntries(
        WEEKDAYS.map(({ day }) => {
          const saved = initial.find((w) => w.weekday === day);
          return [
            day,
            {
              on: !!saved,
              start: saved?.start ?? "07:00",
              end: saved?.end ?? "17:00",
            },
          ];
        }),
      ) as Record<number, { on: boolean; start: string; end: string }>,
  );

  function update(day: number, change: Partial<(typeof days)[number]>) {
    setDays((current) => ({
      ...current,
      [day]: { ...current[day]!, ...change },
    }));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      <fieldset
        className="space-y-3"
        aria-describedby={errors?.days ? "days-error" : "days-hint"}
      >
        <legend className="text-sm leading-none font-medium">
          When can you usually work?
        </legend>
        <p id="days-hint" className="text-sm text-muted-foreground">
          We tell you about shifts in these times first. You can still take
          other shifts.
        </p>
        <ul className="space-y-2">
          {WEEKDAYS.map(({ day, name }) => {
            const value = days[day]!;
            const error = errors?.[`day_${day}`]?.[0];
            return (
              <li
                key={day}
                className={cn(
                  "space-y-3 rounded-lg border p-3",
                  value.on && "border-primary",
                  error && "border-destructive",
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day_${day}`}
                    name={`day_${day}`}
                    checked={value.on}
                    onCheckedChange={(checked) =>
                      update(day, { on: checked === true })
                    }
                  />
                  <Label htmlFor={`day_${day}`} className="text-base">
                    {name}
                  </Label>
                </div>
                {value.on ? (
                  <div className="flex flex-wrap items-end gap-3 pl-9">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`start_${day}`}
                        className="font-normal text-muted-foreground"
                      >
                        From
                      </Label>
                      <Input
                        id={`start_${day}`}
                        name={`start_${day}`}
                        type="time"
                        step={900}
                        value={value.start}
                        onChange={(e) => update(day, { start: e.target.value })}
                        className="w-36"
                        aria-invalid={error ? true : undefined}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`end_${day}`}
                        className="font-normal text-muted-foreground"
                      >
                        To
                      </Label>
                      <Input
                        id={`end_${day}`}
                        name={`end_${day}`}
                        type="time"
                        step={900}
                        value={value.end}
                        onChange={(e) => update(day, { end: e.target.value })}
                        className="w-36"
                        aria-invalid={error ? true : undefined}
                      />
                    </div>
                    {value.start &&
                    value.end &&
                    isOvernight(value.start, value.end) ? (
                      <p className="pb-2 text-sm text-muted-foreground">
                        Finishes the next day
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {error ? (
                  <p className="pl-9 text-sm text-destructive">{error}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {errors?.days ? (
          <p id="days-error" className="text-sm text-destructive">
            {errors.days[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
        <Label htmlFor="urgent_opt_in" className="flex-col items-start gap-1">
          <span className="text-base">Urgent call-outs</span>
          <span className="font-normal text-muted-foreground">
            A text and an app notification, at any hour, when urgent work nearby
            needs someone fast. The first to accept gets it, and call-outs pay
            more.
          </span>
        </Label>
        <Switch
          id="urgent_opt_in"
          name="urgent_opt_in"
          defaultChecked={urgentOptIn}
        />
      </div>

      <ActionFeedback state={state} />
      {context === "onboarding" ? (
        <StepActions mode={mode} step="availability" pending={pending} />
      ) : (
        <SubmitButton pending={pending} size="lg">
          Save availability
        </SubmitButton>
      )}
    </form>
  );
}
