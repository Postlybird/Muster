"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isIsoDate,
  policeCheckProblem,
  ticketDateProblems,
} from "@/domain/onboarding";
import { sydneyDateKey } from "@/lib/format";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { acceptedUpload } from "@/lib/uploads";
import { getAllSettings } from "@/server/settings";
import { getMyWorker, saveFailed } from "@/server/workers";

function dateField(
  value: FormDataEntryValue | null,
): string | null | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return null;
  return isIsoDate(text) ? text : undefined;
}

/** Adds a ticket, or updates the copy waiting to be checked. */
export async function saveTicket(
  code: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { data: type } = await supabase
    .from("credential_types")
    .select("id, kind, has_number, has_expiry, needs_document")
    .eq("code", code)
    .eq("active", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!type) return failure("That ticket isn't available any more.");
  const isPolice = type.kind === "police_check";

  const { data: open } = await supabase
    .from("worker_credentials")
    .select("id, document_path")
    .eq("worker_id", worker.id)
    .eq("credential_type_id", type.id)
    .is("archived_at", null)
    .in("status", ["pending", "rejected"])
    .maybeSingle();

  const errors: Record<string, string[]> = {};
  const today = sydneyDateKey(new Date());

  const number = String(formData.get("number") ?? "").trim();
  if (type.has_number) {
    if (!number) {
      errors.number = [
        isPolice
          ? "Enter the reference number on your certificate"
          : "Enter the number on your ticket",
      ];
    } else if (number.length > 40) {
      errors.number = ["That's too long"];
    }
  }

  const issuedOn = dateField(formData.get("issued_on"));
  const expiresOn = type.has_expiry
    ? dateField(formData.get("expires_on"))
    : null;
  if (issuedOn === undefined) errors.issued_on = ["Enter a real date"];
  if (expiresOn === undefined) errors.expires_on = ["Enter a real date"];

  if (issuedOn !== undefined && expiresOn !== undefined) {
    if (isPolice) {
      const settings = await getAllSettings();
      const problem = policeCheckProblem(
        issuedOn,
        today,
        settings.police_check_max_age_months,
      );
      if (problem) errors.issued_on = [problem];
    }
    const problems = ticketDateProblems({ issuedOn, expiresOn }, today, {
      needsExpiry: type.has_expiry,
    });
    if (problems.issued_on && !errors.issued_on) {
      errors.issued_on = [problems.issued_on];
    }
    if (problems.expires_on) errors.expires_on = [problems.expires_on];
  }

  let documentPath: string | null = null;
  if (type.needs_document) {
    const path = acceptedUpload(
      formData.get("document_path"),
      open?.document_path ?? null,
      worker.id,
      "ticket",
    );
    if (!path) {
      errors.document_path = [
        path === undefined
          ? "Upload the file again"
          : "Add a photo or PDF of it",
      ];
    } else {
      documentPath = path;
    }
  }

  if (Object.keys(errors).length > 0) {
    return failure("Check the highlighted fields.", errors);
  }

  const fields = {
    number: type.has_number ? number : null,
    issued_on: issuedOn ?? null,
    expires_on: expiresOn ?? null,
    document_path: documentPath,
  };
  const { error } = open
    ? await supabase.from("worker_credentials").update(fields).eq("id", open.id)
    : await supabase.from("worker_credentials").insert({
        ...fields,
        worker_id: worker.id,
        credential_type_id: type.id,
      });
  if (error) return saveFailed(error);

  revalidatePath("/worker", "layout");
  redirect(`/worker/onboarding/tickets?saved=${encodeURIComponent(code)}`);
}

/** Takes back a ticket that hasn't been checked yet. */
export async function removeTicket(id: string): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worker_credentials")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("worker_id", worker.id)
    .in("status", ["pending", "rejected"])
    .select("id");
  if (error) return saveFailed(error);
  if (!data?.length) return failure("That ticket can't be removed.");
  revalidatePath("/worker", "layout");
  redirect("/worker/onboarding/tickets");
}
