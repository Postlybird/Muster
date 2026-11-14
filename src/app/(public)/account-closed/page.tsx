import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false },
};

/** Where Delete my account ends up, and where a closed account's sign-in is sent. */
export default function AccountClosedPage() {
  return (
    <LegalPage title="Your account is deleted">
      <p>
        You&apos;re signed out, and we won&apos;t send you any more messages.
        We&apos;ve deleted your photo, availability and notifications, and we
        keep only the records the law requires, like shifts, hours, pay and
        invoices, for 7 years.
      </p>
      <p>
        Thanks for working with {brand.name}. To come back, or if you have a
        question, email{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="text-primary underline"
        >
          {brand.supportEmail}
        </a>
        .
      </p>
      <p>
        <Link href="/" className="text-primary underline">
          Go to the home page
        </Link>
      </p>
    </LegalPage>
  );
}
