import "server-only";

import { cache } from "react";

import { industrySlug, workTypeNeeds } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";

import { workTypesWithRates } from "./pricing";

export type PublicWorkType = {
  /** The work type's code, which doesn't change when it's renamed. */
  code: string;
  name: string;
  description: string;
  needs: string[];
  /** False while it waits for its pay rates: it can't be booked yet. */
  bookable: boolean;
};

export type PublicIndustry = {
  code: string;
  /** Its page: /industries/<slug>. */
  slug: string;
  name: string;
  summary: string;
  description: string;
  icon: string;
  workTypes: PublicWorkType[];
};

/**
 * Active industries and their active work types, for the website. Read as
 * the visitor (the catalogues are public), once per request; which work
 * types have pay rates comes from src/server/pricing.ts.
 */
export const listIndustries = cache(async (): Promise<PublicIndustry[]> => {
  const supabase = await createClient();
  const [{ data, error }, withRates] = await Promise.all([
    supabase
      .from("industries")
      .select(
        "code, name, summary, description, icon, categories(id, code, name, description, sort_order, active, archived_at, police_check_required, category_credentials(credential_types(name, family, sort_order, active)))",
      )
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order"),
    workTypesWithRates().catch((problem: unknown) => {
      // Without rates every work type shows as bookable; say why.
      console.error(problem);
      return null;
    }),
  ]);
  if (error) {
    // The pages still work without the list; say why it's missing.
    console.error(`Couldn't read industries: ${error.message}`);
    return [];
  }
  return (data ?? []).map((industry) => ({
    code: industry.code,
    slug: industrySlug(industry.code),
    name: industry.name,
    summary: industry.summary,
    description: industry.description,
    icon: industry.icon,
    workTypes: industry.categories
      .filter((c) => c.active && !c.archived_at)
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      )
      .map((c) => ({
        code: c.code,
        name: c.name,
        description: c.description,
        needs: workTypeNeeds(c),
        bookable: withRates ? withRates.has(c.id) : true,
      })),
  }));
});

/** One industry by its page address, or null. */
export async function getIndustry(
  slug: string,
): Promise<PublicIndustry | null> {
  return (await listIndustries()).find((i) => i.slug === slug) ?? null;
}
