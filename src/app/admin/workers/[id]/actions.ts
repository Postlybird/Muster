"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isIsoDate } from "@/domain/onboarding";
import { hasWorkLimit, nextVevoCheck } from "@/domain/verification";
import { requireAdmin } from "@/lib/auth";
import { sydneyDateKey } from "@/lib/format";
import { failure, formBoolean, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { credentialBucket } from "@/lib/uploads";
import { getAllSettings } from "@/server/settings";
import { textPerson } from "@/server/notify";
import { saveFailed } from "@/server/workers";

type Decision =
  | { approve: true }
  | { approve: false; reason: string }
  | { error: ActionState };

function readDecision(formData: FormData): Decision {
  const decision = formData.get("decision");
  if (decision === "approve") return { approve: true };
  if (decision === "reject") {
    const reason = String(formData.get("reason") ?? "").trim();
    if (!reason) {
      return {
        error: failure("Tell the worker what to fix.", {
          reason: ["Write a message, or pick one of the reasons"],
        }),
      };
    }
    if (reason.length > 500) {
      return { error: failure("Keep the message under 500 characters.") };
    }
    return { approve: false, reason };
  }
  return {
    error: failure("Choose approve or reject.", {
      decision: ["Choose approve or reject"],
    }),
  };
}

async function loadWorker(workerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("id, profile_id, status")
    .eq("id", workerId)
    .maybeSingle();
  return { supabase, worker };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Deletes files once they've been checked (brief §4.9). */
async function deleteFiles(
  supabase: Supabase,
  bucket: "identity" | "worker-docs" | "worker-photos",
  paths: (string | null)[],
): Promise<boolean> {
  const files = paths.filter((p): p is string => !!p);
  if (files.length === 0) return true;
  const { error } = await supabase.storage.from(bucket).remove(files);
  if (error) console.error("Couldn't delete checked files", error);
  return !error;
}

function done(workerId: string, message: string): ActionState {
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/verification");
  return success(message);
}

// ---------------------------------------------------------------------------

export async function reviewPhoto(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const decision = readDecision(formData);
  if ("error" in decision) return decision.error;

  const { error } = await supabase
    .from("workers")
    .update(
      decision.approve
        ? { photo_status: "verified", photo_rejection_reason: null }
        : { photo_status: "rejected", photo_rejection_reason: decision.reason },
    )
    .eq("id", workerId);
  if (error) return saveFailed(error);
  if (!decision.approve) {
    await textPerson(
      worker.profile_id,
      `Please change your photo: ${decision.reason} Open the app to upload a new one.`,
    );
  }
  return done(workerId, decision.approve ? "Photo approved" : "Photo rejected");
}

export async function reviewIdentity(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const { data: check } = await supabase
    .from("identity_checks")
    .select("id, status, document_path, selfie_path")
    .eq("worker_id", workerId)
    .maybeSingle();
  if (!check || check.status === "verified") {
    return failure("There's no ID waiting to be checked.");
  }
  const decision = readDecision(formData);
  if ("error" in decision) return decision.error;

  const reference = String(formData.get("document_reference") ?? "").trim();
  if (decision.approve && !/^[A-Za-z0-9 -]{2,20}$/.test(reference)) {
    return failure("Check the highlighted field.", {
      document_reference: [
        "Enter the last few characters of the licence or passport number",
      ],
    });
  }

  // The images go either way: checked ID is kept only as an outcome, and a
  // rejected worker uploads new ones.
  if (
    !(await deleteFiles(supabase, "identity", [
      check.document_path,
      check.selfie_path,
    ]))
  ) {
    return failure(
      "Couldn't delete the ID images. Nothing was saved; try again.",
    );
  }
  const user = await requireAdmin();
  const { error } = await supabase
    .from("identity_checks")
    .update({
      status: decision.approve ? "verified" : "rejected",
      rejection_reason: decision.approve ? null : decision.reason,
      document_reference: decision.approve ? reference : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      document_path: null,
      selfie_path: null,
      images_deleted_at: new Date().toISOString(),
    })
    .eq("id", check.id);
  if (error) return saveFailed(error);
  if (!decision.approve) {
    await textPerson(
      worker.profile_id,
      `We couldn't check your ID: ${decision.reason} Open the app to upload new photos.`,
    );
  }
  return done(
    workerId,
    decision.approve
      ? "ID verified. The images have been deleted."
      : "ID rejected. The images have been deleted.",
  );
}

const vevoSchema = z.object({
  vevo_checked_on: z
    .string()
    .refine(isIsoDate, "Enter the date you checked")
    .refine(
      (d) => d <= sydneyDateKey(new Date()),
      "That date is in the future",
    ),
  vevo_reference: z
    .string()
    .trim()
    .min(3, "Enter the VEVO reference or transaction number")
    .max(60, "That's too long"),
  visa_subclass: z.string().trim().max(10, "Just the subclass, like 500"),
  visa_expiry: z
    .string()
    .refine((d) => d === "" || isIsoDate(d), "Enter a real date"),
  visa_conditions: z.string().trim().max(500, "Keep it under 500 characters"),
  next_check_due: z
    .string()
    .refine((d) => d === "" || isIsoDate(d), "Enter a real date"),
});

export async function reviewRightToWork(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const { data: rights } = await supabase
    .from("work_rights")
    .select("id, basis, status, evidence_path, visa_subclass")
    .eq("worker_id", workerId)
    .maybeSingle();
  if (!rights) return failure("There are no right to work details yet.");
  const decision = readDecision(formData);
  if ("error" in decision) return decision.error;
  const user = await requireAdmin();

  if (!decision.approve) {
    if (!(await deleteFiles(supabase, "identity", [rights.evidence_path]))) {
      return failure(
        "Couldn't delete the document. Nothing was saved; try again.",
      );
    }
    const { error } = await supabase
      .from("work_rights")
      .update({
        status: "rejected",
        rejection_reason: decision.reason,
        checked_by: user.id,
        evidence_path: null,
        evidence_deleted_at: rights.evidence_path
          ? new Date().toISOString()
          : null,
      })
      .eq("id", rights.id);
    if (error) return saveFailed(error);
    await textPerson(
      worker.profile_id,
      `We couldn't confirm your right to work: ${decision.reason} Open the app to fix it.`,
    );
    return done(workerId, "Right to work rejected");
  }

  if (rights.basis === "citizen") {
    if (!(await deleteFiles(supabase, "identity", [rights.evidence_path]))) {
      return failure(
        "Couldn't delete the document. Nothing was saved; try again.",
      );
    }
    const { error } = await supabase
      .from("work_rights")
      .update({
        status: "verified",
        rejection_reason: null,
        checked_by: user.id,
        evidence_path: null,
        evidence_deleted_at: new Date().toISOString(),
      })
      .eq("id", rights.id);
    if (error) return saveFailed(error);
    return done(
      workerId,
      "Citizenship confirmed. The document has been deleted.",
    );
  }

  const parsed = vevoSchema.safeParse({
    vevo_checked_on: formData.get("vevo_checked_on") ?? "",
    vevo_reference: formData.get("vevo_reference") ?? "",
    visa_subclass: formData.get("visa_subclass") ?? "",
    visa_expiry: formData.get("visa_expiry") ?? "",
    visa_conditions: formData.get("visa_conditions") ?? "",
    next_check_due: formData.get("next_check_due") ?? "",
  });
  if (!parsed.success) {
    return failure(
      "Check the highlighted fields.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const v = parsed.data;
  const settings = await getAllSettings();
  const subclass = v.visa_subclass || rights.visa_subclass;
  const { error } = await supabase
    .from("work_rights")
    .update({
      status: "verified",
      rejection_reason: null,
      checked_by: user.id,
      vevo_checked_at: new Date(
        `${v.vevo_checked_on}T12:00:00+10:00`,
      ).toISOString(),
      vevo_reference: v.vevo_reference,
      visa_subclass: subclass || null,
      visa_expiry: v.visa_expiry || null,
      visa_conditions: v.visa_conditions || null,
      work_limit_flag:
        formBoolean(formData.get("work_limit_flag")) ||
        hasWorkLimit(v.visa_conditions || null),
      next_check_due:
        v.next_check_due ||
        nextVevoCheck({
          basis: rights.basis,
          subclass: subclass ?? null,
          visaExpiry: v.visa_expiry || null,
          checkedOn: v.vevo_checked_on,
          bridgingRecheckMonths: settings.bridging_visa_recheck_months,
        }),
    })
    .eq("id", rights.id);
  if (error) return saveFailed(error);
  return done(
    workerId,
    rights.status === "verified"
      ? "VEVO re-check recorded"
      : "Right to work verified",
  );
}

export async function reviewTicket(
  workerId: string,
  credentialId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const { data: ticket } = await supabase
    .from("worker_credentials")
    .select("id, worker_id, document_path, credential_types(name, kind)")
    .eq("id", credentialId)
    .maybeSingle();
  if (!ticket || ticket.worker_id !== workerId) {
    return failure("That ticket no longer exists.");
  }
  const decision = readDecision(formData);
  if ("error" in decision) return decision.error;
  const kind = ticket.credential_types?.kind ?? "ticket";
  const name = ticket.credential_types?.name ?? "ticket";

  const { error } = await supabase.rpc("review_worker_credential", {
    p_id: credentialId,
    p_approve: decision.approve,
    p_reason: decision.approve ? undefined : decision.reason,
  });
  if (error) {
    if (error.code === "23514" || error.code === "P0002")
      return failure(`${error.message}.`);
    return saveFailed(error);
  }

  // Police certificates are deleted once checked; the outcome is kept.
  if (kind === "police_check" && ticket.document_path) {
    if (
      await deleteFiles(supabase, credentialBucket(kind), [
        ticket.document_path,
      ])
    ) {
      await supabase
        .from("worker_credentials")
        .update({
          document_path: null,
          document_deleted_at: new Date().toISOString(),
        })
        .eq("id", credentialId);
    }
  }

  if (!decision.approve) {
    await textPerson(
      worker.profile_id,
      `We couldn't accept your ${name}: ${decision.reason} Open the app to fix it.`,
    );
  } else if (worker.status === "active") {
    await textPerson(worker.profile_id, `Your ${name} is verified.`);
  }
  return done(
    workerId,
    decision.approve ? `${name} verified` : `${name} rejected`,
  );
}

export async function saveLevels(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const { data: rows } = await supabase
    .from("worker_categories")
    .select("category_id, level")
    .eq("worker_id", workerId);
  for (const row of rows ?? []) {
    const level = Number(formData.get(`level_${row.category_id}`));
    if (!Number.isInteger(level) || level < 1 || level > 10) continue;
    if (level === row.level) continue;
    const { error } = await supabase
      .from("worker_categories")
      .update({ level })
      .eq("worker_id", workerId)
      .eq("category_id", row.category_id);
    if (error) return saveFailed(error);
  }
  return done(workerId, "Levels saved");
}

const payrollSchema = z.object({
  payroll_employee_id: z
    .string()
    .trim()
    .max(40, "That's too long")
    .regex(/^[A-Za-z0-9-]*$/, "Letters, numbers and dashes only"),
  payroll_status: z.enum(["not_started", "invited", "complete"]),
});

export async function savePayroll(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const parsed = payrollSchema.safeParse({
    payroll_employee_id: formData.get("payroll_employee_id") ?? "",
    payroll_status: formData.get("payroll_status") ?? "",
  });
  if (!parsed.success) {
    return failure(
      "Check the highlighted fields.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const { payroll_employee_id: employeeId, payroll_status: status } =
    parsed.data;
  if (status !== "not_started" && !employeeId) {
    return failure("Check the highlighted fields.", {
      payroll_employee_id: ["Enter the employee ID from Employment Hero"],
    });
  }
  const { data: before } = await supabase
    .from("workers")
    .select("payroll_status")
    .eq("id", workerId)
    .single();
  const { error } = await supabase
    .from("workers")
    .update({ payroll_employee_id: employeeId || null, payroll_status: status })
    .eq("id", workerId);
  if (error) return saveFailed(error);
  if (status === "invited" && before?.payroll_status !== "invited") {
    await textPerson(
      worker.profile_id,
      "Check your email for an invitation from our payroll provider, Employment Hero, to add your tax, super and bank details.",
    );
  }
  return done(workerId, "Payroll details saved");
}

export async function activateWorker(workerId: string): Promise<ActionState> {
  const { supabase, worker } = await loadWorker(workerId);
  if (!worker) return failure("That worker no longer exists.");
  const { error } = await supabase.rpc("activate_worker", {
    p_worker_id: workerId,
  });
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  await textPerson(
    worker.profile_id,
    "You're verified and ready to work. Open the app to find shifts.",
  );
  return done(workerId, "Worker activated");
}
