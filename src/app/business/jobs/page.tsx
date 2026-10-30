import { Briefcase, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { zoneOf } from "@/lib/format";
import { jobTitle, shiftSummary, workersLabel } from "@/lib/job-format";
import { jobStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";

export const metadata: Metadata = { title: "Jobs" };

type JobListItem = {
  id: string;
  status: keyof typeof jobStatuses;
  headcount: number;
  categories: { name: string } | null;
  sites: { name: string; state: string } | null;
  shifts: { starts_at: string; ends_at: string }[];
};

function JobList({ jobs }: { jobs: JobListItem[] }) {
  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link
            href={`/business/jobs/${job.id}`}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50"
          >
            <div className="space-y-1">
              <p className="font-medium">
                {jobTitle(job.categories?.name, job.sites?.name)}
              </p>
              <p className="text-sm text-muted-foreground">
                {shiftSummary(job.shifts, zoneOf(job.sites?.state))} ·{" "}
                {workersLabel(job.headcount)}
              </p>
            </div>
            <StatusBadge status={jobStatuses[job.status]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function JobsPage() {
  const { business, role } = await getMyBusiness();
  const supabase = await createClient();
  const { data } = business
    ? await supabase
        .from("jobs")
        .select(
          "id, status, headcount, categories(name), sites(name, state), shifts(starts_at, ends_at)",
        )
        .eq("business_id", business.id)
        .neq("status", "draft")
        .is("archived_at", null)
        .order("posted_at", { ascending: false })
    : { data: [] };
  const now = new Date().toISOString();
  const jobs = (data ?? []) as JobListItem[];
  const lastEnd = (job: JobListItem) =>
    job.shifts.reduce(
      (latest, s) => (s.ends_at > latest ? s.ends_at : latest),
      "",
    );
  const firstStart = (job: JobListItem) =>
    job.shifts.reduce(
      (earliest, s) =>
        !earliest || s.starts_at < earliest ? s.starts_at : earliest,
      "",
    );
  const upcoming = jobs
    .filter((job) => job.status === "posted" && lastEnd(job) > now)
    .sort((a, b) => firstStart(a).localeCompare(firstStart(b)));
  const past = jobs.filter((job) => !upcoming.includes(job));

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Jobs"
        description="Work you've posted: who's applied, who's booked and how it went."
        actions={
          canManage(role) ? (
            <Button asChild>
              <Link href="/business/post">
                <Plus aria-hidden />
                Post work
              </Link>
            </Button>
          ) : undefined
        }
      />
      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description={
            canManage(role)
              ? "Post work and it shows here."
              : "Jobs at your sites show here once they're posted."
          }
        />
      ) : null}
      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming" className="space-y-3">
          <h2 id="upcoming" className="text-lg font-semibold">
            Coming up
          </h2>
          <JobList jobs={upcoming} />
        </section>
      ) : null}
      {past.length > 0 ? (
        <section aria-labelledby="past" className="space-y-3">
          <h2 id="past" className="text-lg font-semibold">
            Past and cancelled
          </h2>
          <JobList jobs={past} />
        </section>
      ) : null}
    </div>
  );
}
