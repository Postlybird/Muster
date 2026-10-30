import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { PublicIndustry } from "@/server/industries";

import { IndustryIcon } from "./industry-icon";

/**
 * A card for each industry, linking to its page. The whole card is the
 * link's target; its name is the industry's.
 */
export function IndustryCards({
  industries,
  headingLevel = "h3",
}: {
  industries: PublicIndustry[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {industries.map((industry) => {
        return (
          <li
            key={industry.code}
            className="group relative flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-md"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <IndustryIcon name={industry.icon} className="size-6" />
            </span>
            <div className="space-y-2">
              <Heading className="text-xl font-bold text-foreground">
                <Link
                  href={`/industries/${industry.slug}`}
                  className="after:absolute after:inset-0 after:rounded-3xl group-focus-within:after:ring-2 group-focus-within:after:ring-ring focus-visible:outline-none"
                >
                  {industry.name}
                </Link>
              </Heading>
              <p className="text-muted-foreground">{industry.summary}</p>
            </div>
            <p className="mt-auto inline-flex items-center gap-1.5 font-semibold text-primary">
              {industry.workTypes.length}{" "}
              {industry.workTypes.length === 1
                ? "type of work"
                : "types of work"}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </p>
          </li>
        );
      })}
    </ul>
  );
}
