import type { Metadata } from "next";
import Link from "next/link";

import { JobSummary } from "@/components/jobs/job-summary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POST_STEPS } from "@/domain/jobs";
import type { StateCode } from "@/domain/pay";
import { estimateLines } from "@/domain/pricing";
import { dayTypeLabels } from "@/domain/rates";
import { formatCents, formatHours } from "@/lib/format";
import { workersLabel } from "@/lib/job-format";
import {
  draftMissingSteps,
  loadDraft,
  loadJobDetails,
  postingProblem,
} from "@/server/jobs";
import { loadPricing } from "@/server/pricing";
import { getAllSettings } from "@/server/settings";

import { PostStepFrame } from "../frame";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Post work: check and post" };

export default async function ReviewStepPage({
  params,
}: PageProps<"/business/post/[id]/review">) {
  const { id } = await params;
  const { job, business, supabase } = await loadDraft(id);
  const [details, missing, problem] = await Promise.all([
    loadJobDetails(job),
    draftMissingSteps(job),
    postingProblem(business),
  ]);
  const state = details.site?.state as StateCode | undefined;
  const { data: blocked } = state
    ? await supabase.rpc("state_blocked", { p_state: state })
    : { data: false };

  const estimate =
    state && job.category_id && details.shifts.length > 0
      ? (
          await loadPricing({
            businessId: business.id,
            categoryId: job.category_id,
            level: job.level,
            state,
          })
        ).estimate(
          details.shifts.map((shift) => ({
            start: new Date(shift.starts_at),
            end: new Date(shift.ends_at),
            breakMinutes: shift.break_minutes,
            urgent: job.type === "urgent",
          })),
          job.headcount,
        )
      : null;
  const breakdown = estimate?.ok
    ? estimateLines(
        estimate.quotes.map((quote) => quote.cost),
        job.headcount,
      )
    : null;
  const canPost =
    !problem && missing.length === 0 && !blocked && !!estimate?.ok;

  return (
    <PostStepFrame
      jobId={job.id}
      step="review"
      completed={job.steps}
      title="Check and post"
      description="Check the details and the cost, then post. Workers who match are told straight away."
    >
      <div className="space-y-6">
        {problem ? (
          <Alert variant="warning" className="max-w-2xl">
            <AlertDescription className="text-foreground">
              {problem}
            </AlertDescription>
          </Alert>
        ) : null}
        {missing.length > 0 ? (
          <Alert variant="warning" className="max-w-2xl">
            <AlertDescription className="text-foreground">
              Still to do:{" "}
              {missing.map((step, index) => (
                <span key={step}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/business/post/${job.id}/${step}`}
                    className="underline"
                  >
                    {POST_STEPS.find((s) => s.key === step)?.title}
                  </Link>
                </span>
              ))}
              .
            </AlertDescription>
          </Alert>
        ) : null}
        {blocked ? (
          <Alert variant="warning" className="max-w-2xl">
            <AlertDescription className="text-foreground">
              We&apos;re not taking work in {state} yet. Choose a site in a
              state we&apos;re open in, or contact us and we&apos;ll let you
              know as soon as we open in {state}.
            </AlertDescription>
          </Alert>
        ) : null}

        <JobSummary
          job={job}
          details={details}
          changeHref={(step) => `/business/post/${job.id}/${step}`}
        />

        <section
          aria-labelledby="estimate"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="estimate" className="text-lg font-semibold">
            Cost estimate
          </h2>
          {estimate?.ok && breakdown ? (
            <>
              <p className="text-2xl font-bold">
                {formatCents(estimate.totals.totalCents)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  including GST
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCents(estimate.totals.billCents)} plus GST of{" "}
                {formatCents(estimate.totals.gstCents)}, for{" "}
                {workersLabel(job.headcount)} over{" "}
                {details.shifts.length === 1
                  ? "1 shift"
                  : `${details.shifts.length} shifts`}{" "}
                ({formatHours(estimate.totals.paidMinutes)} in all).
              </p>
              <details className="rounded-md border bg-card">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  How we worked this out
                </summary>
                <div className="space-y-2 border-t p-3">
                  <Table label="Estimate by rate" bare>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Per hour</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breakdown.lines.map((line) => (
                        <TableRow key={`${line.type}-${line.kind}`}>
                          <TableCell>
                            {dayTypeLabels[line.type]}
                            {line.kind === "minimum"
                              ? " (minimum engagement)"
                              : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatHours(line.minutes)}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.billRateCents === null
                              ? "Varies"
                              : formatCents(line.billRateCents)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCents(line.billCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {breakdown.urgentBillCents > 0 ? (
                        <TableRow>
                          <TableCell>Urgent call-out loading</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-right">
                            {formatCents(breakdown.urgentBillCents)}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell>Excluding GST</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right">
                          {formatCents(estimate.totals.billCents)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                  <p className="text-sm text-muted-foreground">
                    Weekend, public holiday, night and overtime rates are
                    included. We invoice weekly for the hours actually worked.
                  </p>
                </div>
              </details>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {estimate && !estimate.ok
                ? `We can't price this yet: ${estimate.problem} Contact us and we'll sort it out.`
                : "Add the site, type of work and dates to see the cost."}
            </p>
          )}
        </section>

        {job.type === "urgent" ? (
          <Alert variant="info">
            <AlertDescription>
              As soon as you post, we text and notify every available, qualified
              worker nearby who takes call-outs, and the first to accept is
              booked. If no one has within{" "}
              {(await getAllSettings()).callout_alert_minutes} minutes,
              we&apos;ll tell you, and our team will look too.
            </AlertDescription>
          </Alert>
        ) : null}

        <ReviewForm
          jobId={job.id}
          fillMode={job.fill_mode}
          favouritesFirst={job.favourites_first_minutes}
          urgent={job.type === "urgent"}
          canPost={canPost}
        />
      </div>
    </PostStepFrame>
  );
}
