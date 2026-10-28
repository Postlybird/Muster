import type { Metadata } from "next";

import {
  isAvailableNow,
  normaliseTime,
  type WeeklyWindow,
} from "@/domain/availability";
import { formatDayShort, formatTime, sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker } from "@/server/workers";

import { AvailableNow } from "./available-now";
import { BlockedDates } from "./blocked-dates";
import { WeeklyForm } from "./weekly-form";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const today = sydneyDateKey(new Date());
  const [{ data: weekly }, { data: blocks }] = await Promise.all([
    supabase
      .from("availability_weekly")
      .select("weekday, start_time, end_time")
      .eq("worker_id", worker.id),
    supabase
      .from("availability_blocks")
      .select("id, date, note")
      .eq("worker_id", worker.id)
      .gte("date", today)
      .order("date"),
  ]);
  const windows: WeeklyWindow[] | null =
    weekly && weekly.length > 0
      ? weekly.map((row) => ({
          weekday: row.weekday,
          start: normaliseTime(row.start_time) ?? "07:00",
          end: normaliseTime(row.end_time) ?? "17:00",
        }))
      : null;
  const now = new Date();
  const availableNow = isAvailableNow(worker.available_now_until, now);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="text-muted-foreground">
          When you can work. We use it to decide which shifts to tell you about.
        </p>
      </div>

      <AvailableNow
        on={availableNow}
        untilLabel={
          availableNow && worker.available_now_until
            ? formatTime(worker.available_now_until)
            : null
        }
        canUse={worker.status === "active"}
      />

      <section aria-labelledby="weekly" className="space-y-3">
        <h2 id="weekly" className="text-lg font-semibold">
          Your usual week
        </h2>
        <WeeklyForm
          context="page"
          windows={windows}
          urgentOptIn={worker.urgent_opt_in}
        />
      </section>

      <section aria-labelledby="blocked" className="space-y-3">
        <h2 id="blocked" className="text-lg font-semibold">
          Dates you can&apos;t work
        </h2>
        <BlockedDates
          today={today}
          blocks={(blocks ?? []).map((block) => ({
            id: block.id,
            label: formatDayShort(`${block.date}T12:00:00+10:00`),
            note: block.note,
          }))}
        />
      </section>
    </div>
  );
}
