import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ratingSummary } from "@/domain/ratings";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * What a business sees of a worker (brief §4.4): photo, name, rating,
 * reliability, shifts completed and verified ticket names, their badges,
 * the note they sent with an application, and a link to their profile.
 * Never documents, date of birth or visa details.
 */
export function WorkerCard({
  name,
  photoUrl,
  rating,
  ratingCount,
  reliability,
  shiftsCompleted,
  tickets,
  badges,
  note,
  profileHref,
  children,
}: {
  name: string;
  photoUrl: string | null;
  rating: number | null;
  /** How many ratings the average comes from, where known. */
  ratingCount?: number;
  reliability: number | null;
  shiftsCompleted: number;
  tickets?: string[];
  /** Badge labels, from `workerBadges()`. */
  badges?: string[];
  /** Why they're a good fit, in their words. */
  note?: string | null;
  profileHref?: string;
  children?: React.ReactNode;
}) {
  const facts = [
    ratingCount !== undefined
      ? ratingSummary(rating, ratingCount)
      : rating === null
        ? "Not rated yet"
        : `${rating.toFixed(1)} stars`,
    reliability === null ? "New" : `${Math.round(reliability)}% reliable`,
    shiftsCompleted === 0
      ? "No shifts with us yet"
      : shiftsCompleted === 1
        ? "1 shift done"
        : `${shiftsCompleted} shifts done`,
  ];
  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-14">
        {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
        </div>
        {badges && badges.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label={`${name}'s badges`}>
            {badges.map((badge) => (
              <li key={badge}>
                <Badge variant="success">{badge}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {tickets && tickets.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label={`${name}'s tickets`}>
            {tickets.map((ticket) => (
              <li key={ticket}>
                <Badge variant="neutral">{ticket}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {note ? (
          <figure className="rounded-md border-l-4 border-primary/40 bg-muted/50 px-3 py-2 text-sm">
            <figcaption className="text-muted-foreground">
              Why they&apos;re a good fit
            </figcaption>
            <blockquote className="mt-0.5 [overflow-wrap:anywhere]">
              {note}
            </blockquote>
          </figure>
        ) : null}
        {profileHref ? (
          <Link
            href={profileHref}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See {name}&apos;s profile
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
