import { BadgeCheck, CircleCheck, Star } from "lucide-react";

import { brand } from "@/config/brand";
import { WORKER_TAGS, type WorkerTag } from "@/domain/ratings";
import { cn } from "@/lib/utils";

import { PEOPLE, PersonAvatar, type Person } from "./people";

const TAGS: [WorkerTag, number][] = [
  ["punctual", 12],
  ["hard_working", 9],
  ["would_rehire", 8],
];

/** A worker's profile as businesses see it: stars, reliability, tags, checks and their note. */
function ProfileCard({ person }: { person: Person }) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-soft @sm:p-5">
      <div className="flex items-center gap-3">
        <PersonAvatar
          person={person}
          className="size-12 text-base @xl:size-14"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-bold text-deep">
            {person.first} {person.initial}.
            <BadgeCheck className="size-5 text-primary" aria-hidden />
          </p>
          <p className="text-sm text-muted-foreground">{person.role}</p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-1 font-bold text-deep">
          <Star className="size-4 fill-current text-highlight" aria-hidden />
          {person.rating}
        </span>
        <span className="text-muted-foreground">18 ratings</span>
        <span className="font-semibold text-success">98% reliable</span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {TAGS.map(([tag, count], index) => (
          <li
            key={tag}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium text-deep",
              index === 2 && "hidden @sm:block",
            )}
          >
            {WORKER_TAGS[tag]} × {count}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
        {[
          ["42", "shifts done"],
          ["3 yrs", "experience"],
          ["Checked", "licence"],
        ].map(([value, label]) => (
          <p key={label} className="text-xs text-muted-foreground">
            <span className="block text-base font-bold text-deep">{value}</span>
            {label}
          </p>
        ))}
      </div>
      <p className="mt-3 hidden rounded-xl bg-muted/70 px-3 py-2 text-sm text-foreground @sm:block">
        &ldquo;Three years with removalists around Sydney. Careful with
        furniture, and happy to start early.&rdquo;
      </p>
    </div>
  );
}

/** Workers ready for a shift: photo or initials, first name, work and stars. */
function ReadyList({
  people,
  className,
}: {
  people: Person[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2 @xl:grid-cols-1 @xl:gap-3",
        className,
      )}
    >
      {people.map((person) => (
        <li
          key={person.first}
          className="flex items-center gap-2.5 rounded-2xl bg-card p-2 pr-3 shadow-soft"
        >
          <PersonAvatar
            person={person}
            className="size-9 text-xs @xl:size-11 @xl:text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-deep @xl:text-base">
              {person.first}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {person.role}
            </p>
          </div>
          <span className="ml-auto hidden items-center gap-1 text-sm font-bold text-deep @xl:flex">
            <Star
              className="size-3.5 fill-current text-highlight"
              aria-hidden
            />
            {person.rating}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The home page's picture of the app: workers ready to book, one of them's
 * profile, and a booking going through, on the brand's blue curve. The
 * people are illustrative (the footer says so); it's one image to screen
 * readers. It lays itself out by its own width, so it fits a narrow column
 * (sign-in) as well as the home page's.
 */
export function HeroVisual({ className }: { className?: string }) {
  const { laura, jack, priya, daniel, mei } = PEOPLE;
  return (
    <div
      role="img"
      aria-label={`Workers ready to book in ${brand.name}, and a worker's profile with their stars, reliability, tags and checks.`}
      className={cn("@container relative isolate pb-6", className)}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 bottom-6 -z-10 overflow-hidden rounded-[2rem] bg-primary-soft"
      >
        <div className="absolute -top-1/3 -right-1/4 aspect-square w-[90%] rounded-full bg-primary @xl:w-[75%]" />
      </div>
      <div className="grid gap-3 p-3 @md:p-5 @xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @xl:items-center @xl:gap-5 @xl:p-7">
        <ReadyList
          people={[jack, priya, daniel, mei]}
          className="@xl:order-2"
        />
        <ProfileCard person={laura} />
      </div>
      <p className="absolute bottom-0 left-1/2 flex w-max max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-2xl bg-deep px-4 py-2.5 text-sm font-semibold text-deep-foreground shadow-soft @xl:left-7 @xl:translate-x-0">
        <CircleCheck className="size-5 shrink-0 text-highlight" aria-hidden />
        {laura.first} is booked for Saturday, 7:00 am
      </p>
    </div>
  );
}
