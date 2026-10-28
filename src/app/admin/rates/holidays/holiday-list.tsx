"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCalendarDate } from "@/lib/format";

import { addHoliday, deleteHoliday } from "../actions";

type Holiday = { id: string; state: string; date: string; name: string };

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

function weekday(isoDate: string): string {
  // Noon UTC is the same calendar day everywhere in Australia.
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-AU", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function HolidayList({ holidays }: { holidays: Holiday[] }) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(addHoliday);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const years = [...new Set(holidays.map((h) => h.date.slice(0, 4)))];

  return (
    <div className="space-y-8">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-label="Add a public holiday"
        className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[8rem_12rem_1fr_auto] sm:items-end"
      >
        <FormField id="state" label="State" error={fieldErrors?.state}>
          {(props) => (
            <Select name="state" defaultValue="NSW">
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField id="date" label="Date" error={fieldErrors?.date}>
          {(props) => <Input {...props} name="date" type="date" />}
        </FormField>
        <FormField id="name" label="Name" error={fieldErrors?.name}>
          {(props) => (
            <Input {...props} name="name" placeholder="e.g. Labour Day" />
          )}
        </FormField>
        <SubmitButton pending={pending} pendingText="Adding…">
          Add holiday
        </SubmitButton>
        <div className="sm:col-span-4">
          <ActionFeedback state={state} />
        </div>
      </form>

      {years.map((year) => (
        <section
          key={year}
          aria-labelledby={`year-${year}`}
          className="space-y-2"
        >
          <h2 id={`year-${year}`} className="text-lg font-semibold">
            {year}
          </h2>
          <ul className="divide-y rounded-xl border">
            {holidays
              .filter((h) => h.date.startsWith(year))
              .map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex items-center gap-4 px-4 py-2"
                >
                  <span className="w-28 text-sm tabular-nums">
                    {weekday(holiday.date)} {formatCalendarDate(holiday.date)}
                  </span>
                  <span className="flex-1">{holiday.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {holiday.state}
                  </span>
                  <ConfirmAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${holiday.name} ${holiday.date}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    }
                    title={`Remove ${holiday.name}?`}
                    description="Shifts on this day will no longer be paid and billed at the public holiday rate. Shifts already booked keep their rates."
                    confirmLabel="Remove"
                    action={deleteHoliday.bind(null, holiday.id)}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
