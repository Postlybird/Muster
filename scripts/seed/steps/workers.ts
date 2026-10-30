import { readFileSync } from "node:fs";

import { findSuburb } from "../../../src/data/suburbs";
import {
  addDays,
  STEP_KEYS,
  type OnboardingStepKey,
} from "../../../src/domain/onboarding";
import { hasWorkLimit, nextVevoCheck } from "../../../src/domain/verification";
import { sydneyDateKey } from "../../../src/lib/format";
import type { TablesUpdate } from "../../../src/lib/supabase/database.types";
import { check, must, type SeedClient } from "../client";
import {
  ADMINS,
  WORKERS,
  type SeedTicket,
  type SeedWorker,
} from "../data/people";

const ASSETS = "scripts/seed/assets";
const PHOTO_VARIANTS = 8;
/** Documentation address range (RFC 5737): never a real person's IP. */
const DEMO_IP = "203.0.113.10";
const DEMO_USER_AGENT = "Demo data (seed script)";

const PAPERWORK = [
  "casual_employment_contract",
  "fair_work_information_statement",
  "casual_employment_information_statement",
] as const;

type Context = {
  client: SeedClient;
  today: string;
  reviewerId: string;
  credentialTypes: Map<
    string,
    { id: string; kind: string; has_number: boolean; has_expiry: boolean }
  >;
  categories: Map<string, string>;
  currentAgreements: Map<string, string>;
  bridgingRecheckMonths: number;
};

