import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageBand } from "@/components/layout/page-band";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="flex-1">
      <PageBand title="Contact us">
        Questions about work, hiring, pay or invoices? We&apos;re here to help.
      </PageBand>
      <Container className="py-12 sm:py-16">
        <ul className="grid max-w-4xl gap-6 sm:grid-cols-2">
          <li className="space-y-2 rounded-3xl border bg-card p-7 shadow-soft">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Mail className="size-5 text-primary" aria-hidden />
              Email
            </h2>
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-lg [overflow-wrap:anywhere] text-primary underline underline-offset-4 hover:no-underline"
            >
              {brand.supportEmail}
            </a>
          </li>
          {brand.supportPhone ? (
            <li className="space-y-2 rounded-3xl border bg-card p-7 shadow-soft">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Phone className="size-5 text-primary" aria-hidden />
                Phone
              </h2>
              <a
                href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}
                className="text-lg text-primary underline underline-offset-4 hover:no-underline"
              >
                {brand.supportPhone}
              </a>
            </li>
          ) : null}
        </ul>
      </Container>
    </main>
  );
}
