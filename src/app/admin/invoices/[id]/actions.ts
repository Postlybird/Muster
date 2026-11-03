"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/format";
import {
  dollarsToCents,
  failure,
  success,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { issueCreditNote } from "@/server/credit-notes";
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

/**
 * Credits part or all of an invoice that's gone out (owner, 03/11/2026): a
 * numbered credit note with its share of the GST, made into a PDF and
 * emailed to the business's accounts contact.
 */
export async function issueCredit(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const amount = dollarsToCents(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();
  const errors: Record<string, string[]> = {};
  if (amount === null || Number.isNaN(amount) || amount <= 0) {
    errors.amount = ["Enter the amount to credit, like 110.00"];
  }
  if (reason.length < 3) errors.reason = ["Say why it's being credited"];
  if (reason.length > 500) errors.reason = ["Keep it to 500 characters"];
  if (Object.keys(errors).length > 0 || amount === null) {
    return failure("Check the highlighted fields.", errors);
  }
  const result = await issueCreditNote(id, amount, reason);
  if (!result.ok) {
    const { error } = result;
    if (error.code === "23514") {
      return failure(`${error.message}.`, {
        amount: /credit|amount/i.test(error.message)
          ? [error.message]
          : undefined,
        reason: /reason|why/i.test(error.message) ? [error.message] : undefined,
      });
    }
    return saveFailed(error);
  }
  revalidate(id);
  const issued = `Credit note ${result.number} for ${formatCents(amount)} issued`;
  return success(
    {
      sent: `${issued} and emailed to the business.`,
      "no-address": `${issued}. The business has no accounts email, so send them its PDF.`,
      later: `${issued}. It couldn't be emailed just now, so it'll be sent tomorrow morning.`,
    }[result.emailed],
  );
}