function asset(name: string): Buffer {
  return readFileSync(`${ASSETS}/${name}`);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function upload(
  ctx: Context,
  bucket: "worker-photos" | "identity" | "worker-docs",
  path: string,
  file: string,
): Promise<string> {
  const { error } = await ctx.client.storage
    .from(bucket)
    .upload(path, asset(file), { contentType: "image/png", upsert: true });
  if (error) throw new Error(`uploading ${bucket}/${path}: ${error.message}`);
  return path;
}

/** Steps a demo worker has finished: drafts list theirs, everyone else is done. */
function stepsDone(worker: SeedWorker): OnboardingStepKey[] {
  if (worker.status === "draft") return worker.stepsDone ?? [];
  return STEP_KEYS.filter((key) => key !== "submit");
}

function checked(worker: SeedWorker): boolean {
  return worker.status === "active" || worker.status === "suspended";
}

async function seedDetails(
  ctx: Context,
  worker: SeedWorker,
  workerId: string,
  index: number,
  done: OnboardingStepKey[],
) {
  const fields: TablesUpdate<"workers"> = { onboarding_steps: done };

  if (done.includes("about")) {
    const photo = `photo-${(index % PHOTO_VARIANTS) + 1}.png`;
    Object.assign(fields, {
      legal_first_name: worker.firstName,
      legal_last_name: worker.lastName,
      preferred_name: worker.preferredName ?? null,
      date_of_birth: worker.dateOfBirth,
      photo_path: await upload(
        ctx,
        "worker-photos",
        `${workerId}/photo-seed.png`,
        photo,
      ),
      photo_status: checked(worker) ? "verified" : "pending",
    });
  }

  if (done.includes("travel")) {
    const suburb = findSuburb(worker.suburb);
    if (!suburb) throw new Error(`Unknown suburb ${worker.suburb}`);
    Object.assign(fields, {
      home_suburb: suburb.name,
      home_postcode: suburb.postcode,
      home_state: suburb.state,
      home_lat: suburb.lat,
      home_lng: suburb.lng,
      travel_radius_km: worker.travelRadiusKm,
      has_car: worker.transport.car,
      licence_class: worker.transport.licenceClass ?? "none",
      uses_public_transport: worker.transport.publicTransport,
    });
  }

  if (done.includes("work-types")) fields.bio = worker.bio ?? null;
  if (done.includes("availability")) fields.urgent_opt_in = worker.urgentOptIn;

  if (worker.status !== "draft") {
    const submittedDaysAgo = checked(worker) ? 40 + index : 1 + (index % 5);
    Object.assign(fields, {
      status: worker.status,
      submitted_at: daysAgo(submittedDaysAgo),
    });
    if (checked(worker)) {
      Object.assign(fields, {
        activated_at: daysAgo(submittedDaysAgo - 2),
        payroll_status: "complete",
        payroll_employee_id: `DEMO-EH-${1000 + index}`,
      });
    }
    if (worker.status === "suspended") {
      fields.status_reason =
        "Two no-shows within 30 days. Waiting for an admin to review (demo data).";
    }
  }

  check(
    await ctx.client.from("workers").update(fields).eq("id", workerId),
    `worker ${worker.email}`,
  );
}

async function seedRightToWork(
  ctx: Context,
  worker: SeedWorker,
  workerId: string,
  index: number,
) {
  const rights = worker.rightToWork;
  const verified = checked(worker);
  const checkedAt = daysAgo(38 + index);
  const review = verified
    ? { status: "verified" as const, checked_by: ctx.reviewerId }
    : { status: "pending" as const };

  if (rights.basis === "citizen") {
    const evidence =
      index % 2 === 0 ? "australian_passport" : "birth_certificate";
    check(
      await ctx.client.from("work_rights").insert({
        worker_id: workerId,
        basis: "citizen",
        citizenship_evidence: evidence,
        // Evidence images are deleted once checked (brief §4.9).
        evidence_path: verified
          ? null
          : await upload(
              ctx,
              "identity",
              `${workerId}/citizenship-seed.png`,
              "certificate.png",
            ),
        evidence_deleted_at: verified ? checkedAt : null,
        ...review,
      }),
      `right to work for ${worker.email}`,
    );
    return;
  }

  const basis =
    rights.subclass === "444"
      ? "nz_citizen"
      : rights.label.includes("permanent")
        ? "permanent_resident"
        : "visa";
  const expiry =
    rights.expiresInDays === null
      ? null
      : addDays(ctx.today, rights.expiresInDays);
  const vevoDate = sydneyDateKey(checkedAt);

  check(
    await ctx.client.from("work_rights").insert({
      worker_id: workerId,
      basis,
      passport_number: `DEMO${String(4_000_000 + index * 7919).slice(0, 7)}`,
      passport_country: rights.passportCountry,
      visa_grant_number:
        basis === "nz_citizen" ? null : `DEMO${String(10_000 + index)}`,
      visa_subclass: rights.subclass,
      vevo_consent_at: daysAgo(verified ? 40 + index : 2),
      ...review,
      ...(verified
        ? {
            vevo_checked_at: checkedAt,
            vevo_reference: `DEMO-VEVO-${2000 + index}`,
            visa_expiry: expiry,
            visa_conditions: rights.conditions ?? null,
            work_limit_flag: hasWorkLimit(rights.conditions ?? null),
            next_check_due: nextVevoCheck({
              basis,
              subclass: rights.subclass,
              visaExpiry: expiry,
              checkedOn: vevoDate,
              bridgingRecheckMonths: ctx.bridgingRecheckMonths,
            }),
          }
        : {}),
    }),
    `right to work for ${worker.email}`,
  );
}

async function seedIdentity(
  ctx: Context,
  worker: SeedWorker,
  workerId: string,
  index: number,
) {
  const verified = checked(worker);
  const reviewedAt = daysAgo(38 + index);
  check(
    await ctx.client.from("identity_checks").insert({
      worker_id: workerId,
      document_type: worker.transport.licenceClass
        ? "driver_licence"
        : "passport",
      ...(verified
        ? {
            status: "verified",
            document_reference: `DEMO-ID-${3000 + index}`,
            reviewed_by: ctx.reviewerId,
            reviewed_at: reviewedAt,
            images_deleted_at: reviewedAt,
          }
        : {
            status: "pending",
            document_path: await upload(
              ctx,
              "identity",
              `${workerId}/id-document-seed.png`,
              "photo-id.png",
            ),
            selfie_path: await upload(
              ctx,
              "identity",
              `${workerId}/selfie-seed.png`,
              `photo-${(index % PHOTO_VARIANTS) + 1}.png`,
            ),
          }),
    }),
    `ID check for ${worker.email}`,
  );
}

async function seedCategories(
  ctx: Context,
  worker: SeedWorker,
  workerId: string,
) {
  if (worker.categories.length === 0) return;
  check(
    await ctx.client.from("worker_categories").insert(
      worker.categories.map((c) => {
        const categoryId = ctx.categories.get(c.code);
        if (!categoryId) throw new Error(`Unknown category ${c.code}`);
        return {
          worker_id: workerId,
          category_id: categoryId,
          years_experience: c.years,
        };
      }),
    ),
    `work types for ${worker.email}`,
  );
}

async function seedTicket(
  ctx: Context,
  worker: SeedWorker,
  workerId: string,
  ticket: SeedTicket,
  number: string,
) {
  const type = ctx.credentialTypes.get(ticket.code);
  if (!type) throw new Error(`Unknown ticket ${ticket.code}`);
  const isPoliceCheck = type.kind === "police_check";
  const wasVerified =
    ticket.status === "verified" || ticket.status === "expired";
  const verifiedAt = daysAgo(
    Math.max(1, Math.min(ticket.issuedDaysAgo ?? 30, 30)),
  );
  // Police certificates are deleted once checked; other ticket copies are kept.
  const deleteDocument = isPoliceCheck && wasVerified;

  check(
    await ctx.client.from("worker_credentials").insert({
      worker_id: workerId,
      credential_type_id: type.id,
      number: type.has_number ? number : null,
      issued_on:
        ticket.issuedDaysAgo === undefined
          ? null
          : addDays(ctx.today, -ticket.issuedDaysAgo),
      expires_on:
        ticket.expiresInDays === undefined
          ? null
          : addDays(ctx.today, ticket.expiresInDays),
      document_path: deleteDocument
        ? null
        : await upload(
            ctx,
            isPoliceCheck ? "identity" : "worker-docs",
            `${workerId}/ticket-${ticket.code}-seed.png`,
            "certificate.png",
          ),
      document_deleted_at: deleteDocument ? verifiedAt : null,
      status: ticket.status,
      rejection_reason: ticket.rejectionReason ?? null,
      verified_by: wasVerified ? ctx.reviewerId : null,
      verified_at: wasVerified ? verifiedAt : null,
    }),
    `${ticket.code} for ${worker.email}`,
  );
}

async function seedAvailability(ctx: Context, workerId: string, index: number) {
  const patterns: { days: number[]; start: string; end: string }[] = [
    { days: [1, 2, 3, 4, 5], start: "06:00", end: "18:00" },
    { days: [1, 2, 3, 4, 5, 6], start: "07:00", end: "17:00" },
    { days: [1, 2, 3, 4, 5, 6, 7], start: "06:00", end: "20:00" },
    { days: [1, 3, 5, 6], start: "08:00", end: "16:00" },
  ];
  const pattern = patterns[index % patterns.length]!;
  check(
    await ctx.client.from("availability_weekly").insert(
      pattern.days.map((weekday) => ({
        worker_id: workerId,
        weekday,
        start_time: pattern.start,
        end_time: pattern.end,
      })),
    ),
    "availability",
  );
  if (index % 6 === 0) {
    check(
      await ctx.client.from("availability_blocks").insert({
        worker_id: workerId,
        date: addDays(ctx.today, 9),
        note: "Family commitment",
      }),
      "blocked date",
    );
  }
}

async function seedAcceptances(
  ctx: Context,
  profileId: string,
  kinds: readonly string[],
  acceptedDaysAgo: number,
) {
  const rows = kinds
    .map((kind) => ctx.currentAgreements.get(kind))
    .filter((id): id is string => !!id)
    .map((agreementId) => ({
      agreement_id: agreementId,
      profile_id: profileId,
      accepted_at: daysAgo(acceptedDaysAgo),
      ip: DEMO_IP,
      user_agent: DEMO_USER_AGENT,
    }));
  if (rows.length > 0) {
    check(
      await ctx.client.from("agreement_acceptances").insert(rows),
      "agreement acceptances",
    );
  }
}

/**
 * Worker details, photos, right to work, ID checks, work types, tickets,
 * availability and signed paperwork. Workers who already have details (from
 * an earlier run, or edited in the app) are left alone.
 */
export async function seedWorkers(client: SeedClient) {
  const today = sydneyDateKey(new Date());

  const [types, categories, agreements, admins, profiles, recheck] =
    await Promise.all([
      client
        .from("credential_types")
        .select("id, code, kind, has_number, has_expiry"),
      client.from("categories").select("id, code"),
      client.from("agreements").select("id, kind").eq("is_current", true),
      client
        .from("profiles")
        .select("id")
        .eq("email", ADMINS[0]!.email)
        .single(),
      client
        .from("profiles")
        .select("id, email")
        .in(
          "email",
          WORKERS.map((w) => w.email),
        ),
      client
        .from("settings")
        .select("value")
        .eq("key", "bridging_visa_recheck_months")
        .maybeSingle(),
    ]);

  const ctx: Context = {
    client,
    today,
    reviewerId: must(admins, "reviewer").id,
    credentialTypes: new Map(
      must(types, "ticket types").map((t) => [t.code, t]),
    ),
    categories: new Map(
      must(categories, "categories").map((c) => [c.code, c.id]),
    ),
    currentAgreements: new Map(
      must(agreements, "agreements").map((a) => [a.kind, a.id]),
    ),
    bridgingRecheckMonths:
      typeof recheck.data?.value === "number" ? recheck.data.value : 3,
  };

  const profileByEmail = new Map(
    must(profiles, "worker profiles").map((p) => [p.email, p.id]),
  );
  const workerRows = must(
    await client
      .from("workers")
      .select("id, profile_id, legal_first_name, onboarding_steps")
      .in("profile_id", [...profileByEmail.values()]),
    "workers",
  );
  const workerByProfile = new Map(workerRows.map((w) => [w.profile_id, w]));

  let seeded = 0;
  for (const [index, worker] of WORKERS.entries()) {
    const profileId = profileByEmail.get(worker.email);
    const row = profileId ? workerByProfile.get(profileId) : undefined;
    if (!profileId || !row) {
      throw new Error(`No worker record for ${worker.email}`);
    }
    if (row.legal_first_name || row.onboarding_steps.length > 0) continue;

    const done = stepsDone(worker);
    if (done.length === 0) continue;

    // Reading the collection notice is how every worker starts.
    await seedAcceptances(
      ctx,
      profileId,
      ["privacy_collection_notice"],
      45 + index,
    );
    await seedDetails(ctx, worker, row.id, index, done);
    if (done.includes("right-to-work")) {
      await seedRightToWork(ctx, worker, row.id, index);
    }
    if (done.includes("identity")) {
      await seedIdentity(ctx, worker, row.id, index);
    }
    if (done.includes("work-types")) {
      await seedCategories(ctx, worker, row.id);
    }
    if (done.includes("tickets")) {
      for (const [t, ticket] of worker.tickets.entries()) {
        await seedTicket(
          ctx,
          worker,
          row.id,
          ticket,
          `DEMO-${String(index + 1).padStart(2, "0")}${t + 1}${String(7000 + index * 13).slice(-3)}`,
        );
      }
    }
    if (done.includes("availability")) {
      await seedAvailability(ctx, row.id, index);
    }
    if (done.includes("paperwork")) {
      await seedAcceptances(ctx, profileId, PAPERWORK, 44 + index);
    }
    seeded++;
  }

  return { workers: WORKERS.length, newlySeeded: seeded };
}
