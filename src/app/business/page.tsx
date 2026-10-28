import { Briefcase, Check, Circle, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BUSINESS_STEPS } from "@/domain/business-onboarding";
import { businessStatuses } from "@/lib/statuses";
import {
  businessName,
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

export default async function BusinessDashboardPage({
  searchParams,
}: PageProps<"/business">) {
  const { business, role } = await getMyBusiness();
  const { submitted } = await searchParams;
  const approved = business?.status === "approved";

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
          approved ? (
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
          {!business.account_terms_approved ? (
            <Alert variant="info" className="max-w-2xl">
              <AlertDescription>
                We&apos;re still setting up your account terms. You can post
                work once that&apos;s done.
              </AlertDescription>
            </Alert>
          ) : null}
          <EmptyState
            icon={Briefcase}
            title="No shifts today"
            description="Shifts you post will show here with how many workers are confirmed."
          />
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
