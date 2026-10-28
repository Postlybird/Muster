import "server-only";

import type { IneligibleReason } from "@/domain/eligibility";
import { isExpired, validUntil, warningDue } from "@/domain/expiry";
import { addDays } from "@/domain/pay-runs";
import { bookingsAtRiskWith, type BookingAtRisk } from "@/lib/compliance";
import {
  formatCalendarDate,
  formatDayShort,
  formatTime,
  sydneyDateKey,
} from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { allRows } from "@/lib/supabase/all-rows";
import { workerName } from "@/lib/timesheet-format";

import { refreshWorkerMatches } from "./matching";
import { notify, notifyAdmins } from "./notifications";
import { getAllSettings } from "./settings";

/**
 * The compliance job (brief §4.9 expiry engine; §4.4 checking bookings
 * again before they start), run hourly. It warns workers before tickets
 * and visas expire, marks them expired when they do (which takes them off
 * work that needs them), tells admins about VEVO re-checks coming due,
 * and alerts the worker and admins about any booked shift that no longer
 * passes the rules. Each message goes once. Reads workers' papers, so it
 * uses the service-role key.
 */

type Admin = ReturnType<typeof createAdminClient>;

const WORKER_PROBLEMS: Partial<Record<IneligibleReason, string>> = {
  not_active: "your account isn't active",
  ticket_missing: "you don't have a ticket the job needs",
  ticket_expired: "a ticket the job needs expires before then",
  right_to_work: "we can't confirm your right to work for that day",
  police_check: "your police check will be too old by then",
};

const ADMIN_PROBLEMS: Partial<Record<IneligibleReason, string>> = {
  not_active: "their account isn't active",
  ticket_missing: "they don't have a ticket the job needs",
  ticket_expired: "a ticket the job needs expires before then",
  right_to_work: "their right to work can't be confirmed for that day",
  police_check: "their police check will be too old by then",
};

function describe(
  problems: readonly IneligibleReason[],
  words: Partial<Record<IneligibleReason, string>>,
): string {
  return problems.flatMap((problem) => words[problem] ?? []).join(" and ");
}

export async function runCompliance(now = new Date()) {
  const admin = createAdminClient();
  const settings = await getAllSettings();
  const today = sydneyDateKey(now);
  const days = settings.expiry_warning_days;
  const tickets = await checkTickets(
    admin,
    today,
    days,
    settings.police_check_max_age_months,
  );
  const visas = await checkVisas(admin, today, days);
  for (const workerId of new Set([...tickets.expired, ...visas.expired])) {
    await refreshWorkerMatches(workerId);
  }
  const rechecks = await vevoRechecksDue(admin, today);
  const atRisk = await flagBookingsAtRisk(
    admin,
    now,
    settings.police_check_max_age_months,
  );
  return {
    ticketWarnings: tickets.warned,
    ticketsExpired: tickets.expired.length,
    visaWarnings: visas.warned,
    visasExpired: visas.expired.length,
    vevoRechecksDue: rechecks,
    bookingsAtRisk: atRisk,
  };
}

/**
 * Tickets: a warning at each of the warning days, then expired the day
 * after the last good day. A renewal waiting to be checked, or already
 * checked, means there's nothing for the worker to do.
 */
async function checkTickets(
  admin: Admin,
  today: string,
  days: readonly number[],
  policeCheckMaxAgeMonths: number,
) {
  const horizon = addDays(today, Math.max(...days));
  const tickets = await allRows("tickets", (from, to) =>
    admin
      .from("worker_credentials")
      .select(
        "id, worker_id, credential_type_id, issued_on, expires_on, status, last_expiry_warning_days, credential_types(name, kind), workers!inner(profile_id, status)",
      )
      .in("status", ["verified", "pending"])
      .is("archived_at", null)
      .in("workers.status", ["active", "pending"])
      .order("id")
      .range(from, to),
  );
  const rows = tickets.map((row) => ({
    ...row,
    until: validUntil(
      {
        kind: row.credential_types?.kind ?? "ticket",
        issuedOn: row.issued_on,
        expiresOn: row.expires_on,
      },
      policeCheckMaxAgeMonths,
    ),
  }));
  const renewed = (ticket: (typeof rows)[number]) =>
    rows.some(
      (other) =>
        other.id !== ticket.id &&
        other.worker_id === ticket.worker_id &&
        other.credential_type_id === ticket.credential_type_id &&
        (other.status === "pending" ||
          (!!other.until && !!ticket.until && other.until > ticket.until)),
    );

  let warned = 0;
  const expired: string[] = [];
  for (const ticket of rows) {
    if (ticket.status !== "verified" || !ticket.until) continue;
    const name = ticket.credential_types?.name ?? "ticket";
    const values = {
      ticket: name,
      date: formatCalendarDate(ticket.until),
    };
    if (isExpired(today, ticket.until)) {
      const { data: marked } = await admin
        .from("worker_credentials")
        .update({ status: "expired" })
        .eq("id", ticket.id)
        .eq("status", "verified")
        .select("id");
      if (!marked?.length) continue;
      expired.push(ticket.worker_id);
      if (!renewed(ticket)) {
        await notify("ticket_expired", ticket.workers.profile_id, values, {
          url: "/worker/onboarding/tickets",
          dedupeKey: `ticket_expired:${ticket.id}`,
        });
      }
      continue;
    }
    if (ticket.until > horizon || renewed(ticket)) continue;
    const due = warningDue(today, ticket.until, days);
    if (
      due === null ||
      (ticket.last_expiry_warning_days !== null &&
        due >= ticket.last_expiry_warning_days)
    ) {
      continue;
    }
    await notify("ticket_expiring", ticket.workers.profile_id, values, {
      url: "/worker/onboarding/tickets",
      dedupeKey: `ticket_expiring:${ticket.id}:${due}`,
    });
    await admin
      .from("worker_credentials")
      .update({ last_expiry_warning_days: due })
      .eq("id", ticket.id);
    warned++;
  }
  return { warned, expired };
}

