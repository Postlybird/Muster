"use server";

import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The messages the worker has now seen. */
export async function markRead(ids: string[]): Promise<void> {
  await requireRole("worker");
  const parsed = z.array(z.uuid()).max(100).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return;
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read", { p_ids: parsed.data });
}
