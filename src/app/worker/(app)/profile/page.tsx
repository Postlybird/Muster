import { ChevronRight, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { initials } from "@/components/layout/user-summary";
import { StatusBadge } from "@/components/status/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { normaliseTime, summariseWeekly } from "@/domain/availability";
import { formatCalendarDate } from "@/lib/format";
import { formatAuPhone } from "@/lib/phone";
import { workerStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { loadTickets } from "@/server/tickets";
import { getMyWorker, signedUrl } from "@/server/workers";

import { LICENCE_LABELS } from "@/config/worker-options";

export const metadata: Metadata = { title: "Profile" };

function Section({
  title,
  href,
  action = "Change",
  children,
}: {
  title: string;
  href: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {action}
          <span className="sr-only">: {title}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

export default async function ProfilePage() {
  const { user, worker } = await getMyWorker();

  if (worker.status === "draft") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <p>Your profile fills in as you set up your account.</p>
          <Button asChild size="lg">
            <Link href="/worker">Carry on setting up</Link>
          </Button>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [photoUrl, { data: categories }, { data: weekly }, tickets] =
    await Promise.all([
      signedUrl("worker-photos", worker.photo_path),
      supabase
        .from("worker_categories")
        .select("years_experience, categories(name)")
        .eq("worker_id", worker.id),
      supabase
        .from("availability_weekly")
        .select("weekday, start_time, end_time")
        .eq("worker_id", worker.id),
      loadTickets(worker.id, worker.home_state),
    ]);
  const name = [worker.legal_first_name, worker.legal_last_name]
    .filter(Boolean)
    .join(" ");
  const myTickets = tickets.rows.filter((r) => r.summary.state !== "missing");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback className="text-lg">
            {name ? (
              initials(name)
            ) : (
              <UserRound className="size-6" aria-hidden />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {worker.preferred_name ?? name}
          </h1>
          <StatusBadge status={workerStatuses[worker.status]} />
        </div>
      </div>

      <Section title="About you" href="/worker/onboarding/about">
        <Row label="Legal name" value={name} />
        {worker.preferred_name ? (
          <Row label="Preferred name" value={worker.preferred_name} />
        ) : null}
        {worker.date_of_birth ? (
          <Row
            label="Date of birth"
            value={formatCalendarDate(worker.date_of_birth)}
          />
        ) : null}
      </Section>

      <Section
        title="Contact details"
        href="/worker/onboarding/contact"
        action="View"
      >
        <Row label="Mobile" value={formatAuPhone(user.phone) || "Not added"} />
        <Row label="Email" value={user.email ?? "Not added"} />
      </Section>

      <Section title="Getting to work" href="/worker/onboarding/travel">
        <Row
          label="Suburb"
          value={
            worker.home_suburb
              ? `${worker.home_suburb} ${worker.home_postcode ?? ""}`.trim()
              : "Not added"
          }
        />
        <Row label="Travels up to" value={`${worker.travel_radius_km} km`} />
        <Row
          label="Transport"
          value={
            [
              worker.has_car ? "Has a car" : null,
              worker.licence_class && worker.licence_class !== "none"
                ? `${LICENCE_LABELS[worker.licence_class]} licence`
                : null,
              worker.uses_public_transport ? "Public transport" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Not given"
          }
        />
      </Section>

      <Section title="Work types" href="/worker/onboarding/work-types">
        {(categories ?? []).length > 0 ? (
          <ul className="space-y-1">
            {(categories ?? []).map((row) => (
              <li key={row.categories?.name}>
                {row.categories?.name}
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {row.years_experience === 0
                    ? "under a year"
                    : `${row.years_experience}${row.years_experience === 10 ? "+" : ""} year${row.years_experience === 1 ? "" : "s"}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>None chosen yet.</p>
        )}
        {worker.bio ? (
          <p className="pt-2 text-muted-foreground">{worker.bio}</p>
        ) : null}
      </Section>

      <Section
        title="Tickets"
        href="/worker/onboarding/tickets"
        action="Manage"
      >
        {myTickets.length > 0 ? (
          <ul className="space-y-1">
            {myTickets.map((row) => (
              <li key={row.type.id}>
                {row.type.name}
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {row.summary.state === "verified"
                    ? row.summary.validUntil
                      ? `verified until ${formatCalendarDate(row.summary.validUntil)}`
                      : "verified"
                    : row.summary.state === "pending"
                      ? "being checked"
                      : row.summary.state === "rejected"
                        ? "needs fixing"
                        : "expired"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tickets added yet.</p>
        )}
      </Section>

      <Section title="Availability" href="/worker/availability">
        <p>
          {summariseWeekly(
            (weekly ?? []).map((row) => ({
              weekday: row.weekday,
              start: normaliseTime(row.start_time) ?? "00:00",
              end: normaliseTime(row.end_time) ?? "00:00",
            })),
          )}
        </p>
        <p className="text-muted-foreground">
          {worker.urgent_opt_in
            ? "You get urgent call-outs."
            : "You don't get urgent call-outs."}
        </p>
      </Section>

      <Section title="Right to work and ID" href="/worker" action="See checks">
        <p>Your right to work, photo ID and checks are on your home page.</p>
      </Section>

      <Section
        title="Employment paperwork"
        href="/worker/onboarding/paperwork"
        action="View"
      >
        <p>Your contract and the Fair Work information statements.</p>
      </Section>
    </div>
  );
}
