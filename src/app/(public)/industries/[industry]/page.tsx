import { ArrowRight, IdCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandFeatures } from "@/components/home/brand-features";
import { IndustryCards } from "@/components/industries/industry-cards";
import { IndustryIcon } from "@/components/industries/industry-icon";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getIndustry, listIndustries } from "@/server/industries";

export async function generateMetadata({
  params,
}: PageProps<"/industries/[industry]">): Promise<Metadata> {
  const industry = await getIndustry((await params).industry);
  if (!industry) return {};
  return {
    title: `${industry.name} staff`,
    description: `${industry.summary} Checked, job-ready staff, booked in minutes. ${brand.tagline}`,
  };
}

export default async function IndustryPage({
  params,
}: PageProps<"/industries/[industry]">) {
  const industry = await getIndustry((await params).industry);
  if (!industry) notFound();
  const others = (await listIndustries()).filter(
    (other) => other.code !== industry.code,
  );
  const lower = industry.name.toLowerCase();

  return (
    <main className="flex-1">
      <section aria-labelledby="industry-title" className="bg-primary-soft">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <p className="flex items-center gap-2 font-semibold text-deep">
              <IndustryIcon
                name={industry.icon}
                className="size-5 text-primary"
              />
              <Link
                href="/industries"
                className="underline-offset-4 hover:underline"
              >
                Industries
              </Link>
            </p>
            <h1
              id="industry-title"
              className="max-w-4xl text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl lg:text-6xl"
            >
              {industry.name} staff, sorted.
            </h1>
            {industry.description ? (
              <p className="max-w-2xl text-xl text-muted-foreground">
                {industry.description}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login?as=business">
                  Hire {lower} staff
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login?as=worker">Find {lower} work</Link>
              </Button>
            </div>
          </div>
          {/* The industry's icon, big, with the logo's orange dot. */}
          <div
            aria-hidden
            className="relative hidden size-72 items-center justify-center rounded-[3rem] bg-card shadow-soft lg:flex"
          >
            <IndustryIcon
              name={industry.icon}
              className="size-32 text-primary"
            />
            <span className="absolute right-10 bottom-10 size-8 rounded-full bg-highlight" />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="work-types-title"
        className="bg-card py-16 sm:py-20"
      >
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <h2
              id="work-types-title"
              className="text-3xl font-extrabold tracking-tight text-deep sm:text-4xl"
            >
              Who you can book
            </h2>
            <p className="text-lg text-muted-foreground">
              Only workers who hold the tickets a job needs can take it, and we
              check every ticket.
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {industry.workTypes.map((workType) => (
              <li
                key={workType.name}
                className="flex flex-col gap-3 rounded-3xl border bg-background p-6"
              >
                <h3 className="text-xl font-bold text-foreground">
                  {workType.name}
                </h3>
                {workType.description ? (
                  <p className="text-muted-foreground">
                    {workType.description}
                  </p>
                ) : null}
                <p className="mt-auto flex items-start gap-2 text-sm font-medium text-foreground">
                  <IdCard
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  {workType.needs.length > 0
                    ? `Needs: ${workType.needs.join(", ")}`
                    : "No tickets needed"}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <BrandFeatures title={`Built for ${lower} shifts.`} />

      {others.length > 0 ? (
        <section aria-labelledby="others-title" className="py-16 sm:py-20">
          <Container className="space-y-8">
            <h2
              id="others-title"
              className="text-3xl font-extrabold tracking-tight text-deep sm:text-4xl"
            >
              Other industries
            </h2>
            <IndustryCards industries={others} />
          </Container>
        </section>
      ) : null}
    </main>
  );
}
