import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { markRead } from "./actions";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifications" };

/** Every message we've sent the worker, newest first (brief §5). */
export default async function WorkerNotificationsPage() {
  const user = await requireRole("worker");
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("notifications")
    .select("id, title, body, url, created_at, read_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const unread = (messages ?? [])
    .filter((message) => !message.read_at)
    .map((message) => message.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          <>
            Messages we&apos;ve sent you.{" "}
            <Link
              href="/worker/settings"
              className="underline underline-offset-4"
            >
              Choose what we send
            </Link>
          </>
        }
      />
      {unread.length > 0 ? <MarkRead ids={unread} action={markRead} /> : null}
      {messages?.length ? (
        <ul className="divide-y rounded-lg border">
          {messages.map((message) => (
            <li key={message.id} className="space-y-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{message.title}</h2>
                {message.read_at ? null : <Badge variant="info">New</Badge>}
              </div>
              <p className="text-sm [overflow-wrap:anywhere]">{message.body}</p>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span>{formatDateTime(message.created_at)}</span>
                {message.url ? (
                  <Link
                    href={message.url}
                    aria-label={`Open: ${message.title}`}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Open
                  </Link>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title="No messages yet"
          description="When you're booked, reminded about a shift or your account changes, it shows here too."
        />
      )}
    </div>
  );
}
