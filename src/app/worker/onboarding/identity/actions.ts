"use server";

import { z } from "zod";

import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { acceptedUpload } from "@/lib/uploads";
import { finishStep, getMyWorker, saveFailed } from "@/server/workers";

export async function saveIdentity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("identity_checks")
    .select("status, document_path, selfie_path")
    .eq("worker_id", worker.id)
    .maybeSingle();
  if (current?.status === "verified") {
    return failure("Your ID has already been checked.");
  }

  const errors: Record<string, string[]> = {};
  const documentType = z
    .enum(["driver_licence", "passport"])
    .safeParse(formData.get("document_type") ?? undefined);
  if (!documentType.success) {
    errors.document_type = ["Choose the ID you'll use"];
  }
  const documentPath = acceptedUpload(
    formData.get("document_path"),
    current?.document_path ?? null,
    worker.id,
    "id-document",
  );
  if (!documentPath) {
    errors.document_path = [
      documentPath === undefined
        ? "Upload the photo of your ID again"
        : "Add a photo of your ID",
    ];
  }
  const selfiePath = acceptedUpload(
    formData.get("selfie_path"),
    current?.selfie_path ?? null,
    worker.id,
    "selfie",
  );
  if (!selfiePath) {
    errors.selfie_path = [
      selfiePath === undefined ? "Take your selfie again" : "Take a selfie",
    ];
  }
  if (!documentType.success || !documentPath || !selfiePath) {
    return failure("Check the highlighted fields.", errors);
  }

  const { error } = await supabase.from("identity_checks").upsert(
    {
      worker_id: worker.id,
      document_type: documentType.data,
      document_path: documentPath,
      selfie_path: selfiePath,
    },
    { onConflict: "worker_id" },
  );
  if (error) return saveFailed(error);
  return finishStep(worker, "identity");
}
