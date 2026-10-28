import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export type OutboxMessage = {
  channel: "email" | "sms" | "push";
  recipient: string;
  subject?: string | null;
  body: string;
  meta?: Record<string, Json | undefined>;
};

/** Demo mode: records a message on /dev/outbox instead of sending it. */
export async function writeToOutbox(
  message: OutboxMessage,
): Promise<{ id: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dev_outbox")
    .insert({
      channel: message.channel,
      recipient: message.recipient,
      subject: message.subject ?? null,
      body: message.body,
      meta: (message.meta ?? {}) as { [key: string]: Json | undefined },
    })
    .select("id")
    .single();
  if (error)
    throw new Error(`Couldn't write to the demo outbox: ${error.message}`);
  return { id: data.id };
}
