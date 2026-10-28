"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { WizardActions } from "@/components/wizard/wizard-actions";
import {
  datesInRange,
  isOvernightShift,
  MAX_SHIFTS,
  type JobType,
} from "@/domain/jobs";

import { saveWhen } from "./actions";

export type WhenValues = {
  date: string;
  from: string;
  to: string;
  weekdays: number[];
  start: string;
  end: string;
  breakMinutes: string;
};

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const BREAKS = [0, 15, 20, 30, 45, 60, 90, 120];

export function WhenForm({
  jobId,
  type,
  values,
}: {
  jobId: string;
  type: JobType;
  values: WhenValues;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveWhen.bind(null, jobId));
  const [from, setFrom] = useState(values.from);
  const [to, setTo] = useState(values.to);
  const [weekdays, setWeekdays] = useState(values.weekdays);
  const [start, setStart] = useState(values.start);
  const [end, setEnd] = useState(values.end);
  const breaks = BREAKS.includes(Number(values.breakMinutes))
    ? BREAKS
    : [...BREAKS, Number(values.breakMinutes)].sort((a, b) => a - b);

  const count =
    type === "multi_day" && from && to && from <= to
      ? datesInRange(from, to, weekdays).length
      : 0;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      {type === "multi_day" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="from" label="First day" error={errors?.from}>
              {(props) => (
                <Input
                  {...props}
                  name="from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              )}
            </FormField>
            <FormField id="to" label="Last day" error={errors?.to}>
              {(props) => (
                <Input
                  {...props}
                  name="to"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              )}
            </FormField>
          </div>
          <fieldset
            className="space-y-3"
            aria-describedby={errors?.weekdays ? "weekdays-error" : undefined}
          >
            <legend className="text-sm font-medium">Which days?</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Label
                  key={day.value}
                  htmlFor={`weekday-${day.value}`}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                >
                  <Checkbox
                    id={`weekday-${day.value}`}
                    name="weekdays"
                    value={String(day.value)}
                    checked={weekdays.includes(day.value)}
                    onCheckedChange={(checked) =>
                      setWeekdays((current) =>
                        checked
                          ? [...current, day.value]
                          : current.filter((d) => d !== day.value),
                      )
                    }
                  />
                  {day.label}
                </Label>
              ))}
            </div>
            {errors?.weekdays ? (
              <p id="weekdays-error" className="text-sm text-destructive">
                {errors.weekdays[0]}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {count > MAX_SHIFTS
                ? `That's more than ${MAX_SHIFTS} shifts. Post a shorter run.`
                : count > 0
                  ? `That's ${count} ${count === 1 ? "shift" : "shifts"}, each with the same hours.`
                  : "Choose the days to see how many shifts that is."}
            </p>
          </fieldset>
        </>
      ) : (
        <FormField
          id="date"
          label={
            type === "urgent" ? "Date (today for as soon as possible)" : "Date"
          }
          error={errors?.date}
        >
          {(props) => (
            <Input
              {...props}
              name="date"
              type="date"
              defaultValue={values.date}
              className="sm:w-56"
            />
          )}
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <FormField id="start" label="Start" error={errors?.start}>
          {(props) => (
            <Input
              {...props}
              name="start"
              type="time"
              step={900}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          )}
        </FormField>
        <FormField id="end" label="Finish" error={errors?.end}>
          {(props) => (
            <Input
              {...props}
              name="end"
              type="time"
              step={900}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          )}
        </FormField>
      </div>
      {start && end && isOvernightShift(start, end) ? (
        <p className="text-sm text-muted-foreground">
          Finishes the next morning.
        </p>
      ) : null}

      <FormField
        id="break_minutes"
        label="Unpaid break"
        hint="Workers aren't paid for this time, and you aren't billed for it."
        error={errors?.break_minutes}
      >
        {(props) => (
          <NativeSelect
            {...props}
            name="break_minutes"
            defaultValue={values.breakMinutes}
            className="sm:w-56"
          >
            {breaks.map((minutes) => (
              <option key={minutes} value={String(minutes)}>
                {minutes === 0 ? "No break" : `${minutes} minutes`}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>

      <ActionFeedback state={state} />
      <WizardActions
        pending={pending}
        backHref={`/business/post/${jobId}/what`}
      />
    </form>
  );
}
