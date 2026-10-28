"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { chosenOutcome, type FlagOutcome } from "@/lib/admin-flags";
import { requireAdmin } from "@/lib/auth";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  notifyNoShow,
  notifyNoShowExcused,
  notifyRemovedFromShift,
} from "@/server/booking-notices";
import { saveFailed } from "@/server/errors";
import { matchPostedJob, refreshWorkerMatches } from "@/server/matching";
import { notify } from "@/server/notifications";
import { refreshReliability } from "@/server/reliability";

type Settled = {
  worker_id: string | null;
  shift_id: string | null;
  job_id: string | null;
  suspended: boolean;
};

/** What follows a decision: messages, matches and reliability. */
async function followUp(outcome: FlagOutcome, settled: Settled, note: string) {
  const { worker_id: workerId, shift_id: shiftId, job_id: jobId } = settled;
  if (!workerId) return;
  switch (outcome) {
    case "remove":
      if (!jobId || !shiftId) return;
      // Offered to others straight away, as when a worker cancels.
      await matchPostedJob(jobId);
      await notifyRemovedFromShift(jobId, workerId, [shiftId], note);
      return;
    case "no_show":
      await refreshReliability([workerId]);
      if (jobId) await notifyNoShow(workerId, jobId, settled.suspended);
      if (settled.suspended) {
        await refreshWorkerMatches(workerId, { notify: false });
      }
      return;
    case "excuse":
      await refreshReliability([workerId]);
      if (jobId) await notifyNoShowExcused(workerId, jobId);
      return;
    case "lift": {
      await refreshWorkerMatches(workerId);
      const supabase = await createClient();
      const { data: worker } = await supabase
        .from("workers")
        .select("profile_id")
        .eq("id", workerId)
        .single();
      if (worker) {
        await notify(
          "hold_lifted",
          worker.profile_id,
          {},
          {
            url: "/worker/shifts",
          },
        );
      }
      return;
    }
    default:
      return;
  }
}

/** Settles a matter in the queues with what was decided (brief §6). */
export async function settleFlag(
  flagId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (!note || note.length > 500) {
    return failure("Check the highlighted fields.", {
      note: [note ? "Keep it to 500 characters" : "Say what was decided"],
    });
  }
  const supabase = await createClient();
  const { data: flag } = await supabase
    .from("admin_flags")
    .select("kind")
    .eq("id", flagId)
    .maybeSingle();
  if (!flag) return failure("That matter no longer exists.");
  const outcome = chosenOutcome(flag.kind, String(formData.get("outcome")));
  if (!outcome) {
    return failure("Check the highlighted fields.", {
      outcome: ["Choose what to do"],
    });
  }
  const { data, error } = await supabase
    .rpc("settle_admin_flag", {
      p_flag_id: flagId,
      p_outcome: outcome,
      p_note: note,
    })
    .maybeSingle();
  if (error) {
    return error.code === "23514" || error.code === "P0002"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  if (data) await followUp(outcome, data, note);
  revalidatePath("/admin/queues");
  revalidatePath(`/admin/queues/${flagId}`);
  redirect("/admin/queues?settled=1");
}

/**
 * Takes a worker on hold off one of their bookings (plan: admins decide
 * whether they keep them). The shift is offered to others.
 */
export async function removeFromShift(
  flagId: string,
  assignmentId: string,
): Promise<ActionState> {
  await requireAdmin();
  const reason = "Your account is on hold.";
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("admin_cancel_booking", {
      p_assignment_id: assignmentId,
      p_reason: reason,
    })
    .maybeSingle();
  if (error) {
    return error.code === "23514" || error.code === "P0002"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  if (data) {
    await matchPostedJob(data.job_id);
    await notifyRemovedFromShift(
      data.job_id,
      data.worker_id,
      [data.shift_id],
      reason,
    );
  }
  revalidatePath(`/admin/queues/${flagId}`);
  return success("Taken off the shift. We've told them and the business.");
}
