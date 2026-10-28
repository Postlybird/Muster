"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DAY_TYPES } from "@/domain/rates";
import { requireRole } from "@/lib/auth";
import {
  dollarsToCents,
  failure,
  invalid,
  optionalText,
  requiredNumber,
  success,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const optionalDate = isoDate.nullable();

function friendlyDbError(
  error: { code?: string; message: string },
  duplicate: string,
): string {
  if (error.code === "23505") return duplicate;
  if (error.code === "23514")
    return "Some values aren't allowed. Check the dates and amounts.";
  return `Couldn't save: ${error.message}`;
}

// ---------------------------------------------------------------------------
// Rate cards
// ---------------------------------------------------------------------------

const multiplier = requiredNumber("Enter a multiplier").pipe(
  z.number().min(0.5, "Too low").max(5, "Too high"),
);

const rateCardSchema = z
  .object({
    category_id: z.uuid("Choose a category"),
    level: requiredNumber("Enter a level").pipe(
      z.number().int().min(1).max(10),
    ),
    base_rate_cents: z
      .number({ error: "Enter the base rate in dollars, like 26.50" })
      .int()
      .min(1000, "That's below any award rate. Check it.")
      .max(50000, "That's over $500 an hour. Check it."),
    ordinary_multiplier: multiplier,
    saturday_multiplier: multiplier,
    sunday_multiplier: multiplier,
    public_holiday_multiplier: multiplier,
    overtime_multiplier: multiplier,
    night_multiplier: multiplier,
    effective_from: isoDate,
    effective_to: optionalDate,
    checked_by: z.string().trim().max(120).nullable(),
    checked_on: optionalDate,
    notes: z.string().trim().max(1000),
  })
  .refine((v) => !v.effective_to || v.effective_to >= v.effective_from, {
    path: ["effective_to"],
    message: "Must be on or after the start date",
  });

export async function saveRateCard(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin");
  const cents = dollarsToCents(formData.get("base_rate"));
  const parsed = rateCardSchema.safeParse({
    category_id: formData.get("category_id"),
    level: formData.get("level"),
    base_rate_cents: cents === null || Number.isNaN(cents) ? undefined : cents,
    ...Object.fromEntries(
      DAY_TYPES.map((d) => [
        `${d}_multiplier`,
        formData.get(`${d}_multiplier`),
      ]),
    ),
    effective_from: formData.get("effective_from"),
    effective_to: optionalText(formData.get("effective_to")),
    checked_by: optionalText(formData.get("checked_by")),
    checked_on: optionalText(formData.get("checked_on")),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    const state = invalid(parsed.error);
    // Field name in the form is base_rate (dollars).
    if (state.status === "error" && state.fieldErrors?.base_rate_cents) {
      state.fieldErrors.base_rate = state.fieldErrors.base_rate_cents;
    }
    return state;
  }

  const supabase = await createClient();
  const duplicate =
    "There's already a rate card for this category and level starting on that date.";
  if (id) {
    const { error } = await supabase
      .from("rate_cards")
      .update(parsed.data)
      .eq("id", id);
    if (error) return failure(friendlyDbError(error, duplicate));
    revalidatePath("/admin/rates/rate-cards");
    return success("Rate card saved");
  }
  const { data, error } = await supabase
    .from("rate_cards")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error) return failure(friendlyDbError(error, duplicate));
  revalidatePath("/admin/rates/rate-cards");
  redirect(`/admin/rates/rate-cards/${data.id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Bill rate rules
// ---------------------------------------------------------------------------

const centsField = (label: string) =>
  z
    .number({ error: `Enter the ${label} bill rate in dollars` })
    .int()
    .min(100, "Enter a dollar amount, like 55.00")
    .max(100000, "That's over $1,000 an hour. Check it.");

const billRuleSchema = z
  .object({
    category_id: z.uuid("Choose a category"),
    method: z.enum(["markup", "fixed"]),
    margin_pct: z.number().min(0).max(500).nullable(),
    fixed_ordinary_cents: centsField("ordinary").nullable(),
    fixed_saturday_cents: centsField("Saturday").nullable(),
    fixed_sunday_cents: centsField("Sunday").nullable(),
    fixed_public_holiday_cents: centsField("public holiday").nullable(),
    fixed_overtime_cents: centsField("overtime").nullable(),
    fixed_night_cents: centsField("night").nullable(),
    effective_from: isoDate,
    effective_to: optionalDate,
    notes: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.effective_to && v.effective_to < v.effective_from) {
      ctx.addIssue({
        code: "custom",
        path: ["effective_to"],
        message: "Must be on or after the start date",
      });
    }
    if (v.method === "markup" && v.margin_pct === null) {
      ctx.addIssue({
        code: "custom",
        path: ["margin_pct"],
        message: "Enter the margin",
      });
    }
    if (v.method === "fixed") {
      for (const day of DAY_TYPES) {
        if (v[`fixed_${day}_cents`] === null) {
          ctx.addIssue({
            code: "custom",
            path: [`fixed_${day}`],
            message: "Enter a rate",
          });
        }
      }
    }
  });

export async function saveBillRule(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin");
  const method = formData.get("method") === "fixed" ? "fixed" : "markup";
  const margin = optionalText(formData.get("margin_pct"));
  const fixed = Object.fromEntries(
    DAY_TYPES.map((day) => {
      const cents =
        method === "fixed"
          ? dollarsToCents(formData.get(`fixed_${day}`))
          : null;
      return [
        `fixed_${day}_cents`,
        cents !== null && Number.isNaN(cents) ? -1 : cents,
      ];
    }),
  );
  const parsed = billRuleSchema.safeParse({
    category_id: formData.get("category_id"),
    method,
    margin_pct: method === "markup" && margin !== null ? Number(margin) : null,
    ...fixed,
    effective_from: formData.get("effective_from"),
    effective_to: optionalText(formData.get("effective_to")),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    const state = invalid(parsed.error);
    if (state.status === "error" && state.fieldErrors) {
      for (const day of DAY_TYPES) {
        const key = `fixed_${day}_cents`;
        if (state.fieldErrors[key])
          state.fieldErrors[`fixed_${day}`] = state.fieldErrors[key];
      }
    }
    return state;
  }

  const supabase = await createClient();
  const duplicate = "A rule like this already exists.";
  if (id) {
    const { error } = await supabase
      .from("bill_rate_rules")
      .update(parsed.data)
      .eq("id", id);
    if (error) return failure(friendlyDbError(error, duplicate));
    revalidatePath("/admin/rates/bill-rules");
    return success("Bill rule saved");
  }
  const { data, error } = await supabase
    .from("bill_rate_rules")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error) return failure(friendlyDbError(error, duplicate));
  revalidatePath("/admin/rates/bill-rules");
  redirect(`/admin/rates/bill-rules/${data.id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Archiving rate cards and bill rules
// ---------------------------------------------------------------------------

export async function setRateArchived(
  table: "rate_cards" | "bill_rate_rules",
  id: string,
  archived: boolean,
): Promise<ActionState> {
  await requireRole("admin");
  if (
    !["rate_cards", "bill_rate_rules"].includes(table) ||
    !z.uuid().safeParse(id).success
  ) {
    return failure("Unknown item.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error)
    return failure(
      friendlyDbError(error, "That would clash with another active entry."),
    );
  revalidatePath("/admin/rates", "layout");
  return success(archived ? "Archived" : "Restored");
}

// ---------------------------------------------------------------------------
// Public holidays
// ---------------------------------------------------------------------------

const holidaySchema = z.object({
  state: z.enum(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]),
  date: isoDate,
  name: z.string().trim().min(1, "Enter a name").max(80),
});

export async function addHoliday(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = holidaySchema.safeParse({
    state: formData.get("state") ?? "NSW",
    date: formData.get("date"),
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").insert(parsed.data);
  if (error)
    return failure(
      friendlyDbError(
        error,
        "That date is already a public holiday in that state.",
      ),
    );
  revalidatePath("/admin/rates/holidays");
  return success("Public holiday added");
}

export async function deleteHoliday(id: string): Promise<ActionState> {
  await requireRole("admin");
  if (!z.uuid().safeParse(id).success) return failure("Unknown holiday.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("public_holidays")
    .delete()
    .eq("id", id);
  if (error) return failure(`Couldn't remove it: ${error.message}`);
  revalidatePath("/admin/rates/holidays");
  return success("Public holiday removed");
}
