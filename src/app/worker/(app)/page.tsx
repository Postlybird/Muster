import { CalendarCheck, Check, Circle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { MyShiftCard } from "@/components/shifts/my-shift-card";
import { OfferCard } from "@/components/shifts/offer-card";
import { PreviewList } from "@/components/shifts/preview-list";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isAvailableNow } from "@/domain/availability";
import { quickStartDone, type OnboardingStepKey } from "@/domain/onboarding";
import { formatTime, zoneOf } from "@/lib/format";
import { groupMyShifts } from "@/lib/my-shifts";
import { groupOffers } from "@/lib/offers";
import {
  checkStatuses,
  payrollStatuses,
  workerStatuses,
  type StatusInfo,
} from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { getAllSettings } from "@/server/settings";
import { loadTickets } from "@/server/tickets";
import { getMyWorker, type WorkerRow } from "@/server/workers";

import { AvailableNow } from "./availability/available-now";
import { CalloutOptIn } from "./availability/callout-opt-in";
import { Checklist, type ChecklistItem } from "./checklist";

export const metadata: Metadata = { title: "Home" };

const notAdded: StatusInfo = {
  label: "Not added",
  tone: "neutral",
  next: "Add it from your profile.",
};

/** Before the quick sign-up is done (owner, 01/11/2026). */
function FinishSigningUp() {
  return (
    <section
      aria-labelledby="finish-signing-up"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 id="finish-signing-up" className="text-xl font-semibold">
        Finish signing up
      </h2>
      <p>
        Two quick things: your mobile, and your suburb and the work you want.
        Then you&apos;ll see shifts near you and the pay.
      </p>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/worker/onboarding/start">Continue</Link>
      </Button>
    </section>
  );
}

/** What's left before we can check a worker, in four short parts. */
const GET_READY: {
  title: string;
  time: string;
  steps: OnboardingStepKey[];
}[] = [
  {
    title: "Photo and ID",
    time: "About 2 minutes",
    steps: ["about", "identity"],
  },
  { title: "Right to work", time: "About 1 minute", steps: ["right-to-work"] },
  { title: "Tickets", time: "If your work needs them", steps: ["tickets"] },
  {
    title: "Employment paperwork",
    time: "About 2 minutes",
    steps: ["paperwork"],
  },
];

/**
 * "Get ready to work" (owner, 01/11/2026): the checks we need before a
 * worker's first shift, done in their own time.
 */
function GetReady({ worker }: { worker: WorkerRow }) {
  const isDone = (steps: OnboardingStepKey[]) =>
    steps.every((step) => worker.onboarding_steps.includes(step));
  const done = GET_READY.filter((part) => isDone(part.steps)).length;
  const allDone = done === GET_READY.length;
  return (
    <section
      aria-labelledby="get-ready"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-2">
        <h2 id="get-ready" className="text-xl font-semibold">
          Get ready to work
        </h2>
        <p className="text-sm text-muted-foreground">
          {allDone
            ? "All done. Check your details and send them to us."
            : "Add these in your own time. Once they're in, we check them and you can start taking shifts."}
        </p>
        <Progress
          value={Math.round((done / GET_READY.length) * 100)}
          aria-label={`${done} of ${GET_READY.length} done`}
        />
      </div>
      <ul className="divide-y">
        {GET_READY.map((part) => {
          const partDone = isDone(part.steps);
          const step =
            part.steps.find((key) => !worker.onboarding_steps.includes(key)) ??
            part.steps[0]!;
          return (
            <li key={part.title}>
              <Link
                href={`/worker/onboarding/${step}`}
                className="flex min-h-14 items-center gap-3 py-2"
              >
                {partDone ? (
                  <Check className="size-5 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span className="flex-1">
                  <span className="block font-medium">
                    {part.title}
                    <span className="sr-only">
                      {partDone ? ": done" : ": to do"}
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {partDone ? "Done" : part.time}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link
          href={allDone ? "/worker/onboarding/submit" : "/worker/onboarding"}
        >
          {allDone ? "Check and submit" : done === 0 ? "Start" : "Continue"}
        </Link>
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
    loadTickets(worker.id, worker.home_state),
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
  const { submitted, welcome } = await searchParams;
  const name =
    worker.preferred_name ??
    worker.legal_first_name ??
    user.fullName?.split(" ")[0];

  const isDraft = worker.status === "draft";
  const active = worker.status === "active";
  const availableNow = isAvailableNow(worker.available_now_until, new Date());
  const signedUp = quickStartDone(worker.onboarding_steps);
  // Not checked yet: they see shifts near them, but can't apply.
  const previewing = (isDraft && signedUp) || worker.status === "pending";

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

      {welcome && isDraft && signedUp ? (
        <Alert variant="success">
          <AlertDescription>
            You&apos;re signed up. Here are shifts near you. Add your details
            below when you&apos;re ready, and we&apos;ll check them.
          </AlertDescription>
        </Alert>
      ) : null}

      {isDraft ? (
        signedUp ? (
          <GetReady worker={worker} />
        ) : (
          <FinishSigningUp />
        )
      ) : null}

      {previewing ? <PreviewList limit={3} /> : null}

      {/* Active workers see work first; everyone else sees their checks. */}
      {active ? (
        <>
          <Offers />
          <NextShift active={active} />
          <section aria-labelledby="callouts-heading" className="space-y-3">
            <h2 id="callouts-heading" className="text-lg font-semibold">
              Urgent work
            </h2>
            <CalloutOptIn
              on={worker.urgent_opt_in}
              payPct={(await getAllSettings()).urgent_loading_pct.pay}
            />
            <AvailableNow
              on={availableNow}
              untilLabel={
                availableNow && worker.available_now_until
                  ? formatTime(
                      worker.available_now_until,
                      zoneOf(worker.home_state),
                    )
                  : null
              }
              canUse={active}
            />
          </section>
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

      {active || isDraft || worker.status === "pending" ? null : (
        <NextShift active={active} />
      )}
    </div>
  );
}
