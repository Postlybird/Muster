import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageBand } from "@/components/layout/page-band";
import { LocationList } from "@/components/locations/location-list";
import { brand } from "@/config/brand";
import { listLocations } from "@/server/locations";

export const metadata: Metadata = {
  title: "Staff Australia-wide",
  description: `On-demand staff for every industry, across Australia. ${brand.tagline}`,
};

export default async function LocationsPage() {
  const locations = await listLocations();
  return (
    <main className="flex-1">
      <PageBand title="Staff Australia-wide">
        We&apos;re opening across the country, state by state. Where we&apos;re
        not open yet, you can still sign up now and be ready on day one.
      </PageBand>
      <Container className="py-12 sm:py-16">
        <LocationList locations={locations} headingLevel="h2" />
      </Container>
    </main>
  );
}
