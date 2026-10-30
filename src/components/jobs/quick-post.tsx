import { Copy, FileText } from "lucide-react";

import { repeatJob, startFromTemplate } from "@/app/business/post/actions";
import { ActionButton } from "@/components/forms/action-button";
import { zoneOf } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { jobTitle, shiftHours, workersLabel } from "@/lib/job-format";
import { createClient } from "@/lib/supabase/server";

/** How many different past jobs to offer to post again. */
const RECENT_JOBS = 3;

export type PostShortcut = {
  key: string;
  kind: "template" | "repeat";
  title: string;
  detail: string;
  action: () => Promise<ActionState>;
};

/** The business's templates, each a one-tap start. */
export async function templateShortcuts(
  businessId: string,
): Promise<PostShortcut[]> {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("job_templates")
    .select("id, name, jobs(headcount, categories(name), sites(name))")
    .eq("business_id", businessId)
    .is("archived_at", null)
    .order("name");
  return (templates ?? []).map((template) => ({
    key: `template-${template.id}`,
    kind: "template",
    title: template.name,
    detail: [
      jobTitle(template.jobs?.categories?.name, template.jobs?.sites?.name),
      template.jobs ? workersLabel(template.jobs.headcount) : null,
    ]
      .filter(Boolean)
      .join(", "),
    action: startFromTemplate.bind(null, template.id),
  }));
}

/**
 * The business's most recent jobs that differ in work type, site or crew
 * size, each copied in one tap: the business then only picks the dates.
 */
export async function recentJobShortcuts(
  businessId: string,
): Promise<PostShortcut[]> {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, headcount, category_id, site_id, categories(name, active, archived_at), sites(name, state, archived_at), shifts(starts_at, ends_at)",
    )
    .eq("business_id", businessId)
    .neq("status", "draft")
    .order("posted_at", { ascending: false })
    .limit(20);

  const shortcuts: PostShortcut[] = [];
  const seen = new Set<string>();
  for (const job of jobs ?? []) {
    // Only work that can still be posted: the site and work type in use.
    if (job.sites?.archived_at || job.categories?.archived_at) continue;
    if (job.categories && !job.categories.active) continue;
    const same = `${job.category_id}|${job.site_id}|${job.headcount}`;
    if (seen.has(same)) continue;
    seen.add(same);
    const first = [...job.shifts].sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at),
    )[0];
    shortcuts.push({
      key: `repeat-${job.id}`,
      kind: "repeat",
      title: jobTitle(job.categories?.name, job.sites?.name),
      detail: [
        workersLabel(job.headcount),
        first ? shiftHours(first, zoneOf(job.sites?.state)) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      action: repeatJob.bind(null, job.id),
    });
    if (shortcuts.length === RECENT_JOBS) break;
  }
  return shortcuts;
}

/** The shortcuts as a list, each with its one button. */
export function PostShortcutList({ shortcuts }: { shortcuts: PostShortcut[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card shadow-soft">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.kind === "template" ? FileText : Copy;
        return (
          <li
            key={shortcut.key}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Icon
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-semibold">{shortcut.title}</p>
                <p className="text-sm text-muted-foreground">
                  {shortcut.detail}
                </p>
              </div>
            </div>
            <ActionButton action={shortcut.action} size="sm">
              {shortcut.kind === "template" ? "Use" : "Post again"}
              <span className="sr-only"> {shortcut.title}</span>
            </ActionButton>
          </li>
        );
      })}
    </ul>
  );
}
