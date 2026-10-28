"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { saveFailed } from "@/server/errors";

function revalidate(id: string) {
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/pay-runs", "layout");
  revalidatePath("/business/invoices", "layout");
}

/** Invoices are paid by bank transfer and marked paid by hand (v1). */
export async function markPaid(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const paidOn = String(formData.get("paid_on") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
    return failure("Check the highlighted fields.", {
      paid_on: ["Choose the day it was paid"],
    });
  }
  if (reference.length > 200) {
    return failure("Check the highlighted fields.", {
      reference: ["Keep it to 200 characters"],
    });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_invoice_paid", {
    p_id: id,
    p_paid_on: paidOn,
    p_reference: reference || undefined,
  });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`, {
          paid_on: /day/.test(error.message) ? [error.message] : undefined,
        })
      : saveFailed(error);
  }
  revalidate(id);
  return success("Marked paid.");
}

/** Undoes a payment marked against the wrong invoice. */
export async function markUnpaid(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_invoice_unpaid", { p_id: id });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  revalidate(id);
  return success("Marked as not paid.");
}
