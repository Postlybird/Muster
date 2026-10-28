import { formatInTimeZone } from "date-fns-tz";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JOB_TYPES, urgentStartAt, weekdayOf } from "@/domain/jobs";
import { STATE_TIME_ZONES, type StateCode } from "@/domain/pay";
import { loadDraft } from "@/server/jobs";

import { PostStepFrame } from "../frame";
import { WhenForm, type WhenValues } from "./when-form";

export const metadata: Metadata = { title: "Post work: when" };

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export default async function WhenStepPage({
  params,
}: PageProps<"/business/post/[id]/when">) {
  const { id } = await params;
  const { job, supabase } = await loadDraft(id);
  if (!job.site_id || !job.category_id) {
    redirect(`/business/post/${job.id}/what`);
  }
  const [{ data: site }, { data: shifts }, { data: copiedShift }] =
    await Promise.all([
      supabase.from("sites").select("state").eq("id", job.site_id).single(),
      supabase
        .from("shifts")
        .select("starts_at, ends_at, break_minutes")
        .eq("job_id", job.id)
        .order("starts_at"),
      job.copied_from
        ? supabase
            .from("shifts")
            .select("starts_at, ends_at, break_minutes")
            .eq("job_id", job.copied_from)
            .order("starts_at")
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const timeZone = STATE_TIME_ZONES[(site?.state ?? "NSW") as StateCode];
  const local = (value: string | Date, format: string) =>
    formatInTimeZone(value, timeZone, format);

  const today = local(new Date(), "yyyy-MM-dd");
  const first = shifts?.[0];
  const last = shifts?.at(-1);
  // Times from this draft, else the job it was copied from, else a day shift.
  const pattern = first ?? copiedShift;
  // Several days default to the next fortnight of weekdays.
  const nextMonday = addDays(today, (8 - weekdayOf(today)) % 7 || 7);
  const values: WhenValues = {
    date: first ? local(first.starts_at, "yyyy-MM-dd") : addDays(today, 1),
    from: first ? local(first.starts_at, "yyyy-MM-dd") : nextMonday,
    to: last ? local(last.starts_at, "yyyy-MM-dd") : addDays(nextMonday, 11),
    weekdays: shifts?.length
      ? [
          ...new Set(
            shifts.map((s) => weekdayOf(local(s.starts_at, "yyyy-MM-dd"))),
          ),
        ]
      : [1, 2, 3, 4, 5],
    start: pattern ? local(pattern.starts_at, "HH:mm") : "07:00",
    end: pattern ? local(pattern.ends_at, "HH:mm") : "15:30",
    breakMinutes: pattern ? String(pattern.break_minutes) : "30",
  };
  if (job.type === "urgent" && !first) {
    const start = urgentStartAt(new Date());
    values.date = local(start, "yyyy-MM-dd");
    values.start = local(start, "HH:mm");
    values.end = local(new Date(start.getTime() + 8 * 3_600_000), "HH:mm");
  }

  return (
    <PostStepFrame
      jobId={job.id}
      step="when"
      completed={job.steps}
      title="When"
      description={JOB_TYPES[job.type].description}
    >
      <WhenForm jobId={job.id} type={job.type} values={values} />
    </PostStepFrame>
  );
}
