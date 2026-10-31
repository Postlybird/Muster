import { Phone } from "lucide-react";
import Link from "next/link";

import { ActionButton } from "@/components/forms/action-button";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { WorkerCard } from "@/components/jobs/worker-card";
import { Button } from "@/components/ui/button";
import { shiftsLabel } from "@/domain/bookings";
import { formatDayShort, formatTime } from "@/lib/format";
import { attendanceOf } from "@/lib/my-shifts";
import { formatAuPhone } from "@/lib/phone";
import { businessTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { workerPhotoLinks } from "@/server/worker-photos";

import { confirmArrival, pickApplicant, reportNoShow } from "./actions";

type Shift = { id: string; starts_at: string; ends_at: string };

/** "All 5 shifts", or the days at the site. */
function daysLabel(
  shiftIds: readonly string[],
  shifts: readonly Shift[],
  timeZone: string,
) {
  if (shiftIds.length === shifts.length && shifts.length > 1) {
    return `All ${shifts.length} shifts`;
  }
  return shifts
    .filter((shift) => shiftIds.includes(shift.id))
    .map((shift) => formatDayShort(shift.starts_at, timeZone))
    .join(", ");
}

/**
 * The workers who applied, best match first (brief §4.4 ranking), for the
 * business to pick ("I'll choose").
 */
export async function Applicants({
  jobId,
  shifts,
  timeZone,
  canPick,
}: {
  jobId: string;
  shifts: Shift[];
  /** The site's. */
  timeZone: string;
  canPick: boolean;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("job_applicants", { p_job_id: jobId });
  const applicants = data ?? [];
  const photos = await workerPhotoLinks(applicants.map((a) => a.photo_path));
  return (
    <section
      aria-labelledby="applicants"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-1">
        <h2 id="applicants" className="text-lg font-semibold">
          Applicants
        </h2>
        <p className="text-sm text-muted-foreground">
          {applicants.length === 0
            ? "No one yet. Workers who match can apply now, and we'll email you when the first one does."
            : "Best match first: your favourites, then past shifts with you, rating, reliability, distance and experience. Booking someone confirms them straight away."}
        </p>
      </div>
      {applicants.length > 0 ? (
        <ul className="divide-y">
          {applicants.map((applicant) => (
            <li key={applicant.worker_id} className="py-4 first:pt-0 last:pb-0">
              <WorkerCard
                name={applicant.display_name}
                photoUrl={
                  applicant.photo_path
                    ? (photos.get(applicant.photo_path) ?? null)
                    : null
                }
                rating={
                  applicant.rating === null ? null : Number(applicant.rating)
                }
                reliability={
                  applicant.reliability === null
                    ? null
                    : Number(applicant.reliability)
                }
                shiftsCompleted={applicant.shifts_completed}
                tickets={applicant.tickets}
                note={applicant.note}
              >
                <p className="text-sm">
                  Applied for:{" "}
                  {daysLabel(applicant.shift_ids, shifts, timeZone)}
                </p>
                {canPick ? (
                  <ActionButton
                    action={pickApplicant.bind(
                      null,
                      jobId,
                      applicant.worker_id,
                      applicant.display_name,
                    )}
                    pendingText="Booking…"
                    aria-label={`Book ${shiftsLabel(applicant.shift_ids.length)} for ${applicant.display_name}`}
                  >
                    Book {shiftsLabel(applicant.shift_ids.length)}
                  </ActionButton>
                ) : null}
              </WorkerCard>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Who's coming, with their mobile numbers (shared once booked). */
export async function Booked({
  jobId,
  shifts,
  timeZone,
  now,
}: {
  jobId: string;
  shifts: Shift[];
  /** The site's. */
  timeZone: string;
  now: Date;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("job_bookings", { p_job_id: jobId });
  const bookings = data ?? [];
  if (bookings.length === 0) return null;
  const byWorker = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    byWorker.set(booking.worker_id, [
      ...(byWorker.get(booking.worker_id) ?? []),
      booking,
    ]);
  }
  const assignmentIds = bookings.map((b) => b.assignment_id);
  const [photos, { data: events }, { data: timesheets }] = await Promise.all([
    workerPhotoLinks(bookings.map((b) => b.photo_path)),
    supabase
      .from("attendance_events")
      .select(
        "assignment_id, kind, occurred_at, inside_geofence, distance_m, reason",
      )
      .in("assignment_id", assignmentIds),
    supabase
      .from("timesheets")
      .select("id, assignment_id, status")
      .in("assignment_id", assignmentIds),
  ]);
  const attendance = (assignmentId: string) =>
    (events ?? []).filter((e) => e.assignment_id === assignmentId);
  const timesheetOf = (assignmentId: string) =>
    (timesheets ?? []).find((t) => t.assignment_id === assignmentId);
  return (
    <section
      aria-labelledby="booked"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 id="booked" className="text-lg font-semibold">
        Booked
      </h2>
      <ul className="divide-y">
        {[...byWorker.values()].map((rows) => {
          const worker = rows[0]!;
          return (
            <li key={worker.worker_id} className="py-4 first:pt-0 last:pb-0">
              <WorkerCard
                name={worker.display_name}
                photoUrl={
                  worker.photo_path
                    ? (photos.get(worker.photo_path) ?? null)
                    : null
                }
                rating={worker.rating === null ? null : Number(worker.rating)}
                reliability={
                  worker.reliability === null
                    ? null
                    : Number(worker.reliability)
                }
                shiftsCompleted={worker.shifts_completed}
              >
                <p className="text-sm">
                  Booked for:{" "}
                  {daysLabel(
                    rows.map((row) => row.shift_id),
                    shifts,
                    timeZone,
                  )}
                </p>
                {rows
                  .flatMap((row) => {
                    const shift = shifts.find((s) => s.id === row.shift_id);
                    return shift && new Date(shift.starts_at) <= now
                      ? [{ row, shift }]
                      : [];
                  })
                  .map(({ row, shift }) => {
                    const events = attendance(row.assignment_id);
                    const state = attendanceOf(events);
                    const away = events.find(
                      (e) =>
                        e.kind === "clock_in" && e.inside_geofence === false,
                    );
                    const day = formatDayShort(shift.starts_at, timeZone);
                    const timesheet = timesheetOf(row.assignment_id);
                    const over = new Date(shift.ends_at) <= now;
                    const noShow = (
                      <ConfirmAction
                        trigger={
                          <Button variant="outline" size="sm">
                            Didn&apos;t turn up {day}
                          </Button>
                        }
                        title={`Report ${worker.display_name} as a no-show?`}
                        description={`For ${day}. It counts against their reliability, and repeated no-shows put their account on hold. We'll let them know.`}
                        confirmLabel="Report no-show"
                        action={reportNoShow.bind(
                          null,
                          jobId,
                          row.assignment_id,
                          worker.worker_id,
                        )}
                      />
                    );
                    if (state.startedAt || timesheet) {
                      return (
                        <div key={row.assignment_id} className="space-y-2">
                          <p className="text-sm">
                            {day}:{" "}
                            {state.startedAt
                              ? `${
                                  state.confirmedByBusiness
                                    ? `arrival confirmed for ${formatTime(state.startedAt, timeZone)}`
                                    : `clocked in ${formatTime(state.startedAt, timeZone)}`
                                }${
                                  away
                                    ? ` (${away.distance_m === null ? "no location" : `${away.distance_m} m from the site`}: "${away.reason ?? ""}")`
                                    : ""
                                }${
                                  state.clockedOutAt
                                    ? `, out ${formatTime(state.clockedOutAt, timeZone)}`
                                    : ""
                                }.`
                              : "no clock-in."}
                            {timesheet ? (
                              <>
                                {" "}
                                <Link
                                  href={`/business/timesheets/${timesheet.id}`}
                                  className="font-medium text-primary underline underline-offset-4"
                                >
                                  Timesheet:{" "}
                                  {
                                    businessTimesheetStatuses[timesheet.status]
                                      .label
                                  }
                                </Link>
                              </>
                            ) : null}
                          </p>
                          {/* Clocked in from somewhere else: were they here? */}
                          {away && !state.clockedOutAt && !timesheet ? (
                            <div className="flex flex-wrap gap-2">{noShow}</div>
                          ) : null}
                        </div>
                      );
                    }
                    return (
                      <div key={row.assignment_id} className="space-y-2">
                        <p className="text-sm">
                          {day}: {over ? "no clock-in." : "not clocked in yet."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {over ? (
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/business/timesheets/add/${row.assignment_id}`}
                                aria-label={`Add ${worker.display_name}'s hours for ${day}`}
                              >
                                Add their hours
                              </Link>
                            </Button>
                          ) : (
                            <ActionButton
                              variant="outline"
                              size="sm"
                              action={confirmArrival.bind(
                                null,
                                jobId,
                                row.assignment_id,
                              )}
                              pendingText="Confirming…"
                            >
                              They&apos;re here
                            </ActionButton>
                          )}
                          {noShow}
                        </div>
                      </div>
                    );
                  })}
                {worker.mobile ? (
                  <a
                    href={`tel:${worker.mobile}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden />
                    {formatAuPhone(worker.mobile)}
                  </a>
                ) : null}
              </WorkerCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
