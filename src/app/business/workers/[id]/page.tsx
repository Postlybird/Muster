import { ArrowLeft, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { initials } from "@/components/layout/user-summary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ratingSummary, WORKER_TAGS, type WorkerTag } from "@/domain/ratings";
import { workerBadges } from "@/domain/worker-badges";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { workerPhotoLinks } from "@/server/worker-photos";

import { addFavourite, removeFavourite } from "../actions";

export const metadata: Metadata = { title: "Worker profile" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type TagCount = { tag: string; count: number };
type WorkType = { name: string; level: number; years: number; shifts: number };

function yearsLabel(years: number): string {
  if (years === 0) return "less than a year's experience";
  if (years >= 10) return "10 or more years' experience";
  return years === 1 ? "1 year's experience" : `${years} years' experience`;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-xl border bg-card p-5"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A worker's profile, for a business they've applied to or worked for
 * (owner's go-ahead, 31/10/2026): what other businesses say, their
 * experience, the checks we've done and their history with this business.
 * Never documents, date of birth, visa or contact details.
 */
export default async function WorkerProfilePage({
  params,
  searchParams,
}: PageProps<"/business/workers/[id]">) {
  const { id } = await params;
  const { job } = await searchParams;
  if (!UUID.test(id)) notFound();
  const jobId = typeof job === "string" && UUID.test(job) ? job : null;
  const supabase = await createClient();
  const { data: worker } = await supabase
    .rpc("business_worker_profile", { p_worker_id: id })
    .maybeSingle();
  if (!worker) notFound();

  const [{ role }, photos, applicants] = await Promise.all([
    getMyBusiness(),
    workerPhotoLinks([worker.photo_path]),
    jobId
      ? supabase.rpc("job_applicants", { p_job_id: jobId })
      : Promise.resolve({ data: null }),
  ]);
  // Their note, if they're applying for the job this was opened from.
  const note = applicants.data?.find((a) => a.worker_id === id)?.note ?? null;
  const photoUrl = worker.photo_path
    ? (photos.get(worker.photo_path) ?? null)
    : null;
  const rating = worker.rating === null ? null : Number(worker.rating);
  const reliability =
    worker.reliability === null ? null : Number(worker.reliability);
  const tags = (worker.tags as unknown as TagCount[]).filter(
    (t) => t.tag in WORKER_TAGS,
  );
  const workTypes = worker.work_types as unknown as WorkType[];
  const badges = workerBadges({
    rating,
    ratingCount: worker.rating_count,
    reliability,
    shiftsCompleted: worker.shifts_completed,
    shiftsHere: worker.shifts_here,
    favourite: worker.favourite,
  });
  const checks = [
    worker.id_checked ? "Photo ID checked against their selfie" : null,
    worker.right_to_work_checked ? "Right to work in Australia checked" : null,
    worker.photo_path ? "Profile photo checked" : null,
    worker.police_checked ? "Police check" : null,
  ].filter((check): check is string => check !== null);
  const back = jobId
    ? { href: `/business/jobs/${jobId}`, label: "Back to the job" }
    : { href: "/business/workers", label: "Workers" };

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {back.label}
      </Link>

      <div className="flex items-start gap-4">
        <Avatar className="size-20">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback>{initials(worker.display_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {worker.display_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              ratingSummary(rating, worker.rating_count),
              reliability === null
                ? "New"
                : `${Math.round(reliability)}% reliable`,
              worker.shifts_completed === 1
                ? "1 shift done"
                : `${worker.shifts_completed} shifts done`,
              worker.member_since
                ? `With Shifta since ${formatDate(worker.member_since)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {badges.length > 0 ? (
            <ul
              className="flex flex-wrap gap-1"
              aria-label={`${worker.display_name}'s badges`}
            >
              {badges.map((badge) => (
                <li key={badge.key}>
                  <Badge variant="success">{badge.label}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {note ? (
        <Section id="note" title="Why they're a good fit for this job">
          <blockquote className="border-l-4 border-primary/40 pl-3 [overflow-wrap:anywhere]">
            {note}
          </blockquote>
        </Section>
      ) : null}

      <Section id="about" title="About them">
        <p className="[overflow-wrap:anywhere]">
          {worker.bio ?? (
            <span className="text-muted-foreground">
              They haven&apos;t written anything about themselves yet.
            </span>
          )}
        </p>
      </Section>

      <Section id="ratings" title="What businesses say">
        <p className="text-sm text-muted-foreground">
          {ratingSummary(rating, worker.rating_count)}.
          {reliability === null
            ? ""
            : ` Reliability ${Math.round(reliability)}%: how often they turn up as booked, over their recent shifts.`}
        </p>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Tags from ratings">
            {tags.map((t) => (
              <li key={t.tag}>
                <Badge variant="neutral">
                  {WORKER_TAGS[t.tag as WorkerTag]} × {t.count}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {badges.length > 0 ? (
          <dl className="space-y-1 text-sm">
            {badges.map((badge) => (
              <div key={badge.key}>
                <dt className="inline font-medium">{badge.label}: </dt>
                <dd className="inline text-muted-foreground">
                  {badge.description}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Section>

      <Section id="experience" title="Experience">
        {workTypes.length > 0 ? (
          <ul className="space-y-2">
            {workTypes.map((work) => (
              <li key={work.name}>
                <p className="font-medium">{work.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    yearsLabel(work.years),
                    `level ${work.level}`,
                    work.shifts === 1
                      ? "1 shift on Shifta"
                      : `${work.shifts} shifts on Shifta`,
                  ].join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Years of experience are what they told us. Our team sets each level
          after checking their experience: the higher the level, the more
          skilled the work they can take.
        </p>
      </Section>

      <Section id="checks" title="Checked by Shifta">
        <ul className="space-y-1">
          {checks.map((check) => (
            <li key={check} className="flex items-center gap-2">
              <CircleCheck
                className="size-4 shrink-0 text-success"
                aria-hidden
              />
              {check}
            </li>
          ))}
        </ul>
        {worker.tickets.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Tickets we&apos;ve checked</p>
            <ul
              className="flex flex-wrap gap-1"
              aria-label={`${worker.display_name}'s tickets`}
            >
              {worker.tickets.map((ticket) => (
                <li key={ticket}>
                  <Badge variant="neutral">{ticket}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section id="with-you" title="With you">
        <p>
          {worker.shifts_here === 0 || !worker.last_worked_at
            ? "No shifts with you yet."
            : `${worker.shifts_here === 1 ? "1 shift" : `${worker.shifts_here} shifts`} with you, the last on ${formatDate(worker.last_worked_at)}.`}
          {worker.our_rating_count > 0 && worker.our_rating !== null
            ? ` You've rated them ${Number(worker.our_rating).toFixed(1)} stars on average.`
            : ""}
        </p>
        {worker.blocked ? (
          <p className="text-sm text-muted-foreground">
            You&apos;ve asked us not to offer them your work. You can change
            that on the{" "}
            <Link href="/business/workers" className="text-primary underline">
              Workers page
            </Link>
            .
          </p>
        ) : canManage(role) ? (
          <ActionButton
            variant="outline"
            action={(worker.favourite ? removeFavourite : addFavourite).bind(
              null,
              worker.worker_id,
            )}
            pendingText="Saving…"
          >
            {worker.favourite ? "Remove from favourites" : "Add to favourites"}
          </ActionButton>
        ) : null}
      </Section>
    </div>
  );
}
