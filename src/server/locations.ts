import "server-only";

import { cache } from "react";

import { CITIES, type City } from "@/config/cities";
import { createClient } from "@/lib/supabase/server";

export type Location = City & {
  stateName: string;
  /** We take work in its state. */
  open: boolean;
};

/**
 * Every city with a page, and whether we're open there, from the states
 * admins have opened. Read as the visitor, once per request.
 */
export const listLocations = cache(async (): Promise<Location[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("code, name, open_for_work");
  if (error) {
    // The pages still work; every city just shows as coming soon.
    console.error(`Couldn't read states: ${error.message}`);
  }
  const states = new Map((data ?? []).map((s) => [s.code, s]));
  return CITIES.map((city) => ({
    ...city,
    stateName: states.get(city.state)?.name ?? city.state,
    open: states.get(city.state)?.open_for_work ?? false,
  }));
});

/** One city by its page address, or null. */
export async function getLocation(slug: string): Promise<Location | null> {
  return (await listLocations()).find((city) => city.slug === slug) ?? null;
}
