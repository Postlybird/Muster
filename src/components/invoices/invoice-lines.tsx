import { formatCalendarDate, formatCents } from "@/lib/format";

export type InvoiceLine = {
  line_id: string;
  work_date: string;
  description: string;
  detail: string | null;
  hours: number;
  bill_cents: number;
};

function hoursText(hours: number): string {
  return `${Number(hours).toLocaleString("en-AU", { maximumFractionDigits: 2 })} h`;
}

/**
 * An invoice's lines and totals as a list, so it reads on a phone: a line
 * per worker per shift (brief §4.8), with what it was for.
 */
export function InvoiceLines({
  lines,
  subtotalCents,
  gstCents,
  totalCents,
}: {
  lines: InvoiceLine[];
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {lines.map((line) => (
          <li
            key={line.line_id}
            className="flex flex-col gap-1 p-3 sm:flex-row sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-muted-foreground">
                {formatCalendarDate(line.work_date)}
              </p>
              <p className="font-medium [overflow-wrap:anywhere]">
                {line.description}
              </p>
              {line.detail ? (
                <p className="text-sm text-muted-foreground">{line.detail}</p>
              ) : null}
            </div>
            <p className="shrink-0 sm:text-right">
              <span className="font-medium">
                {formatCents(line.bill_cents)}
              </span>
              <span className="text-sm text-muted-foreground">
                {" "}
                for {hoursText(line.hours)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Before GST</dt>
          <dd>{formatCents(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>GST</dt>
          <dd>{formatCents(gstCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatCents(totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
