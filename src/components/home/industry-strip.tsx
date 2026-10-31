import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { IndustryIcon } from "@/components/industries/industry-icon";
import type { PublicIndustry } from "@/server/industries";

/** Every industry in one row of links, just under the home page's first screen. */
export function IndustryStrip({
  industries,
  headingId,
}: {
  industries: PublicIndustry[];
  headingId: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <h2
        id={headingId}
        className="shrink-0 text-sm font-semibold tracking-wide text-primary uppercase"
      >
        Staff for every industry
      </h2>
      <ul className="flex flex-wrap gap-2">
        {industries.map((industry) => (
          <li key={industry.code}>
            <Link
              href={`/industries/${industry.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-deep transition-colors hover:border-primary hover:text-primary"
            >
              <IndustryIcon
                name={industry.icon}
                className="size-4 text-primary"
              />
              {industry.name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/industries"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            All industries
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}
