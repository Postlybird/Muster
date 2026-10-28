"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { shiftsLabel, takeOutcome } from "@/domain/bookings";
import type { FillMode } from "@/domain/jobs";
import { formatTime } from "@/lib/format";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { acceptedUpload } from "@/lib/uploads";
import {
  emailAdminsSafety,
  emailFirstApplicant,
  emailIfFilled,
  emailWorkerCancelled,
} from "@/server/booking-notices";
import { saveFailed } from "@/server/errors";
import { matchPostedJob, refreshWorkerMatches } from "@/server/matching";
import { refreshReliability } from "@/server/reliability";
import { getMyWorker } from "@/server/workers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function refresh(jobId: string) {
  revalidatePath(`/worker/shifts/${jobId}`);
  revalidatePath("/worker", "layout");
}

/**
 * Applies for ("I'll choose") or accepts ("First in") the chosen shifts of
 * a job (brief §4.4). Eligibility is checked again first.
 */
export async function takeShifts(
  jobId: string,
  // Each database function only books jobs filled its way, so the mode
  // the page showed is safe to trust.
  mode: FillMode,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  if (worker.status !== "active") {
    return failure("You can take shifts once your details are verified.");
  }
  const shiftIds = formData
    .getAll("shift")
    .map(String)
    .filter((id) => UUID.test(id));
  if (shiftIds.length === 0) {
    return failure("Choose at least one shift.", {
      shift: ["Choose at least one shift"],
    });
  }
  const supabase = await createClient();
  await refreshWorkerMatches(worker.id, { notify: false });
  const { data, error } =
    mode === "auto"
      ? await supabase.rpc("accept_shifts", { p_shift_ids: shiftIds })
      : await supabase.rpc("apply_for_shifts", { p_shift_ids: shiftIds });
  if (error) return saveFailed(error);
  const results = (data ?? []).map((row) => row.result);
  const outcome = takeOutcome(mode, results);
  // On failure the page stays as it is, so they can read why.
  if (!outcome.ok) return failure(outcome.message);
  refresh(jobId);
  if (mode === "auto") await emailIfFilled(jobId);
  else await emailFirstApplicant(jobId);
  return success(outcome.message);
}

/** Withdraws the worker's applications for a job, before anyone picks. */
export async function withdrawApplications(
  jobId: string,
): Promise<ActionState> {
  await getMyWorker();
  const supabase = await createClient();
  const { data: shifts } = await supabase.rpc("my_shifts", { p_job_id: jobId });
  const applied = (shifts ?? [])
    .filter((shift) => shift.application_status === "applied")
    .map((shift) => shift.shift_id);
  if (applied.length === 0) return failure("There's nothing to withdraw.");
  const { error } = await supabase.rpc("withdraw_applications", {
    p_shift_ids: applied,
  });
  if (error) return saveFailed(error);
  refresh(jobId);
  return success("Application withdrawn");
}

const REASONS = ["I'm sick", "Family emergency", "Transport problem", "Other"];

/**
 * Cancels the worker's chosen bookings on a job (brief §4.5). Late ones
 * count against their reliability; the shifts are offered to others and
 * the business is told.
 */
export async function cancelMyBookings(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const ids = formData
    .getAll("booking")
    .map(String)
    .filter((id) => UUID.test(id));
  if (ids.length === 0) {
    return failure("Choose at least one shift.", {
      booking: ["Choose at least one shift"],
    });
  }
  const reason = String(formData.get("reason") ?? "");
  if (!REASONS.includes(reason)) {
    return failure("Tell us why.", { reason: ["Choose a reason"] });
  }
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 300);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_my_bookings", {
    p_assignment_ids: ids,
    p_reason: note ? `${reason}: ${note}` : reason,
  });
  if (error) return saveFailed(error);
  const cancelled = data ?? [];
  if (cancelled.length === 0) {
    return failure("Those shifts can't be cancelled any more.");
  }
  await refreshReliability([worker.id]);
  // Offered to others straight away (brief §4.5), and the business is told.
  await matchPostedJob(jobId);
  await emailWorkerCancelled(
    jobId,
    worker.id,
    cancelled.map((row) => row.shift_id),
  );
  refresh(jobId);
  const late = cancelled.some((row) => row.late);
  return success(
    `Cancelled ${shiftsLabel(cancelled.length)}. Thanks for letting us know.${late ? " Cancelling this close to the start counts against your reliability." : ""}`,
  );
}

export type ClockInput = {
  kind: "clock_in" | "clock_out";
  /** When it happened on the phone (queued clock-ins are sent later). */
  occurredAt: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  reason: string;
  /** Sent after the phone had no signal. */
  offline: boolean;
};

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Clocks in or out of a booked shift, with where the phone was (brief §4.6). */
export async function clockShift(
  jobId: string,
  assignmentId: string,
  input: ClockInput,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  if (!UUID.test(assignmentId)) return failure("That shift isn't available.");
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return failure("Your phone's clock gave an odd time. Try again.");
  }
  const lat = finiteOrNull(input.lat);
  const lng = finiteOrNull(input.lng);
  const accuracy = finiteOrNull(input.accuracy);
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("clock", {
      p_assignment_id: assignmentId,
      p_kind: input.kind === "clock_out" ? "clock_out" : "clock_in",
      p_occurred_at: occurredAt.toISOString(),
      p_lat: lat ?? undefined,
      p_lng: lng ?? undefined,
      p_accuracy_m: accuracy === null ? undefined : Math.round(accuracy),
      p_reason: String(input.reason ?? "").slice(0, 500),
      p_offline: !!input.offline,
    })
    .maybeSingle();
  if (error) {
    if (error.code === "23514") {
      if (error.message.startsWith("Say why")) {
        return failure(`${error.message}.`, {
          reason: ["Say why you're not at the site"],
        });
      }
      return failure(`${error.message}.`);
    }
    return saveFailed(error);
  }
  refresh(jobId);
  if (input.kind === "clock_out") {
    // Clocking out makes the timesheet (brief §4.6), which counts towards
    // reliability.
    revalidatePath("/worker/timesheets");
    await refreshReliability([worker.id]);
  }
  const time = formatTime(occurredAt);
  const where =
    data?.inside === false
      ? " You weren't at the site, so we've noted your reason."
      : "";
  return success(
    input.kind === "clock_out"
      ? `Clocked out at ${time}.${where}`
      : `Clocked in at ${time}.${where}`,
  );
}

/**
 * Reports a safety issue from a shift (brief §4.6). Admins hear about it
 * straight away.
 */
export async function reportSafetyIssue(
  jobId: string,
  assignmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return failure("Check the highlighted fields.", {
      description: ["Tell us what's wrong"],
    });
  }
  if (description.length > 2000) {
    return failure("Check the highlighted fields.", {
      description: ["Keep it under 2,000 characters"],
    });
  }
  const photo = acceptedUpload(
    formData.get("photo"),
    null,
    worker.id,
    "safety",
  );
  if (photo === undefined) return failure("Upload the photo again.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_safety_issue", {
    p_assignment_id: assignmentId,
    p_description: description,
    p_photo_paths: photo ? [photo] : [],
  });
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  await emailAdminsSafety(jobId, worker.id, description);
  redirect(`/worker/shifts/${jobId}?reported=1`);
}
