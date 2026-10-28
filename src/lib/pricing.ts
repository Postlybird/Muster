import type { SupabaseClient } from "@supabase/supabase-js";

import type { PricingData, PricingScope } from "@/domain/pricing";

import type { Database } from "./supabase/database.types";

/**
 * Reads what prices shifts in one scope: rate cards, bill rules, public
 * holidays and the work type's minimum engagement and workers' comp. Rate
 * cards and bill rules are admin-only tables, so `client` holds the
 * service-role key; callers pass on only the result (src/server/pricing.ts
 * for estimates, src/lib/matching.ts for workers' pay).
 */
export async function loadPricingData(
  client: SupabaseClient<Database>,
  scope: PricingScope,
): Promise<Omit<PricingData, "settings">> {
  const [cards, rules, holidays, category] = await Promise.all([
    client
      .from("rate_cards")
      .select("*")
      .eq("category_id", scope.categoryId)
      .is("archived_at", null),
    client.from("bill_rate_rules").select("*").is("archived_at", null),
    client.from("public_holidays").select("date").eq("state", scope.state),
    client
      .from("categories")
      .select("min_engagement_hours, workers_comp_pct")
      .eq("id", scope.categoryId)
      .maybeSingle(),
  ]);
  const failed = cards.error ?? rules.error ?? holidays.error ?? category.error;
  if (failed) throw new Error(`Couldn't load rates: ${failed.message}`);
  return {
    cards: cards.data ?? [],
    rules: rules.data ?? [],
    publicHolidays: (holidays.data ?? []).map((holiday) => holiday.date),
    category: category.data,
  };
}
