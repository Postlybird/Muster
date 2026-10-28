import { formatCents, formatDayShort, formatTime } from "@/lib/format";
import { shiftHours } from "@/lib/job-format";
import { hoursLabel, workedLabel } from "@/lib/timesheet-format";

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere] whitespace-pre-line">
        {children}
      </dd>
    </div>
  );
}

export type TimesheetFacts = {
  shift_starts_at: string;
  shift_ends_at: string;
  shift_break_minutes: number;
  recorded_start: string | null;
  recorded_finish: string | null;
  start_at: string;
  finish_at: string;
  break_minutes: number;
  adjusted_at: string | null;
  business_note: string | null;
  worker_note: string | null;
  resolution: string | null;
};

/** What was rostered and clocked, what was approved, and why. */
export function TimesheetDetails({
  timesheet,
  audience,
  arrivalConfirmed = false,
  awayReasons = [],
  offline = false,
  money,
}: {
  timesheet: TimesheetFacts;
  audience: "worker" | "business" | "admin";
  arrivalConfirmed?: boolean;
  /** Clock-ins or outs away from the site, with the reasons given. */
  awayReasons?: string[];
  /** Sent later, without signal. */
  offline?: boolean;
  /** The worker's pay, or the business's charge, once worked out. */
  money?: { label: string; cents: number | null };
}) {
  const t = timesheet;
  const rostered = `${formatDayShort(t.shift_starts_at)}, ${shiftHours({
    starts_at: t.shift_starts_at,
    ends_at: t.shift_ends_at,
  })}${t.shift_break_minutes ? `, ${t.shift_break_minutes}-minute break` : ""}`;
  const recorded = t.recorded_start
    ? `${arrivalConfirmed ? "Arrival confirmed" : "Clocked in"} ${formatTime(t.recorded_start)}, ${
        t.recorded_finish
          ? `out ${formatTime(t.recorded_finish)}`
          : "no clock-out (the rostered finish is used)"
      }`
    : "No clock-in";
  const workerSide = audience === "worker" ? "Your note" : "Worker's note";
  const businessSide =
    audience === "business" ? "Your note" : "Business's note";
  return (
    <dl className="space-y-2">
      <Detail label="Rostered">{rostered}</Detail>
      <Detail label="Recorded">{recorded}</Detail>
      {audience !== "worker" && offline ? (
        <Detail label="Without signal">
          Sent from the phone once it was back online.
        </Detail>
      ) : null}
      {audience !== "worker" && awayReasons.length > 0 ? (
        <Detail label="Away from the site">
          {awayReasons.map((reason) => `"${reason}"`).join("; ")}
        </Detail>
      ) : null}
      <Detail label={t.adjusted_at ? "Hours (changed)" : "Hours"}>
        {hoursLabel(t)} ({workedLabel(t)})
      </Detail>
      {money ? (
        <Detail label={money.label}>
          {money.cents === null
            ? "Worked out once the hours are approved"
            : formatCents(money.cents)}
        </Detail>
      ) : null}
      {t.business_note ? (
        <Detail label={businessSide}>{t.business_note}</Detail>
      ) : null}
      {t.worker_note ? (
        <Detail label={workerSide}>{t.worker_note}</Detail>
      ) : null}
      {t.resolution ? (
        <Detail label="Our team's decision">{t.resolution}</Detail>
      ) : null}
    </dl>
  );
}
