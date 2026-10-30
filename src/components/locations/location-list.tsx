import { MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { Location } from "@/server/locations";

/** A card per city, open ones first, each linking to its page. */
export function LocationList({
  locations,
  headingLevel = "h3",
}: {
  locations: Location[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const ordered = [...locations].sort(
    (a, b) => Number(b.open) - Number(a.open),
  );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ordered.map((location) => (
        <li
          key={location.slug}
          className="group relative flex items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4 shadow-soft transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
            <Heading className="font-bold text-foreground">
              <Link
                href={`/locations/${location.slug}`}
                className="after:absolute after:inset-0 after:rounded-2xl group-focus-within:after:ring-2 group-focus-within:after:ring-ring focus-visible:outline-none"
              >
                {location.name}
              </Link>
              <span className="block text-sm font-normal text-muted-foreground">
                {location.stateName}
              </span>
            </Heading>
          </div>
          {location.open ? (
            <Badge variant="success">Open now</Badge>
          ) : (
            <Badge variant="neutral">Coming soon</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
