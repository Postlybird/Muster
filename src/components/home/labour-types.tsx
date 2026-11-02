import { HardHat, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PublicIndustry, PublicWorkType } from "@/server/industries";

/**
 * Our core service (owner, 01/11/2026): on-demand labour, fast, general or
 * skilled. The work types are picked by code from the live catalogue, so
 * one an admin turns off drops out by itself, and one still waiting for its
 * pay rates shows once it can be booked.
 */
const KINDS: {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
  codes: string[];
  cta: string;
}[] = [
  {
    key: "general",
    icon: HardHat,
    title: "General labour",
    text: "Extra hands for busy days, big jobs and short notice: reliable people who turn up ready to work.",
    codes: [
      "general_labourer",
      "commercial_cleaner",
      "removalist_offsider",
      "pick_packer",
      "storeperson",
    ],
    cta: "Hire general labour",
  },
  {
    key: "skilled",
    icon: Wrench,
    title: "Skilled labour",
    text: "People with the experience, tickets and licences the job needs, and the ratings to show for it.",
    codes: ["restoration_technician", "builders_cleaner", "forklift_driver"],
    cta: "Hire skilled staff",
  },
];

export function LabourTypes({ industries }: { industries: PublicIndustry[] }) {
  const byCode = new Map<string, PublicWorkType>(
    industries.flatMap((industry) =>
      industry.workTypes
        .filter((workType) => workType.bookable)
        .map((workType) => [workType.code, workType] as const),
    ),
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {KINDS.map((kind) => {
          const workTypes = kind.codes.flatMap(
            (code) => byCode.get(code) ?? [],
          );
          return (
            <section
              key={kind.key}
              aria-labelledby={`labour-${kind.key}`}
              className="flex flex-col rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <kind.icon className="size-6" aria-hidden />
              </span>
              <h3
                id={`labour-${kind.key}`}
                className="mt-4 text-2xl font-bold tracking-tight text-deep"
              >
                {kind.title}
              </h3>
              <p className="mt-2 text-lg text-muted-foreground">{kind.text}</p>
              {workTypes.length > 0 ? (
                <ul
                  aria-label={`${kind.title}: some of the work we cover`}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  {workTypes.map((workType) => (
                    <li
                      key={workType.code}
                      className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-deep"
                    >
                      {workType.name}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-auto pt-6">
                <Button asChild size="lg">
                  <Link href="/register/business">{kind.cta}</Link>
                </Button>
              </div>
            </section>
          );
        })}
      </div>
      <p className="flex items-start gap-3 rounded-2xl bg-success-soft px-5 py-4 font-medium text-deep">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-success"
          aria-hidden
        />
        Before their first shift, we check every worker&apos;s photo ID, right
        to work and tickets, and we employ them, so wages, super and
        workers&apos; compensation are covered.
      </p>
    </div>
  );
}
