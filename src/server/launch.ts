import "server-only";

import { cache } from "react";

import { allRows } from "@/lib/supabase/all-rows";
import { createAdminClient } from "@/lib/supabase/admin";

import { notify } from "./notifications";
import { getAllSettings } from "./settings";

/**
 * When shifts start ("in early 2027"), while the launch notice is on, or
 * null (owner, 20/11/2026). Never throws: without the settings, there's no
 * notice.
 */
export const launchNotice = cache(async (): Promise<string | null> => {
  try {
    const settings = await getAllSettings();
    return settings.launch_notice ? settings.launch_notice_when : null;
  } catch {
    return null;
  }
});

/**
 * How many people one press of "Email everyone" tells. The email plan
 * sends 100 a day to start with, and sign-in codes need some of them.
 */
export const LAUNCH_BATCH = 80;

/**
 * Tells everyone who has signed up, workers and business users, that we're
 * open for shifts: once each (its dedupe key), a batch at a time. Returns
 * how many it told now and how many are still to tell.
 */
export async function announceLaunch(): Promise<{
  told: number;
  left: number;
}> {
  const admin = createAdminClient();
  const [people, alreadyTold] = await Promise.all([
    allRows("people", (from, to) =>
      admin
        .from("profiles")
        .select("id, role")
        .in("role", ["worker", "business_user"])
        .is("archived_at", null)
        .order("id")
        .range(from, to),
    ),
    allRows("launch messages", (from, to) =>
      admin
        .from("notifications")
        .select("profile_id")
        .like("dedupe_key", "launch_open:%")
        .order("id")
        .range(from, to),
    ),
  ]);
  const told = new Set(alreadyTold.map((row) => row.profile_id));
  const waiting = people.filter((person) => !told.has(person.id));
  const batch = waiting.slice(0, LAUNCH_BATCH);
  // A few at a time, so a batch doesn't take minutes.
  for (let i = 0; i < batch.length; i += 5) {
    await Promise.all(
      batch.slice(i, i + 5).map((person) => {
        const options = { dedupeKey: `launch_open:${person.id}` };
        return person.role === "worker"
          ? notify(
              "launch_open_worker",
              person.id,
              {},
              {
                ...options,
                url: "/worker/shifts",
              },
            )
          : notify(
              "launch_open_business",
              person.id,
              {},
              {
                ...options,
                url: "/business/post",
              },
            );
      }),
    );
  }
  return { told: batch.length, left: waiting.length - batch.length };
}
