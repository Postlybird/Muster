import "server-only";

import { makePricer, type PricingScope } from "@/domain/pricing";
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
