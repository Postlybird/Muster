import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";

import { isOvernight, normaliseTime } from "@/domain/availability";
import {
  checkEligibility,
  rankScore,
  type IneligibleReason,
  type ShiftFacts,
  type WorkerFacts,
} from "@/domain/eligibility";
import { STATE_TIME_ZONES, type StateCode } from "@/domain/pay";
import { makePricer, type PricingData } from "@/domain/pricing";
import { hourlyPayCents, rateCardFromRow } from "@/domain/rates";

import { loadPricingData } from "./pricing";
import type { Database } from "./supabase/database.types";

/**
 * Matching workers to open shifts (brief §4.4). Loads the facts, applies
 * the rules in src/domain/eligibility.ts, and saves each worker's
 * eligibility and rank, plus what each shift pays. It reads every worker's
 * checks, so it runs with the service-role key: the server wraps it in
 * src/server/matching.ts, and the seed calls it for demo jobs.
 */

type Client = SupabaseClient<Database>;

export type MatchingSettings = PricingData["settings"] & {
  police_check_max_age_months: number;
};

type ShiftContext = {
  shiftId: string;
  jobId: string;
  businessId: string;
  urgent: boolean;
  postedAt: Date;
  favouritesFirstMinutes: number | null;
  timeZone: string;
  facts: ShiftFacts;
  /** Local weekday (1 = Monday) and minutes after midnight of the start. */
  weekday: number;
  startMinute: number;
};

type Candidate = WorkerFacts & {
  profileId: string;
  rating: number | null;
  reliability: number | null;
  urgentOptIn: boolean;
  availableNowUntil: string | null;
  weekly: { weekday: number; start: string; end: string }[];
};

export type UrgentOffer = { profileId: string; shiftId: string };

function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Whether a shift starts inside the worker's weekly availability. Used to
 * decide who's told about urgent work, not who may take it (plan question 3).
 */
export function availableAtStart(
  weekly: Candidate["weekly"],
  weekday: number,
  startMinute: number,
): boolean {
  return weekly.some((window) => {
    const start = minutesOf(window.start);
    const end = minutesOf(window.end);
    if (window.weekday === weekday) {
      return isOvernight(window.start, window.end)
        ? startMinute >= start
        : startMinute >= start && startMinute < end;
    }
    // Yesterday's window running past midnight.
    const yesterday = weekday === 1 ? 7 : weekday - 1;
    return (
      window.weekday === yesterday &&
      isOvernight(window.start, window.end) &&
      startMinute < end
    );
  });
}

/**
 * When a worker can first see a shift (brief §4.3: "offer to my favourites
 * first for X minutes"). Favourites see it when it's posted, and so does
 * everyone when none of the business's favourites can take it. A shift
 * someone has been shown is never hidden again.
 */
export function firstShown({
  postedAt,
  favouritesFirstMinutes,
  favourite,
  favouriteCanTake,
  shownBefore,
}: {
  postedAt: Date;
  favouritesFirstMinutes: number | null;
  favourite: boolean;
  favouriteCanTake: boolean;
  shownBefore: Date | null;
}): Date {
  const from =
    favourite || !favouritesFirstMinutes || !favouriteCanTake
      ? postedAt
      : new Date(postedAt.getTime() + favouritesFirstMinutes * 60_000);
  return shownBefore && shownBefore < from ? shownBefore : from;
}

