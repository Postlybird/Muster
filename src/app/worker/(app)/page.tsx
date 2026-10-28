import { CalendarCheck, Check, Circle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Markdown } from "@/components/markdown";
import { ScrollBox } from "@/components/scroll-box";
import { MyShiftCard } from "@/components/shifts/my-shift-card";
import { OfferCard } from "@/components/shifts/offer-card";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS } from "@/domain/onboarding";
import { groupMyShifts } from "@/lib/my-shifts";
import { groupOffers } from "@/lib/offers";
import {
  checkStatuses,
  payrollStatuses,
  workerStatuses,
  type StatusInfo,
} from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement } from "@/server/agreements";
import { loadTickets } from "@/server/tickets";
import {
  getMyWorker,
  hasStartedOnboarding,
  type WorkerRow,
} from "@/server/workers";

import { Checklist, type ChecklistItem } from "./checklist";
import { StartButton } from "./start-button";

export const metadata: Metadata = { title: "Home" };

const notAdded: StatusInfo = {
  label: "Not added",
  tone: "neutral",
  next: "Add it from your profile.",
};

async function GetStarted() {
  const notice = await currentAgreement("privacy_collection_notice");
  return (
    <section
      aria-labelledby="get-started"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 id="get-started" className="text-xl font-semibold">
        Let&apos;s get you set up
      </h2>
      <p>It takes about 5 minutes on your phone. Have these handy:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>your driver licence or passport</li>
        <li>
          proof of citizenship (Australian passport, birth or citizenship
          certificate), or your passport and visa details
        </li>
        <li>photos or PDFs of your tickets, like your White Card</li>
      </ul>
      {notice ? (
        <details className="rounded-md bg-muted/50">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
            How we handle your information
          </summary>
          <ScrollBox
            label="How we handle your information"
            className="max-h-96 border-t px-3 py-3"
          >
            <Markdown>{notice.body_md}</Markdown>
          </ScrollBox>
        </details>
      ) : null}
      <p className="text-sm text-muted-foreground">
        By starting, you agree to us collecting and using your information as
        described in our{" "}
        <Link href="/privacy#collection-notice" className="underline">
          collection notice
        </Link>
        .
      </p>
      <StartButton />
    </section>
  );
}

