import { brand } from "@/config/brand";
import { toIcs } from "@/domain/calendar";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

/** The worker's booked shifts on a job, as a calendar file. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/worker/shifts/[id]/calendar">,
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const [{ data: mine }, { data: job }] = await Promise.all([
    supabase.rpc("my_shifts", { p_job_id: id }),
    supabase.rpc("my_job", { p_job_id: id }).maybeSingle(),
  ]);
  const booked = (mine ?? []).filter(
    (shift) => shift.assignment_status === "confirmed",
  );
  if (!job?.booked || booked.length === 0) {
    return new Response("No booked shifts.", { status: 404 });
  }
  const location = [
    job.address_line1,
    [job.suburb, job.state, job.postcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const description = [
    job.report_to_name
      ? `Report to ${job.report_to_name}${job.report_to_phone ? ` on ${formatAuPhone(job.report_to_phone)}` : ""}.`
      : null,
    job.access_notes ? `Getting in: ${job.access_notes}` : null,
    job.instructions || null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const ics = toIcs(
    booked.map((shift) => ({
      uid: `${shift.assignment_id}@${brand.name.toLowerCase()}`,
      start: new Date(shift.starts_at),
      end: new Date(shift.ends_at),
      summary: `${job.category_name} for ${job.business_name}`,
      location,
      description,
    })),
    { productName: brand.name },
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shifts.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