async function loadShifts(
  client: Client,
  filter: { jobId: string } | { categoryIds: string[] },
  now: Date,
): Promise<ShiftContext[]> {
  let query = client
    .from("shifts")
    .select(
      "id, starts_at, ends_at, status, jobs!inner(id, business_id, category_id, level, type, status, posted_at, favourites_first_minutes, police_check_required, sites(lat, lng, state), job_credentials(credential_type_id))",
    )
    .eq("status", "open")
    .eq("jobs.status", "posted")
    .gt("starts_at", now.toISOString());
  query =
    "jobId" in filter
      ? query.eq("jobs.id", filter.jobId)
      : query.in("jobs.category_id", filter.categoryIds);
  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load shifts: ${error.message}`);
  return (data ?? []).flatMap((shift) => {
    const job = shift.jobs;
    if (!job.sites || !job.category_id) return [];
    const timeZone = STATE_TIME_ZONES[job.sites.state as StateCode];
    const start = new Date(shift.starts_at);
    const isoWeekday = Number(formatInTimeZone(start, timeZone, "i"));
    return [
      {
        shiftId: shift.id,
        jobId: job.id,
        businessId: job.business_id,
        urgent: job.type === "urgent",
        postedAt: new Date(job.posted_at ?? now),
        favouritesFirstMinutes: job.favourites_first_minutes,
        timeZone,
        weekday: isoWeekday,
        startMinute: minutesOf(formatInTimeZone(start, timeZone, "HH:mm")),
        facts: {
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
        },
      },
    ];
  });
}

async function loadCandidates(
  client: Client,
  filter: { categoryIds: string[] } | { workerId: string },
): Promise<Candidate[]> {
  let query = client
    .from("workers")
    .select(
      "id, profile_id, status, home_lat, home_lng, travel_radius_km, rating_avg, reliability_score, urgent_opt_in, available_now_until, worker_categories!inner(category_id, level, years_experience), worker_credentials(credential_type_id, issued_on, expires_on, status, archived_at, credential_types(kind)), work_rights(status, basis, visa_expiry, next_check_due, work_limit_flag), availability_blocks(date), availability_weekly(weekday, start_time, end_time)",
    )
    .eq("status", "active")
    .is("archived_at", null);
  query =
    "workerId" in filter
      ? query.eq("id", filter.workerId)
      : query.in("worker_categories.category_id", filter.categoryIds);
  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load workers: ${error.message}`);
  return (data ?? []).map((worker) => ({
    id: worker.id,
    profileId: worker.profile_id,
    status: worker.status,
    lat: worker.home_lat === null ? null : Number(worker.home_lat),
    lng: worker.home_lng === null ? null : Number(worker.home_lng),
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
    blockedDates: worker.availability_blocks.map((block) => block.date),
    // Booked shifts arrive with assignments in step 1.8.
    bookings: [],
    rating: worker.rating_avg === null ? null : Number(worker.rating_avg),
    reliability:
      worker.reliability_score === null
        ? null
        : Number(worker.reliability_score),
    urgentOptIn: worker.urgent_opt_in,
    availableNowUntil: worker.available_now_until,
    weekly: worker.availability_weekly.flatMap((window) => {
      const start = normaliseTime(window.start_time);
      const end = normaliseTime(window.end_time);
      return start && end ? [{ weekday: window.weekday, start, end }] : [];
    }),
  }));
}

/**
 * Which matches are being worked out: one job's shifts for every worker, or
 * every shift for one worker. Lookups filter on the narrow side, so their
 * lists of ids stay short.
 */
type Scope = { businessId: string; shiftIds: string[] } | { workerId: string };

/**
 * Works out and saves matches for some shifts and workers. Returns the
 * urgent offers to text (brief §5: urgent call-outs reach only workers who
 * opted in), which haven't been sent before.
 */
