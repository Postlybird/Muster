import type { Metadata } from "next";

import { IndustryCards } from "@/components/industries/industry-cards";
import { Container } from "@/components/layout/container";
import { PageBand } from "@/components/layout/page-band";
import { brand } from "@/config/brand";
import { listIndustries } from "@/server/industries";

export const metadata: Metadata = {
  title: "Industries we cover",
  description: `Checked, job-ready labourers, cleaners, restoration labourers and technicians, and warehouse and removals staff. ${brand.tagline}`,
};

export default async function IndustriesPage() {
  const industries = await listIndustries();
  return (
    <main className="flex-1">
      <PageBand title="Industries we cover">
        Labouring, cleaning, restoration, and warehouses and removals. Choose an
        industry to see the work we cover and the tickets each job needs.
      </PageBand>
      <Container className="py-12 sm:py-16">
        <IndustryCards industries={industries} headingLevel="h2" />
      </Container>
    </main>
  );
}
