import { Copy, FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { jobTitle, shiftSummary, workersLabel } from "@/lib/job-format";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { postingProblem } from "@/server/jobs";

import {
  discardDraft,
  removeTemplate,
  repeatJob,
  startFromTemplate,
  startJob,
} from "./actions";

export const metadata: Metadata = { title: "Post work" };

const JOB_SUMMARY =
  "id, headcount, created_at, categories(name), sites(name), shifts(starts_at, ends_at)";

export default async function PostWorkPage() {
  const { business, role } = await getMyBusiness();
  if (!business) redirect("/business");
  if (!canManage(role)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Post work" />
        <p className="text-muted-foreground">
          Owners and managers post work. Ask one of them to post a shift for
          your site.
        </p>
      </div>
    );
  }
  const problem = await postingProblem(business);
  if (problem) {
    return (
      <div className="space-y-6">
        <PageHeader title="Post work" />
        <Alert variant="info" className="max-w-2xl">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: drafts }, { data: last }, { data: templates }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(JOB_SUMMARY)
        .eq("business_id", business.id)
        .eq("status", "draft")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select(JOB_SUMMARY)
        .eq("business_id", business.id)
        .neq("status", "draft")
        .order("posted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_templates")
        .select("id, name, jobs(headcount, categories(name), sites(name))")
        .eq("business_id", business.id)
        .is("archived_at", null)
        .order("name"),
    ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Post work"
        description="Start from a template or your last job to post in under a minute."
      />

      {(drafts ?? []).length > 0 ? (
        <section aria-labelledby="drafts" className="space-y-3">
          <h2 id="drafts" className="text-lg font-semibold">
            Carry on where you left off
          </h2>
          <ul className="space-y-3">
            {(drafts ?? []).map((draft) => (
              <li
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">
                    {jobTitle(draft.categories?.name, draft.sites?.name)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {formatDate(draft.created_at)}
                    {draft.shifts.length > 0
                      ? ` · ${shiftSummary(draft.shifts)}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href={`/business/post/${draft.id}`}>
                      Continue
                      <span className="sr-only">
                        {" "}
                        {jobTitle(draft.categories?.name, draft.sites?.name)}
                      </span>
                    </Link>
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm">
                        Discard
                      </Button>
                    }
                    title="Discard this draft?"
                    description="It hasn't been posted, so no workers have seen it."
                    confirmLabel="Discard"
                    action={discardDraft.bind(null, draft.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="start" className="space-y-3">
        <h2 id="start" className="text-lg font-semibold">
          Start a job
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {last ? (
            <div className="space-y-3 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <Copy className="size-5 text-primary" aria-hidden />
                <h3 className="font-semibold">Repeat your last job</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {jobTitle(last.categories?.name, last.sites?.name)},{" "}
                {workersLabel(last.headcount)}. You choose the dates.
              </p>
              <ActionButton action={repeatJob.bind(null, last.id)}>
                Repeat it
              </ActionButton>
            </div>
          ) : null}
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-primary" aria-hidden />
              <h3 className="font-semibold">A new job</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Five short steps: what and where, when, tickets and instructions,
              safety, then check the cost and post.
            </p>
            <ActionButton
              action={startJob}
              variant={last ? "outline" : "default"}
            >
              Start
            </ActionButton>
          </div>
        </div>
      </section>

      {(templates ?? []).length > 0 ? (
        <section aria-labelledby="templates" className="space-y-3">
          <h2 id="templates" className="text-lg font-semibold">
            Your templates
          </h2>
          <ul className="space-y-3">
            {(templates ?? []).map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {jobTitle(
                        template.jobs?.categories?.name,
                        template.jobs?.sites?.name,
                      )}
                      {template.jobs
                        ? `, ${workersLabel(template.jobs.headcount)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    size="sm"
                    action={startFromTemplate.bind(null, template.id)}
                  >
                    Use
                    <span className="sr-only"> {template.name}</span>
                  </ActionButton>
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm">
                        Remove
                        <span className="sr-only"> {template.name}</span>
                      </Button>
                    }
                    title={`Remove the "${template.name}" template?`}
                    description="Jobs already posted from it aren't affected."
                    confirmLabel="Remove"
                    action={removeTemplate.bind(null, template.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