async function saveMatches(
  client: Client,
  scope: Scope,
  shifts: ShiftContext[],
  candidates: Candidate[],
  settings: MatchingSettings,
  now: Date,
  notify: boolean,
): Promise<UrgentOffer[]> {
  if (shifts.length === 0 || candidates.length === 0) return [];
  const byWorker = "workerId" in scope;
  const favouritesQuery = client
    .from("favourites")
    .select("business_id, worker_id");
  const blocksQuery = client
    .from("blocks")
    .select("business_id, worker_id")
    .is("archived_at", null);
  const existingQuery = client
    .from("shift_matches")
    .select("shift_id, worker_id, notified_at, visible_from");
  const [favourites, blocks, existing] = await Promise.all(
    byWorker
      ? [
          favouritesQuery.eq("worker_id", scope.workerId),
          blocksQuery.eq("worker_id", scope.workerId),
          existingQuery.eq("worker_id", scope.workerId),
        ]
      : [
          favouritesQuery.eq("business_id", scope.businessId),
          blocksQuery.eq("business_id", scope.businessId),
          existingQuery.in("shift_id", scope.shiftIds),
        ],
  );
  const failed = favourites.error ?? blocks.error ?? existing.error;
  if (failed) throw new Error(`Couldn't load matches: ${failed.message}`);
  const key = (a: string, b: string) => `${a}:${b}`;
  const favourite = new Set(
    (favourites.data ?? []).map((f) => key(f.business_id, f.worker_id)),
  );
  const blockedBy = new Map<string, Set<string>>();
  for (const block of blocks.data ?? []) {
    const set = blockedBy.get(block.business_id) ?? new Set<string>();
    set.add(block.worker_id);
    blockedBy.set(block.business_id, set);
  }
  // When each worker was texted and first shown each shift. Rows saved
  // together share their columns, so these are carried over rather than
  // left out (which would clear them).
  const previous = new Map(
    (existing.data ?? []).map((m) => [key(m.shift_id, m.worker_id), m]),
  );

  const rows: Database["public"]["Tables"]["shift_matches"]["Insert"][] = [];
  const urgent: UrgentOffer[] = [];
  for (const shift of shifts) {
    const results = candidates
      .filter((worker) =>
        worker.categories.some((c) => c.categoryId === shift.facts.categoryId),
      )
      .map((worker) => ({
        worker,
        result: checkEligibility(worker, shift.facts, {
          blockedWorkerIds: blockedBy.get(shift.businessId) ?? new Set(),
          policeCheckMaxAgeMonths: settings.police_check_max_age_months,
        }),
        isFavourite: favourite.has(key(shift.businessId, worker.id)),
      }));
    // Matching one worker can't tell whether a favourite can take the
    // shift, so the favourites' head start stands.
    const favouriteCanTake =
      byWorker || results.some((r) => r.isFavourite && r.result.eligible);
    for (const { worker, result, isFavourite } of results) {
      const before = previous.get(key(shift.shiftId, worker.id));
      const sentAt = before?.notified_at ?? null;
      const visibleFrom = firstShown({
        postedAt: shift.postedAt,
        favouritesFirstMinutes: shift.favouritesFirstMinutes,
        favourite: isFavourite,
        favouriteCanTake,
        shownBefore: before ? new Date(before.visible_from) : null,
      });
      const tellNow =
        notify &&
        result.eligible &&
        shift.urgent &&
        worker.urgentOptIn &&
        visibleFrom <= now &&
        !sentAt &&
        ((!!worker.availableNowUntil &&
          new Date(worker.availableNowUntil) > now) ||
          availableAtStart(worker.weekly, shift.weekday, shift.startMinute));
      if (tellNow) {
        urgent.push({ profileId: worker.profileId, shiftId: shift.shiftId });
      }
      rows.push({
        shift_id: shift.shiftId,
        worker_id: worker.id,
        eligible: result.eligible,
        reasons: result.reasons,
        flags: result.flags,
        distance_km: result.distanceKm,
        rank_score: rankScore({
          favourite: isFavourite,
          // Past shifts with the business arrive with assignments in step 1.8.
          shiftsWithBusiness: 0,
          rating: worker.rating,
          reliability: worker.reliability,
          distanceKm: result.distanceKm ?? 0,
          yearsExperience:
            worker.categories.find(
              (c) => c.categoryId === shift.facts.categoryId,
            )?.yearsExperience ?? 0,
        }),
        favourite: isFavourite,
        visible_from: visibleFrom.toISOString(),
        computed_at: now.toISOString(),
        // Left alone when not texting, so a refresh can't undo a text sent
        // at the same moment.
        ...(notify
          ? { notified_at: tellNow ? now.toISOString() : sentAt }
          : {}),
      });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client
      .from("shift_matches")
      .upsert(rows.slice(i, i + 500), { onConflict: "shift_id,worker_id" });
    if (error) throw new Error(`Couldn't save matches: ${error.message}`);
  }
  return urgent;
}

/** What each shift pays one worker, saved for the worker's offers. */
async function saveShiftPay(
  client: Client,
  jobId: string,
  shifts: ShiftContext[],
  settings: MatchingSettings,
) {
  const first = shifts[0];
  if (!first) return;
  const { data: job } = await client
    .from("jobs")
    .select("business_id, category_id, level, type, sites(state)")
    .eq("id", jobId)
    .single();
  if (!job?.category_id || !job.sites) return;
  const scope = {
    businessId: job.business_id,
    categoryId: job.category_id,
    level: job.level,
    state: job.sites.state as StateCode,
  };
  const data = await loadPricingData(client, scope);
  const pricer = makePricer(scope, { ...data, settings });
  const { data: breaks } = await client
    .from("shifts")
    .select("id, break_minutes")
    .in(
      "id",
      shifts.map((s) => s.shiftId),
    );
  const breakOf = new Map((breaks ?? []).map((b) => [b.id, b.break_minutes]));
  const rows = shifts.flatMap((shift) => {
    const quote = pricer.quote({
      start: shift.facts.start,
      end: shift.facts.end,
      breakMinutes: breakOf.get(shift.shiftId) ?? 0,
      urgent: shift.urgent,
    });
    if (!quote.ok) return [];
    const card = data.cards.find((c) => c.id === quote.card.id);
    if (!card) return [];
    return [
      {
        shift_id: shift.shiftId,
        hourly_cents: hourlyPayCents(rateCardFromRow(card), "ordinary"),
        estimate_cents: quote.cost.payCents,
        computed_at: new Date().toISOString(),
      },
    ];
  });
  if (rows.length > 0) {
    const { error } = await client
      .from("shift_pay")
      .upsert(rows, { onConflict: "shift_id" });
    if (error) throw new Error(`Couldn't save shift pay: ${error.message}`);
  }
}

export type MatchOptions = {
  /** Return urgent offers to text, and mark them sent. Off for demo data. */
  notify?: boolean;
  now?: Date;
};

/** Matches every worker who does this type of work to a job's open shifts. */
export async function matchJob(
  client: Client,
  jobId: string,
  settings: MatchingSettings,
  { notify = true, now = new Date() }: MatchOptions = {},
): Promise<UrgentOffer[]> {
  const shifts = await loadShifts(client, { jobId }, now);
  if (shifts.length === 0) return [];
  await saveShiftPay(client, jobId, shifts, settings);
  const candidates = await loadCandidates(client, {
    categoryIds: [shifts[0]!.facts.categoryId],
  });
  return saveMatches(
    client,
    {
      businessId: shifts[0]!.businessId,
      shiftIds: shifts.map((s) => s.shiftId),
    },
    shifts,
    candidates,
    settings,
    now,
    notify,
  );
}

/**
 * Withdraws a worker's offers of shifts still to come that they're no
 * longer matched to, e.g. after dropping a type of work.
 */
async function withdrawOffers(
  client: Client,
  workerId: string,
  keep: ReadonlySet<string>,
  reason: IneligibleReason,
  now: Date,
) {
  const { data } = await client
    .from("shift_matches")
    .select("shift_id, shifts!inner(status, starts_at)")
    .eq("worker_id", workerId)
    .eq("eligible", true)
    .eq("shifts.status", "open")
    .gt("shifts.starts_at", now.toISOString());
  const stale = (data ?? [])
    .map((match) => match.shift_id)
    .filter((shiftId) => !keep.has(shiftId));
  if (stale.length === 0) return;
  const { error } = await client
    .from("shift_matches")
    .update({
      eligible: false,
      reasons: [reason],
      computed_at: now.toISOString(),
    })
    .eq("worker_id", workerId)
    .in("shift_id", stale);
  if (error) throw new Error(`Couldn't withdraw offers: ${error.message}`);
}

/** Brings one worker's matches up to date across every open shift. */
export async function matchWorker(
  client: Client,
  workerId: string,
  settings: MatchingSettings,
  { notify = true, now = new Date() }: MatchOptions = {},
): Promise<UrgentOffer[]> {
  const [candidate] = await loadCandidates(client, { workerId });
  if (!candidate) {
    // Not active (any more): they shouldn't be offered anything.
    await withdrawOffers(client, workerId, new Set(), "not_active", now);
    return [];
  }
  const shifts = await loadShifts(
    client,
    { categoryIds: candidate.categories.map((c) => c.categoryId) },
    now,
  );
  const offers = await saveMatches(
    client,
    { workerId },
    shifts,
    [candidate],
    settings,
    now,
    notify,
  );
  await withdrawOffers(
    client,
    workerId,
    new Set(shifts.map((s) => s.shiftId)),
    "no_work_type",
    now,
  );
  return offers;
}
