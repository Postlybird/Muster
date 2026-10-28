import type { Metadata } from "next";

import { normaliseTime, type WeeklyWindow } from "@/domain/availability";
import { createClient } from "@/lib/supabase/server";

import { WeeklyForm } from "../../(app)/availability/weekly-form";
import { loadStep, StepFrame } from "../step-frame";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityStepPage() {
  const { worker, mode } = await loadStep();
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_weekly")
    .select("weekday, start_time, end_time")
    .eq("worker_id", worker.id);
  const windows: WeeklyWindow[] | null =
    data && data.length > 0
      ? data.map((row) => ({
          weekday: row.weekday,
          start: normaliseTime(row.start_time) ?? "07:00",
          end: normaliseTime(row.end_time) ?? "17:00",
        }))
      : null;

  return (
    <StepFrame
      mode={mode}
      step="availability"
      completed={worker.onboarding_steps}
      title="Availability"
      description="Your usual working week. You can block out dates and switch on 'available now' later, from the Availability page."
      back={{ href: "/worker/availability", label: "Back to availability" }}
    >
      <WeeklyForm
        context="onboarding"
        mode={mode}
        windows={windows}
        urgentOptIn={worker.urgent_opt_in}
      />
    </StepFrame>
  );
}
