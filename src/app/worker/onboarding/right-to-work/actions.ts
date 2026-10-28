"use server";

import { z } from "zod";

import { failure, formBoolean, type ActionState } from "@/lib/forms";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { acceptedUpload } from "@/lib/uploads";
import { finishStep, getMyWorker, saveFailed } from "@/server/workers";

import { BASIS_LABELS, EVIDENCE_LABELS } from "./options";

const basisSchema = z.enum(
  Object.keys(BASIS_LABELS) as [keyof typeof BASIS_LABELS],
  { error: "Choose the one that applies to you" },
);

const visaSchema = z.object({
  passport_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9]{5,20}$/,
      "Enter your passport number, letters and numbers only",
    ),
  passport_country: z
    .string()
    .trim()
    .min(2, "Enter the country that issued your passport")
    .max(60, "That's too long"),
  visa_grant_number: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{0,20}$/, "Letters and numbers only"),
  visa_subclass: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 ]{0,10}$/, "Enter just the subclass number, like 500"),
});

export async function saveRightToWork(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("work_rights")
    .select("status, evidence_path")
    .eq("worker_id", worker.id)
    .maybeSingle();
  if (current?.status === "verified") {
    return failure(
      "Your right to work has been checked. Contact us to change it.",
    );
  }

  const basis = basisSchema.safeParse(formData.get("basis") ?? undefined);
  if (!basis.success) {
    return failure("Check the highlighted fields.", {
      basis: ["Choose the one that applies to you"],
    });
  }

  let row: TablesInsert<"work_rights">;
  if (basis.data === "citizen") {
    const errors: Record<string, string[]> = {};
    const evidence = z
      .enum(Object.keys(EVIDENCE_LABELS) as [keyof typeof EVIDENCE_LABELS])
      .safeParse(formData.get("citizenship_evidence") ?? undefined);
    if (!evidence.success) {
      errors.citizenship_evidence = ["Choose the document you'll upload"];
    }
    const path = acceptedUpload(
      formData.get("evidence_path"),
      current?.evidence_path ?? null,
      worker.id,
      "citizenship",
    );
    if (!path) {
      errors.evidence_path = [
        path === undefined
          ? "Upload the document again"
          : "Upload a photo or scan of the document",
      ];
    }
    if (!evidence.success || !path) {
      return failure("Check the highlighted fields.", errors);
    }
    row = {
      worker_id: worker.id,
      basis: "citizen",
      citizenship_evidence: evidence.data,
      evidence_path: path,
      passport_number: null,
      passport_country: null,
      visa_grant_number: null,
      visa_subclass: null,
      vevo_consent_at: null,
    };
  } else {
    const parsed = visaSchema.safeParse({
      passport_number: formData.get("passport_number") ?? "",
      passport_country: formData.get("passport_country") ?? "",
      visa_grant_number: formData.get("visa_grant_number") ?? "",
      visa_subclass: formData.get("visa_subclass") ?? "",
    });
    const errors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    const consent = formBoolean(formData.get("vevo_consent"));
    if (!consent) {
      errors.vevo_consent = [
        "Tick the box so we can check your visa. We can't employ you without it.",
      ];
    }
    if (!parsed.success || !consent) {
      return failure("Check the highlighted fields.", errors);
    }
    row = {
      worker_id: worker.id,
      basis: basis.data,
      citizenship_evidence: null,
      evidence_path: null,
      passport_number: parsed.data.passport_number,
      passport_country: parsed.data.passport_country,
      visa_grant_number: parsed.data.visa_grant_number || null,
      visa_subclass: parsed.data.visa_subclass || null,
      vevo_consent_at: new Date().toISOString(),
    };
  }

  const { error } = await supabase
    .from("work_rights")
    .upsert(row, { onConflict: "worker_id" });
  if (error) return saveFailed(error);
  return finishStep(worker, "right-to-work");
}
