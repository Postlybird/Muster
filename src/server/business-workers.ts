import "server-only";

import { createClient } from "@/lib/supabase/server";

import { refreshWorkerMatches } from "./matching";

/**
 * A business's favourites and blocked workers (brief §4.4, §4.7), changed
 * as the signed-in owner or manager, so RLS decides. Matches are worked out
 * again straight away: favourites see work first, and blocked workers stop
 * being offered it.
 */

type Outcome = { error: { code: string; message: string } | null };

export async function setFavourite(
  businessId: string,
  workerId: string,
  favourite: boolean,
): Promise<Outcome> {
  const supabase = await createClient();
  const { error } = favourite
    ? await supabase
        .from("favourites")
        .upsert(
          { business_id: businessId, worker_id: workerId },
          { onConflict: "business_id,worker_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("favourites")
        .delete()
        .eq("business_id", businessId)
        .eq("worker_id", workerId);
  if (!error) await refreshWorkerMatches(workerId, { notify: false });
  return { error };
}

/** Stops a worker being offered the business's work. They aren't told. */
export async function blockWorker(
  businessId: string,
  workerId: string,
  reason: string,
): Promise<Outcome> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blocks")
    .insert({ business_id: businessId, worker_id: workerId, reason });
  // Already blocked: nothing to do.
  if (error?.code === "23505") return { error: null };
  if (!error) {
    // A blocked worker isn't a favourite.
    await supabase
      .from("favourites")
      .delete()
      .eq("business_id", businessId)
      .eq("worker_id", workerId);
    await refreshWorkerMatches(workerId, { notify: false });
  }
  return { error };
}

export async function unblockWorker(
  businessId: string,
  workerId: string,
): Promise<Outcome> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blocks")
    .update({ archived_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("worker_id", workerId)
    .is("archived_at", null);
  if (!error) await refreshWorkerMatches(workerId, { notify: false });
  return { error };
}
