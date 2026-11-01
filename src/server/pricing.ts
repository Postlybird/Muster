import "server-only";

import { makePricer, type PricingScope } from "@/domain/pricing";
import { hourlyPayCents, pickRateCard, rateCardFromRow } from "@/domain/rates";
import { sydneyDateKey } from "@/lib/format";
import { loadPricingData } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

export type { ShiftQuote, ShiftToPrice } from "@/domain/pricing";

/**
 * Loads what's needed to price shifts for one business, work type, level and
 * state. Rate cards and bill rules are admin-only tables, so they're read
 * with the service-role key; callers only ever get the result.
 */
export async function loadPricing(scope: PricingScope) {
  const [data, settings] = await Promise.all([
    loadPricingData(createAdminClient(), scope),
    getAllSettings(),
  ]);
  return makePricer(scope, { ...data, settings });
}

/**
 * Today's standard weekday pay for a work type at level 1, in cents, so the
 * website's pictures of the app follow the current rates. Null when the work
 * type has no standard rate card in effect.
 */
export async function standardWeekdayPay(
  categoryCode: string,
): Promise<number | null> {
  const client = createAdminClient();
  const { data: category } = await client
    .from("categories")
    .select("id")
    .eq("code", categoryCode)
    .maybeSingle();
  if (!category) return null;
  const { data: cards } = await client
    .from("rate_cards")
    .select("*")
    .eq("category_id", category.id)
    .is("business_id", null)
    .eq("level", 1)
    .is("archived_at", null);
  const card = pickRateCard(cards ?? [], {
    businessId: "",
    categoryId: category.id,
    level: 1,
    date: sydneyDateKey(new Date()),
  });
  return card ? hourlyPayCents(rateCardFromRow(card), "ordinary") : null;
}