function SetupProgress({ worker }: { worker: WorkerRow }) {
  const steps = ONBOARDING_STEPS.filter((step) => step.key !== "submit");
  const done = steps.filter((step) =>
    worker.onboarding_steps.includes(step.key),
  ).length;
  return (
    <section
      aria-labelledby="setup"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-2">
        <h2 id="setup" className="text-xl font-semibold">
          Finish setting up
        </h2>
        <p className="text-sm text-muted-foreground">
          {done} of {steps.length} steps done
        </p>
        <Progress
          value={Math.round((done / steps.length) * 100)}
          aria-label={`${done} of ${steps.length} steps done`}
        />
      </div>
      <ul className="space-y-2">
        {steps.map((step) => {
          const isDone = worker.onboarding_steps.includes(step.key);
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              {isDone ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 text-muted-foreground" aria-hidden />
              )}
              <span>
                {step.title}
                <span className="sr-only">{isDone ? ": done" : ": to do"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/worker/onboarding">Continue</Link>
      </Button>
    </section>
  );
}

async function verificationItems(worker: WorkerRow): Promise<ChecklistItem[]> {
  const supabase = await createClient();
  const [{ data: rights }, { data: identity }, tickets] = await Promise.all([
    supabase
      .from("work_rights")
      .select("status, rejection_reason")
      .eq("worker_id", worker.id)
      .maybeSingle(),
    supabase
      .from("identity_checks")
      .select("status, rejection_reason")
      .eq("worker_id", worker.id)
      .maybeSingle(),
    loadTickets(worker.id),
  ]);

  const items: ChecklistItem[] = [
    {
      title: "Your photo",
      status: worker.photo_status
        ? checkStatuses[worker.photo_status]
        : notAdded,
      detail:
        worker.photo_status === "rejected"
          ? worker.photo_rejection_reason
          : null,
      href: "/worker/onboarding/about",
      action: worker.photo_status === "rejected" ? "Change photo" : undefined,
    },
    {
      title: "Right to work",
      status: rights ? checkStatuses[rights.status] : notAdded,
      detail: rights?.status === "rejected" ? rights.rejection_reason : null,
      href: "/worker/onboarding/right-to-work",
      action:
        rights?.status === "rejected" || rights?.status === "expired"
          ? "Fix it"
          : undefined,
    },
    {
      title: "Photo ID",
      status: identity ? checkStatuses[identity.status] : notAdded,
      detail:
        identity?.status === "rejected" ? identity.rejection_reason : null,
      href: "/worker/onboarding/identity",
      action: identity?.status === "rejected" ? "Upload new photos" : undefined,
    },
  ];

  for (const row of tickets.rows) {
    const s = row.summary;
    if (s.state === "missing" && row.neededFor.length === 0) continue;
    const status: StatusInfo =
      s.state === "missing"
        ? {
            ...notAdded,
            next: `Add it to take ${row.neededFor.join(", ")} shifts.`,
          }
        : s.state === "verified" && s.expiringSoon
          ? {
              label: "Expires soon",
              tone: "warning",
              next: "Upload the renewed ticket so you can keep taking shifts that need it.",
            }
          : checkStatuses[s.state];
    items.push({
      title: row.type.name,
      status,
      detail: s.state === "rejected" ? s.reason : null,
      href: `/worker/onboarding/tickets/${row.type.code}`,
      action:
        s.state === "missing"
          ? "Add it"
          : s.state === "rejected"
            ? "Fix it"
            : s.state === "expired" ||
                (s.state === "verified" && s.expiringSoon)
              ? "Add renewed ticket"
              : undefined,
    });
  }

  items.push({
    title: "Pay setup",
    status: payrollStatuses[worker.payroll_status],
  });
  return items;
}

/** The next shift they're booked on. */
async function NextShift({ active }: { active: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_shifts");
  const next = groupMyShifts(data ?? []).booked[0];
  return (
    <section aria-labelledby="next-shift" className="space-y-3">
      <h2 id="next-shift" className="text-lg font-semibold">
        Next shift
      </h2>
      {next ? (
        <MyShiftCard job={{ ...next, shifts: [next.first] }} status="booked" />
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="No shifts booked yet"
          description={
            active
              ? "Shifts you're booked on show here."
              : "Once your details are verified, shifts that match your tickets will appear under Find shifts."
          }
        />
      )}
    </section>
  );
}

/** The newest offers (brief §4.4), with a way into the full feed. */
async function Offers() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_shift_offers");
  const offers = groupOffers(data ?? []);
  return (
    <section aria-labelledby="offers" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="offers" className="text-lg font-semibold">
          Shifts for you
        </h2>
        {offers.length > 2 ? (
          <Link
            href="/worker/shifts"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See all {offers.length}
          </Link>
        ) : null}
      </div>
      {offers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing right now"
          description="Work that matches your work types and tickets shows here as soon as it's posted."
        />
      ) : (
        <ul className="space-y-3">
          {offers.slice(0, 2).map((offer) => (
            <li key={offer.jobId}>
              <OfferCard offer={offer} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function WorkerHomePage({
  searchParams,
}: PageProps<"/worker">) {
  const { user, worker } = await getMyWorker();
  const { submitted } = await searchParams;
  const name =
    worker.preferred_name ??
    worker.legal_first_name ??
    user.fullName?.split(" ")[0];

  const isDraft = worker.status === "draft";
  const active = worker.status === "active";
  const started = isDraft ? await hasStartedOnboarding(user.id) : true;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `Hi ${name}` : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          {isDraft
            ? "Welcome. Here's how to start getting shifts."
            : "Here's where you're up to."}
        </p>
      </div>

      {submitted && worker.status === "pending" ? (
        <Alert variant="success">
          <AlertDescription>
            Thanks, we&apos;ve got your details. We&apos;ll check them and text
            you when you&apos;re ready to take shifts.
          </AlertDescription>
        </Alert>
      ) : null}

      {isDraft ? (
        started ? (
          <SetupProgress worker={worker} />
        ) : (
          <GetStarted />
        )
      ) : null}

      {/* Active workers see work first; everyone else sees their checks. */}
      {active ? (
        <>
          <Offers />
          <NextShift active={active} />
        </>
      ) : null}

      {isDraft ? null : (
        <>
          <WhatsNext
            title="Your account"
            status={workerStatuses[worker.status]}
            detail={
              worker.status === "suspended" ? worker.status_reason : undefined
            }
          />
          <section aria-labelledby="checks" className="space-y-3">
            <h2 id="checks" className="text-lg font-semibold">
              Your checks
            </h2>
            <Checklist items={await verificationItems(worker)} />
          </section>
        </>
      )}

      {active ? null : <NextShift active={active} />}
    </div>
  );
}