/**
 * Visas: warnings before the expiry date, then expired, so the worker can
 * give us their new visa to check.
 */
async function checkVisas(
  admin: Admin,
  today: string,
  days: readonly number[],
) {
  const { data, error } = await admin
    .from("work_rights")
    .select("id, worker_id, visa_expiry, workers!inner(profile_id, status)")
    .eq("basis", "visa")
    .eq("status", "verified")
    .not("visa_expiry", "is", null)
    .lte("visa_expiry", addDays(today, Math.max(...days)))
    .in("workers.status", ["active", "pending"]);
  if (error) throw new Error(`Couldn't load visas: ${error.message}`);
  let warned = 0;
  const expired: string[] = [];
  for (const rights of data ?? []) {
    const until = rights.visa_expiry!;
    const values = { date: formatCalendarDate(until) };
    if (isExpired(today, until)) {
      const { data: marked } = await admin
        .from("work_rights")
        .update({ status: "expired" })
        .eq("id", rights.id)
        .eq("status", "verified")
        .select("id");
      if (!marked?.length) continue;
      expired.push(rights.worker_id);
      await notify("visa_expired", rights.workers.profile_id, values, {
        url: "/worker/onboarding/right-to-work",
        dedupeKey: `visa_expired:${rights.id}:${until}`,
      });
      continue;
    }
    const due = warningDue(today, until, days);
    if (due === null) continue;
    await notify("visa_expiring", rights.workers.profile_id, values, {
      url: "/worker/onboarding/right-to-work",
      dedupeKey: `visa_expiring:${rights.id}:${until}:${due}`,
    });
    warned++;
  }
  return { warned, expired };
}

/**
 * Admins are emailed a week before each VEVO re-check is due (brief §4.1);
 * Verification lists them from two weeks before.
 */
async function vevoRechecksDue(admin: Admin, today: string) {
  const { data: due, error } = await admin
    .from("work_rights")
    .select(
      "id, worker_id, next_check_due, workers!inner(preferred_name, legal_first_name, legal_last_name, status)",
    )
    .eq("status", "verified")
    .lte("next_check_due", addDays(today, 7))
    .neq("workers.status", "offboarded");
  if (error) throw new Error(`Couldn't load re-checks: ${error.message}`);
  for (const rights of due) {
    await notifyAdmins(
      "vevo_recheck_due",
      {
        worker: workerName(rights.workers),
        date: formatCalendarDate(rights.next_check_due!),
      },
      {
        url: `/admin/workers/${rights.worker_id}#right-to-work`,
        dedupeKey: `vevo_recheck:${rights.id}:${rights.next_check_due}`,
      },
    );
  }
  return due.length;
}

/** Tells the worker and admins about each booking at risk, once. */
async function flagBookingsAtRisk(
  admin: Admin,
  now: Date,
  policeCheckMaxAgeMonths: number,
) {
  const atRisk = await bookingsAtRiskWith(admin, now, policeCheckMaxAgeMonths);
  for (const booking of atRisk) await alert(admin, booking);
  return atRisk.length;
}

async function alert(admin: Admin, booking: BookingAtRisk) {
  const when = `on ${formatDayShort(booking.start)} from ${formatTime(booking.start)}`;
  // Once per booking: an admin who has settled it isn't asked again.
  const { data: flagged } = await admin
    .from("admin_flags")
    .select("id")
    .eq("kind", "booking_at_risk")
    .eq("assignment_id", booking.assignmentId)
    .limit(1);
  if (!flagged?.length) {
    const { data: job } = await admin
      .from("jobs")
      .select("business_id")
      .eq("id", booking.jobId)
      .single();
    await admin.from("admin_flags").insert({
      kind: "booking_at_risk",
      worker_id: booking.workerId,
      business_id: job?.business_id ?? null,
      assignment_id: booking.assignmentId,
      summary: `Booked for ${booking.work} with ${booking.business} ${when}, but ${describe(booking.problems, ADMIN_PROBLEMS)}.`,
    });
  }
  await notify(
    "booking_at_risk",
    booking.profileId,
    {
      work: booking.work,
      business: booking.business,
      when,
      problem: describe(booking.problems, WORKER_PROBLEMS),
    },
    {
      url: `/worker/my-shifts`,
      dedupeKey: `booking_at_risk:${booking.assignmentId}`,
    },
  );
  await notifyAdmins(
    "admin_booking_at_risk",
    {
      worker: booking.workerName,
      work: booking.work,
      business: booking.business,
      when,
      problem: describe(booking.problems, ADMIN_PROBLEMS),
    },
    {
      url: `/admin/workers/${booking.workerId}`,
      dedupeKey: `admin_booking_at_risk:${booking.assignmentId}`,
    },
  );
}
