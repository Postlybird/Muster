import { DAY_TYPES, dayTypeLabels, type DayType } from "@/domain/rates";
import { formatCents, formatHours } from "@/lib/format";

/** A line of a worker's pay for one shift, from `my_timesheet_pay()`. */
export type PayLine = {
  rate_type: string;
  /** "worked", "minimum" (the top-up to the minimum shift) or "loading". */
  kind: string;
  minutes: number | null;
  rate_cents: number | null;
  pay_cents: number;
};

/** Worker-facing names, where the rate card's are terse. */
const WORKER_NAMES: Partial<Record<DayType, string>> = {
  ordinary: "Ordinary hours",
  night: "Night hours",
};

function lineName(line: PayLine): string {
  if (line.kind === "loading") return "Call-out loading";
  if (line.kind === "minimum") return "Top-up to the minimum shift";
  const type = (DAY_TYPES as readonly string[]).includes(line.rate_type)
    ? (line.rate_type as DayType)
    : null;
  if (!type) return line.rate_type;
  return WORKER_NAMES[type] ?? dayTypeLabels[type];
}

/**
 * How a worker's pay for a shift adds up (owner, 01/11/2026): the hours at
 * each rate, overtime included, then any call-out loading.
 */
export function PayBreakdown({ lines }: { lines: PayLine[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">How your pay adds up</h3>
      <ul className="divide-y rounded-lg border">
        {lines.map((line, index) => (
          <li
            key={`${line.rate_type}-${line.kind}-${index}`}
            className="flex items-start justify-between gap-3 p-3 text-sm"
          >
            <span>
              <span className="font-medium">{lineName(line)}</span>
              {line.minutes !== null && line.rate_cents !== null ? (
                <span className="block text-muted-foreground">
                  {formatHours(line.minutes)} at {formatCents(line.rate_cents)}{" "}
                  an hour
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatCents(line.pay_cents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
