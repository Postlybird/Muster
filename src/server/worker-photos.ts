import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Short-lived links to workers' photos, as the signed-in business: storage
 * rules only allow workers connected to the business (applied, booked or a
 * favourite).
 */
export async function workerPhotoLinks(paths: readonly (string | null)[]) {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))];
  if (wanted.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("worker-photos")
    .createSignedUrls(wanted, 600);
  return new Map(
    (data ?? []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
    ),
  );
}
