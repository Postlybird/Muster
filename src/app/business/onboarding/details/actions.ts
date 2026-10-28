"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionState } from "@/lib/forms";
import { normaliseAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { finishBusinessStep, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";

const schema = z.object({
  trading_name: z.string().trim().max(120, "That's too long"),
  billing_contact_name: z
    .string()
    .trim()
    .min(1, "Who should we contact about invoices?")
    .max(80, "That's too long"),
  billing_contact_phone: z.string().trim(),
  accounts_email: z.email("Enter the email address invoices should go to"),
});

/** Billing contact and accounts email (brief §4.2 step 3). */
export async function saveBusinessDetails(
  context: "onboarding" | "page",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || role !== "owner") {
    return failure("Only the owner can change these details.");
  }
  const parsed = schema.safeParse({
    trading_name: formData.get("trading_name") ?? "",
    billing_contact_name: formData.get("billing_contact_name") ?? "",
    billing_contact_phone: formData.get("billing_contact_phone") ?? "",
    accounts_email: String(formData.get("accounts_email") ?? "")
      .trim()
      .toLowerCase(),
  });
  const errors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;
  const phone = parsed.success
    ? normaliseAuPhone(parsed.data.billing_contact_phone)
    : null;
  if (parsed.success && !phone) {
    errors.billing_contact_phone = ["Enter an Australian phone number"];
  }
  if (!parsed.success || !phone) {
    return failure("Check the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      trading_name: parsed.data.trading_name || null,
      billing_contact_name: parsed.data.billing_contact_name,
      billing_contact_phone: phone,
      accounts_email: parsed.data.accounts_email,
    })
    .eq("id", business.id);
  if (error) return saveFailed(error);
  if (context === "onboarding") return finishBusinessStep(business, "details");
  revalidatePath("/business", "layout");
  return success("Details saved");
}
