import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { shiftSummary } from "@/lib/job-format";
import type { MyJob } from "@/lib/my-shifts";

const STATUS = {
  booked: { label: "Booked", variant: "success" },
  applied: { label: "Applied", variant: "info" },
  filled: { label: "Filled by others", variant: "neutral" },
} as const;

/** A job the worker is booked on or applied for. */
export function MyShiftCard({
  job,
  status,
}: {
  job: MyJob;
  status: keyof typeof STATUS;
}) {
  const { first } = job;
  return (
    <Link
      href={`/worker/shifts/${job.jobId}`}
      className="block space-y-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{first.category_name}</p>
          <p className="text-sm text-muted-foreground">{first.business_name}</p>
        </div>
        <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
      </div>
      <p className="flex items-start gap-2 text-sm">
        <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
        {shiftSummary(job.shifts)}
      </p>
      <p className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {first.suburb}
      </p>
    </Link>
  );
}
