import { Mail, MessageSquare, Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isDemoMode } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { formatAuPhone, normaliseAuMobile } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendTestMessages } from "./actions";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = {
  title: "Demo outbox",
  robots: { index: false },
};

const channelIcon = { email: Mail, sms: MessageSquare, push: Bell } as const;

/** Demo mode only: every message the app would have sent. */
export default async function OutboxPage({
  searchParams,
}: PageProps<"/dev/outbox">) {
  if (!isDemoMode()) notFound();

  const params = await searchParams;
  const to = typeof params.to === "string" ? params.to.trim() : "";

  const admin = createAdminClient();
  let query = admin
    .from("dev_outbox")
    .select("id, created_at, channel, recipient, subject, body, meta")
    .order("created_at", { ascending: false })
    .limit(50);
  // Accept "0412 345 678" as well as the stored "+61412345678".
  const recipient = normaliseAuMobile(to) ?? to;
  if (recipient) query = query.ilike("recipient", `%${recipient}%`);
  const { data: messages, error } = await query;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <AutoRefresh />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Demo outbox</h1>
        <p className="text-muted-foreground">
          In demo mode nothing is really sent. Every text, email and
          notification the app would send appears here, newest first. This page
          refreshes itself.
        </p>
      </div>

      <form action={sendTestMessages}>
        <button
          type="submit"
          className="h-11 rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
        >
          Send test messages
        </button>
      </form>

      <form className="flex gap-2" role="search">
        <label htmlFor="to" className="sr-only">
          Filter by recipient
        </label>
        <input
          id="to"
          name="to"
          defaultValue={to}
          placeholder="Filter by phone or email"
          className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-base"
        />
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-destructive">Couldn&apos;t load the outbox.</p>
      ) : null}

      {messages && messages.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          No messages yet. Request a sign-in code and it will show up here.
        </p>
      ) : null}

      <ol className="space-y-3">
        {messages?.map((message) => {
          const Icon =
            channelIcon[message.channel as keyof typeof channelIcon] ?? Mail;
          const meta = (message.meta ?? {}) as { otp?: string; link?: string };
          return (
            <li
              key={message.id}
              className="space-y-2 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only">{message.channel}:</span>
                  <span className="[overflow-wrap:anywhere]">
                    {message.channel === "sms"
                      ? formatAuPhone(message.recipient)
                      : message.recipient}
                  </span>
                </span>
                <time
                  dateTime={message.created_at}
                  className="text-muted-foreground"
                >
                  {formatDateTime(message.created_at)}
                </time>
              </div>
              {message.subject ? (
                <p className="font-medium">{message.subject}</p>
              ) : null}
              {meta.otp ? (
                <p
                  className="font-mono text-3xl font-bold tracking-[0.3em]"
                  aria-label={`Code ${meta.otp.split("").join(" ")}`}
                >
                  {meta.otp}
                </p>
              ) : null}
              <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                {message.body}
              </p>
              {meta.link ? (
                <Link
                  href={meta.link}
                  className="text-sm font-medium text-primary underline"
                >
                  Open sign-in link
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
