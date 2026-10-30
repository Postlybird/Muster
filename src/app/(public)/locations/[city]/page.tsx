import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandFeatures } from "@/components/home/brand-features";
import { IndustryCards } from "@/components/industries/industry-cards";
import { Container } from "@/components/layout/container";
import { LocationList } from "@/components/locations/location-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { listIndustries } from "@/server/industries";
import { getLocation, listLocations } from "@/server/locations";

export async function generateMetadata({
  params,
}: PageProps<"/locations/[city]">): Promise<Metadata> {
  const location = await getLocation((await params).city);
  if (!location) return {};
  return {
    title: `Staff in ${location.name}`,
    description: `Checked, job-ready staff in ${location.name} for every industry, booked in minutes. ${brand.tagline}`,
  };
}

export default async function LocationPage({
  params,
}: PageProps<"/locations/[city]">) {
  const location = await getLocation((await params).city);
  if (!location) notFound();
  const [industries, locations] = await Promise.all([
    listIndustries(),
    listLocations(),
  ]);
  const others = locations.filter((other) => other.slug !== location.slug);

  return (
    <main className="flex-1">
      <section aria-labelledby="location-title" className="bg-primary-soft">
        <Container className="space-y-6 py-14 sm:py-20">
          <p className="flex flex-wrap items-center gap-3 font-semibold text-deep">
            <MapPin className="size-5 text-primary" aria-hidden />
            <Link
              href="/locations"
              className="underline-offset-4 hover:underline"
            >
              Locations
            </Link>
            {location.open ? (
              <Badge variant="success">Open now</Badge>
            ) : (
              <Badge variant="neutral">Coming soon</Badge>
            )}
          </p>
          <h1
            id="location-title"
            className="max-w-4xl text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl lg:text-6xl"
          >
            Staff in {location.name} today, not someday.
          </h1>
          <p className="max-w-2xl text-xl text-muted-foreground">
            {location.open
              ? `Checked, job-ready staff for businesses across ${location.name}, in every industry. Post a shift in about a minute, and workers nearby see it straight away.`
              : `We're opening in ${location.stateName} soon. Get set up now and be ready on day one: businesses can open their account and add their sites, and workers can sign up and get checked.`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login?as=business">
                {location.open
                  ? `Hire staff in ${location.name}`
                  : "Get your business ready"}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?as=worker">
                {location.open
                  ? `Find work in ${location.name}`
                  : "Sign up to work"}
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="industries-title"
        className="bg-card py-16 sm:py-20"
      >
        <Container className="space-y-8">
          <h2
            id="industries-title"
            className="text-3xl font-extrabold tracking-tight text-deep sm:text-4xl"
          >
            Staff for every industry in {location.name}
          </h2>
          <IndustryCards industries={industries} />
        </Container>
      </section>

      <BrandFeatures title={`Built for ${location.name} businesses.`} />

      <section aria-labelledby="others-title" className="py-16 sm:py-20">
        <Container className="space-y-8">
          <h2
            id="others-title"
            className="text-3xl font-extrabold tracking-tight text-deep sm:text-4xl"
          >
            Other locations
          </h2>
          <LocationList locations={others} />
        </Container>
      </section>
    </main>
  );
}
