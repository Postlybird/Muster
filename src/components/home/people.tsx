import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The people in the website's pictures of the app (owner, 01/11/2026: no
 * "Example" labels on them). They're illustrative, and the footer says so.
 * A `photo` is a file in public/people/, used only with the rights to it;
 * until one is added, the avatar shows initials.
 */
export type Person = {
  first: string;
  initial: string;
  role: string;
  /** Average stars, to one decimal place. */
  rating: string;
  photo?: string;
  /** Colours for the initials, until there's a photo. */
  tone: string;
};

export const PEOPLE = {
  laura: {
    first: "Laura",
    initial: "M",
    role: "Removalist offsider",
    rating: "5.0",
    tone: "bg-primary text-primary-foreground",
  },
  jack: {
    first: "Jack",
    initial: "T",
    role: "General labourer",
    rating: "4.9",
    tone: "bg-deep text-deep-foreground",
  },
  priya: {
    first: "Priya",
    initial: "S",
    role: "Restoration technician",
    rating: "4.9",
    tone: "bg-highlight-soft text-deep",
  },
  daniel: {
    first: "Daniel",
    initial: "K",
    role: "Builders cleaner",
    rating: "4.8",
    tone: "bg-success-soft text-success",
  },
  mei: {
    first: "Mei",
    initial: "L",
    role: "Commercial cleaner",
    rating: "5.0",
    tone: "bg-primary-soft text-primary",
  },
} satisfies Record<string, Person>;

/** A round photo of the person, or their initials. Decorative: they're named beside it. */
export function PersonAvatar({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  if (person.photo) {
    return (
      <Image
        src={person.photo}
        alt=""
        width={96}
        height={96}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        person.tone,
        className,
      )}
    >
      {person.first[0]}
      {person.initial}
    </span>
  );
}
