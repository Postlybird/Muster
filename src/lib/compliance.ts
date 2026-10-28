import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";

import {
  checkEligibility,
  type IneligibleReason,
  type ShiftFacts,
  type WorkerFacts,
} from "@/domain/eligibility";
import { bookingProblems } from "@/domain/expiry";
import { STATE_TIME_ZONES, type StateCode } from "@/domain/pay";

import { allRows } from "./supabase/all-rows";
import type { Database } from "./supabase/database.types";
import { workerName } from "./timesheet-format";

type Client = SupabaseClient<Database>;

export type BookingAtRisk = {
  assignmentId: string;
  jobId: string;
  workerId: string;
  profileId: string;
  workerName: string;
  work: string;
  business: string;
  start: Date;
  problems: IneligibleReason[];
};

/**
 * Booked shifts still to come that no longer pass the rules (brief §4.4:
 * checked again before the start; §4.9: after something expires). Reads
 * workers' papers, so `client` holds the service-role key.
 */
export async function bookingsAtRiskWith(
  client: Client,
  now: Date,
  policeCheckMaxAgeMonths: number,
): Promise<BookingAtRisk[]> {
  const bookings = await allRows("bookings", (from, to) =>
    client
      .from("assignments")
      .select(
        "id, worker_id, shifts!inner(starts_at, ends_at, job_id, jobs(business_id, category_id, level, police_check_required, job_credentials(credential_type_id), sites(lat, lng, state), categories(name), businesses(trading_name, legal_name))), workers(id, profile_id, status, preferred_name, legal_first_name, legal_last_name, travel_radius_km, worker_categories(category_id, level, years_experience), worker_credentials(credential_type_id, issued_on, expires_on, status, archived_at, credential_types(kind)), work_rights(status, basis, visa_expiry, next_check_due, work_limit_flag))",
      )
      .eq("status", "confirmed")
      .gt("shifts.starts_at", now.toISOString())
      .order("id")
      .range(from, to),
  );

  return bookings.flatMap((booking) => {
    const shift = booking.shifts;
    const job = shift.jobs;
    const worker = booking.workers;
    if (!job?.sites || !job.category_id || !worker) return [];
    const timeZone =
      STATE_TIME_ZONES[job.sites.state as StateCode] ?? STATE_TIME_ZONES.NSW;
    const start = new Date(shift.starts_at);
    const workerFacts: WorkerFacts = {
      id: worker.id,
      status: worker.status,
      // Distance, availability and other bookings were settled at booking.
      lat: null,
      lng: null,
      travelRadiusKm: worker.travel_radius_km,
      categories: worker.worker_categories.map((c) => ({
        categoryId: c.category_id,
        level: c.level,
        yearsExperience: c.years_experience,
      })),
      credentials: worker.worker_credentials
        .filter((c) => c.status === "verified" && !c.archived_at)
        .map((c) => ({
          typeId: c.credential_type_id,
          kind: c.credential_types?.kind ?? "ticket",
          issuedOn: c.issued_on,
          expiresOn: c.expires_on,
        })),
      rightToWork: worker.work_rights
        ? {
            status: worker.work_rights.status,
            basis: worker.work_rights.basis,
            visaExpiry: worker.work_rights.visa_expiry,
            nextCheckDue: worker.work_rights.next_check_due,
            workLimitFlag: worker.work_rights.work_limit_flag,
          }
        : null,
      blockedDates: [],
      bookings: [],
    };
    const shiftFacts: ShiftFacts = {
      businessId: job.business_id,
      categoryId: job.category_id,
      level: job.level,
      start,
      end: new Date(shift.ends_at),
      date: formatInTimeZone(start, timeZone, "yyyy-MM-dd"),
      siteLat: Number(job.sites.lat),
      siteLng: Number(job.sites.lng),
      requiredTicketTypeIds: job.job_credentials.map(
        (link) => link.credential_type_id,
      ),
      policeCheckRequired: job.police_check_required,
    };
    const problems = bookingProblems(
      checkEligibility(workerFacts, shiftFacts, {
        blockedWorkerIds: new Set(),
        policeCheckMaxAgeMonths,
      }),
    );
    if (problems.length === 0) return [];
    return [
      {
        assignmentId: booking.id,
        jobId: shift.job_id,
        workerId: worker.id,
        profileId: worker.profile_id,
        workerName: workerName(worker),
        work: job.categories?.name ?? "Work",
        business:
          job.businesses?.trading_name ?? job.businesses?.legal_name ?? "",
        start,
        problems,
      },
    ];
  });
}
