import { Briefcase, Plus, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ActionButton } from "@/components/forms/action-button";
import {
  PostShortcutList,
  recentJobShortcuts,
  templateShortcuts,
} from "@/components/jobs/quick-post";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDayShort, zoneOf } from "@/lib/format";
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

import { startCallout, startJob } from "./post/actions";

export const metadata: Metadata = { title: "Dashboard" };

/** Business sign-up is one screen (owner, 01/11/2026). */
function GetStarted({ business }: { business: BusinessRow | null }) {
  return (
    <section
      aria-labelledby="get-started"
      className="max-w-2xl space-y-4 rounded-xl border bg-card p-5"
    >
      <h2 id="get-started" className="text-xl font-semibold">
        {business
          ? `Finish setting up ${businessName(business)}`
          : "Set up your business"}
      </h2>
      <p>
        Confirm your business from its ABN and accept our services agreement. It
        takes about a minute.
      </p>
      {business ? null : (
        <p className="text-sm text-muted-foreground">
          Were you invited by your workplace? Sign in with the email address the
          invite was sent to, and you&apos;ll join their account.
        </p>
      )}
      <Button asChild size="lg">
        <Link href="/business/onboarding">
          {business ? "Continue" : "Set up your business"}
        </Link>
      </Button>
    </section>
  );
}

/**
 * While we check a business (or set up its account terms), it sets up its
 * first shift, ready to post the moment we're done (owner, 01/11/2026).
 */
async function FirstShift({ businessId }: { businessId: string }) {
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("jobs")
    .select("id, categories(name), sites(name)")
    .eq("business_id", businessId)
    .eq("status", "draft")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(3);
  return (
    <section
      aria-labelledby="first-shift"
      className="max-w-2xl space-y-3 rounded-xl border bg-card p-5"
    >
      <h2 id="first-shift" className="text-xl font-semibold">
        Set up your first shift while you wait
      </h2>
      <p className="text-muted-foreground">
        Add your site, the work and the times now. You can post it as soon as
        your account is ready, and we&apos;ll email you when it is.
      </p>
      {(drafts ?? []).length > 0 ? (
        <ul className="space-y-2">
          {(drafts ?? []).map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/business/post/${draft.id}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {jobTitle(draft.categories?.name, draft.sites?.name)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ActionButton action={startJob} size="lg" pendingText="Starting…">
        <Plus aria-hidden />
        {(drafts ?? []).length > 0 ? "Set up another shift" : "Set up a shift"}
      </ActionButton>
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
    <section aria-labelledby="post-again" className="max-w-5xl space-y-3">
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
      "id, starts_at, ends_at, headcount, status, jobs!inner(id, business_id, status, categories(name), sites(name, state)), assignments(status)",
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
    <section aria-labelledby="coming-up" className="max-w-5xl space-y-3">
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
                  {formatDayShort(
                    shift.starts_at,
                    zoneOf(shift.jobs.sites?.state),
                  )}
                  , {shiftHours(shift, zoneOf(shift.jobs.sites?.state))}
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
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/business/post">
                  <Plus aria-hidden />
                  Post work
                </Link>
              </Button>
              {canManage(role) ? (
                // Someone off sick, or an extra pair of hands needed now.
                <ActionButton
                  variant="outline"
                  action={startCallout}
                  pendingText="Starting…"
                >
                  <Siren aria-hidden />
                  Post a call-out
                </ActionButton>
              ) : null}
            </div>
          ) : undefined
        }
      />

      {submitted && business?.status === "pending" ? (
        <Alert variant="success" className="max-w-2xl">
          <AlertDescription>
            You&apos;re all signed up. Our team is checking your business now,
            and we&apos;ll email you as soon as you can post work.
          </AlertDescription>
        </Alert>
      ) : null}

      {!business ? (
        <GetStarted business={null} />
      ) : business.status === "draft" ? (
        role === "owner" ? (
          <GetStarted business={business} />
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
            <>
              <Alert variant="info" className="max-w-2xl">
                <AlertDescription>
                  We&apos;re still setting up your account terms. You can post
                  work once that&apos;s done.
                </AlertDescription>
              </Alert>
              {canManage(role) ? <FirstShift businessId={business.id} /> : null}
            </>
          ) : null}
          <TimesheetsToApprove />
          {canPost && canManage(role) ? (
            <PostAgain businessId={business.id} />
          ) : null}
          <UpcomingShifts businessId={business.id} />
        </>
      ) : (
        <>
          <WhatsNext
            className="max-w-2xl"
            title="Your business account"
            status={businessStatuses[business.status]}
            detail={
              business.status === "suspended" ? business.status_reason : null
            }
          />
          {business.status === "pending" && canManage(role) ? (
            <FirstShift businessId={business.id} />
          ) : null}
        </>
      )}
    </div>
  );
}
