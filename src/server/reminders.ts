import "server-only";

import { formatDayShort, formatTime, zoneOf } from "@/lib/format";
import { formatAuPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

import { notify } from "./notifications";

const HOUR = 3_600_000;

type Kind = "day_before" | "soon";

/**
 * Reminds booked workers about their shifts (brief §4.4): the day before,
 * and two hours before. Each booking is claimed before it's sent, so two
 * runs at once never send the same reminder twice.
 */
export async function sendReminders(now = new Date()) {
  return {
    dayBefore: await remind("day_before", now),
    soon: await remind("soon", now),
  };
}

async function remind(kind: Kind, now: Date): Promise<number> {
  const admin = createAdminClient();
  const column =
    kind === "day_before" ? "reminded_day_before_at" : "reminded_soon_at";
  const from = kind === "day_before" ? new Date(now.getTime() + 2 * HOUR) : now;
  const to = new Date(now.getTime() + (kind === "day_before" ? 24 : 2) * HOUR);
  const { data: due, error } = await admin
    .from("assignments")
    .select("id, shifts!inner(starts_at)")
    .eq("status", "confirmed")
    .is(column, null)
    .gt("shifts.starts_at", from.toISOString())
    .lte("shifts.starts_at", to.toISOString());
  if (error) throw new Error(`Couldn't find reminders: ${error.message}`);
  if (!due?.length) return 0;

  const { data: claimed } = await admin
    .from("assignments")
    .update(
      kind === "day_before"
        ? { reminded_day_before_at: now.toISOString() }
        : { reminded_soon_at: now.toISOString() },
    )
    .in(
      "id",
      due.map((row) => row.id),
    )
    .is(column, null)
    .select(
      "id, workers(profile_id), shifts(starts_at, job_id, jobs(report_to_name, report_to_phone, categories(name), businesses(trading_name, legal_name), sites(address_line1, suburb, state, report_to_name, report_to_phone)))",
    );
  await Promise.all(
    (claimed ?? []).map((booking) => {
      const shift = booking.shifts;
      const job = shift?.jobs;
      if (!shift || !job || !booking.workers) return null;
      const site = job.sites;
      // The site's local time.
      const timeZone = zoneOf(site?.state);
      const reportTo = job.report_to_name ?? site?.report_to_name;
      const reportPhone = job.report_to_phone ?? site?.report_to_phone;
      const values = {
        work: job.categories?.name ?? "Your shift",
        business:
          job.businesses?.trading_name ??
          job.businesses?.legal_name ??
          "the business",
        when:
          kind === "day_before"
            ? `on ${formatDayShort(shift.starts_at, timeZone)} from ${formatTime(shift.starts_at, timeZone)}`
            : `today from ${formatTime(shift.starts_at, timeZone)}`,
        address: site ? `${site.address_line1}, ${site.suburb}` : "",
        report_to: reportTo
          ? `Report to ${reportTo}${reportPhone ? ` on ${formatAuPhone(reportPhone)}` : ""}.`
          : "",
      };
      return notify(
        kind === "day_before" ? "reminder_day_before" : "reminder_soon",
        booking.workers.profile_id,
        values,
        { url: `/worker/shifts/${shift.job_id}` },
      );
    }),
  );
  return claimed?.length ?? 0;
}
