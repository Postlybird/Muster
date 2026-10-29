import { Briefcase, Check, Circle, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import {
  PostShortcutList,
  recentJobShortcuts,
  templateShortcuts,
} from "@/components/jobs/quick-post";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BUSINESS_STEPS } from "@/domain/business-onboarding";
import { formatDayShort } from "@/lib/format";
import { jobTitle, shiftHours } from "@/lib/job-format";
import { businessStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import {
  businessName,
  businessSnapshot,
  canManage,
  getMyBusiness,
  type BusinessRow,
} from "@/server/businesses";

export const metadata: Metadata = { title: "Dashboard" };

function GetStarted() {
  return (
    <section
      aria-labelledby="get-started"
      className="max-w-2xl space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 id="get-started" className="text-xl font-semibold">
        Set up your business
      </h2>
      <p>
        It takes a few minutes. You&apos;ll need your ABN, the address of a site
        you&apos;ll need workers at, and who should get invoices.
      </p>
      <p className="text-sm text-muted-foreground">
        Were you invited by your workplace? Sign in with the email address the
        invite was sent to, and you&apos;ll join their account.
      </p>
      <Button asChild size="lg">
        <Link href="/business/onboarding/abn">Start</Link>
      </Button>
    </section>
  );
}

function SetupProgress({ business }: { business: BusinessRow }) {
  const steps = BUSINESS_STEPS.filter((step) => step.key !== "submit");
  const done = steps.filter((step) =>
    business.onboarding_steps.includes(step.key),
  ).length;
  return (
    <section
      aria-labelledby="setup"
      className="max-w-2xl space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-2">
        <h2 id="setup" className="text-xl font-semibold">
          Finish setting up {businessName(business)}
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
          const isDone = business.onboarding_steps.includes(step.key);
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              {isDone ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 text-muted-foreground" aria-hidden />
              )}
              {step.title}
              <span className="sr-only">{isDone ? ": done" : ": to do"}</span>
            </li>
          );
        })}
      </ul>
      <Button asChild size="lg">
        <Link href="/business/onboarding">Continue</Link>
      </Button>
    </section>
  );
}

/** Hours waiting for the business (brief §7: timesheets to approve). */
async function TimesheetsToApprove() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("timesheets")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if (!count) return null;
  return (
    <Alert variant="info" className="max-w-2xl">
      <AlertDescription>
        {count === 1
          ? "1 timesheet is waiting for you to approve."
          : `${count} timesheets are waiting for you to approve.`}{" "}
        <Link href="/business/timesheets" className="font-medium underline">
          Check and approve
        </Link>
      </AlertDescription>
    </Alert>
  );
}

/** Templates and recent jobs, each posted again in a couple of taps. */
async function PostAgain({ businessId }: { businessId: string }) {
  const [templates, recent] = await Promise.all([
    templateShortcuts(businessId),
    recentJobShortcuts(businessId),
  ]);
  const shortcuts = [...templates, ...recent].slice(0, 5);
  if (shortcuts.length === 0) return null;
  return (
    <section aria-labelledby="post-again" className="max-w-3xl space-y-3">
      <div className="space-y-1">
        <h2 id="post-again" className="text-lg font-semibold">
          Post again
        </h2>
        <p className="text-sm text-muted-foreground">
          Same work, site and crew as before. You only choose the dates.
        </p>
      </div>
      <PostShortcutList shortcuts={shortcuts} />
    </section>
  );
}

/** The next two weeks of shifts, with how many workers are booked. */
async function UpcomingShifts({ businessId }: { businessId: string }) {
  const supabase = await createClient();
  const now = new Date();
  const { data: shifts } = await supabase
    .from("shifts")
    .select(
      "id, starts_at, ends_at, headcount, status, jobs!inner(id, business_id, status, categories(name), sites(name)), assignments(status)",
    )
    .eq("jobs.business_id", businessId)
    .eq("assignments.status", "confirmed")
    .eq("jobs.status", "posted")
    .gt("ends_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 14 * 86_400_000).toISOString())
    .order("starts_at")
    .limit(12);
  if (!shifts?.length) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Nothing in the next two weeks"
        description="Shifts you post show here with how many workers are booked."
      />
    );
  }
  return (
    <section aria-labelledby="coming-up" className="max-w-3xl space-y-3">
      <h2 id="coming-up" className="text-lg font-semibold">
        Coming up
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {shifts.map((shift) => (
          <li key={shift.id}>
            <Link
              href={`/business/jobs/${shift.jobs.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-muted/50"
            >
              <span>
                <span className="block font-medium">
                  {formatDayShort(shift.starts_at)}, {shiftHours(shift)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {jobTitle(
                    shift.jobs.categories?.name,
                    shift.jobs.sites?.name,
                  )}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {shift.assignments.length} of {shift.headcount} booked
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BusinessDashboardPage({
  searchParams,
}: PageProps<"/business">) {
  const { business, role } = await getMyBusiness();
  const { submitted } = await searchParams;
  const approved = business?.status === "approved";
  // Posting needs approval and account terms (v1 has no card payments).
  const canPost = approved && !!business?.account_terms_approved;
  // A new version of the services agreement needs accepting.
  const agreementOutdated =
    approved && business
      ? !(await businessSnapshot(business)).agreementAccepted
      : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={business ? businessName(business) : "Welcome"}
        description={
          approved
            ? "Today's shifts, fill status and timesheets to approve."
            : undefined
        }
        actions={
          canPost ? (
            <Button asChild>
              <Link href="/business/post">
                <Plus aria-hidden />
                Post work
              </Link>
            </Button>
          ) : undefined
        }
      />

      {submitted && business?.status === "pending" ? (
        <Alert variant="success" className="max-w-2xl">
          <AlertDescription>
            Thanks, we&apos;ve got your details. We&apos;ll email you when your
            account is approved.
          </AlertDescription>
        </Alert>
      ) : null}

      {!business ? (
        <GetStarted />
      ) : business.status === "draft" ? (
        role === "owner" ? (
          <SetupProgress business={business} />
        ) : (
          <WhatsNext
            className="max-w-2xl"
            title="Your business account"
            status={{
              ...businessStatuses.draft,
              next: "The account owner is still setting things up. You'll be able to post work once it's approved.",
            }}
          />
        )
      ) : business.status === "approved" ? (
        <>
          {agreementOutdated ? (
            <Alert variant="warning" className="max-w-2xl">
              <AlertDescription className="text-foreground">
                We&apos;ve updated the Labour Hire Services Agreement.{" "}
                <Link href="/business/settings#agreement" className="underline">
                  {role === "owner"
                    ? "Read and accept it in Settings"
                    : "Read it in Settings"}
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          {!business.account_terms_approved ? (
            <Alert variant="info" className="max-w-2xl">
              <AlertDescription>
                We&apos;re still setting up your account terms. You can post
                work once that&apos;s done.
              </AlertDescription>
            </Alert>
          ) : null}
          <TimesheetsToApprove />
          {canPost && canManage(role) ? (
            <PostAgain businessId={business.id} />
          ) : null}
          <UpcomingShifts businessId={business.id} />
        </>
      ) : (
        <WhatsNext
          className="max-w-2xl"
          title="Your business account"
          status={businessStatuses[business.status]}
          detail={
            business.status === "suspended" ? business.status_reason : null
          }
        />
      )}
    </div>
  );
}
