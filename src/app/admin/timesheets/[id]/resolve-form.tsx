"use client";

import { useState } from "react";

import { ChoiceField } from "@/components/forms/choice-field";
import { HoursForm } from "@/components/timesheets/hours-form";
import type { ActionState } from "@/lib/forms";

/** Settle a query: pay these hours (changed if need be), or none. */
export function ResolveForm({
  action,
  day,
  defaults,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  day: string;
  defaults: { start: string; finish: string; breakMinutes: number };
}) {
  const [outcome, setOutcome] = useState("worked");
  return (
    <HoursForm
      action={action}
      idPrefix="resolve"
      day={day}
      defaults={defaults}
      note={{
        label: "What was decided, for both sides",
        hint: "We send it to the worker and the business.",
        required: true,
      }}
      submitLabel={outcome === "worked" ? "Pay these hours" : "Don't pay them"}
      pendingText="Settling…"
    >
      <ChoiceField
        id="outcome"
        name="outcome"
        legend="Outcome"
        value={outcome}
        onValueChange={setOutcome}
        choices={[
          {
            value: "worked",
            label: "They worked",
            description: "Pay and charge the hours below.",
          },
          {
            value: "not_worked",
            label: "They didn't work",
            description:
              "Nothing is paid or charged. The hours below are ignored.",
          },
        ]}
      />
    </HoursForm>
  );
}
