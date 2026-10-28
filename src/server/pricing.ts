import "server-only";

import { makePricer, type PricingScope } from "@/domain/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

export type { ShiftQuote, ShiftToPrice } from "@/domain/pricing";

/**
 * Loads what's needed to price shifts for one business, work type, level and
 * state. Rate cards and bill rules are admin-only tables, so they're read
 * with the service-role key; callers only ever get the result.
 */
export async function loadPricing(scope: PricingScope) {
  const admin = createAdminClient();
  const [cards, rules, holidays, category, settings] = await Promise.all([
    admin
      .from("rate_cards")
      .select("*")
      .eq("category_id", scope.categoryId)
      .is("archived_at", null),
    admin.from("bill_rate_rules").select("*").is("archived_at", null),
    admin.from("public_holidays").select("date").eq("state", scope.state),
    admin
      .from("categories")
      .select("min_engagement_hours, workers_comp_pct")
      .eq("id", scope.categoryId)
      .maybeSingle(),
    getAllSettings(),
  ]);
  return makePricer(scope, {
    cards: cards.data ?? [],
    rules: rules.data ?? [],
    publicHolidays: (holidays.data ?? []).map((holiday) => holiday.date),
    category: category.data,
    settings,
  });
}
