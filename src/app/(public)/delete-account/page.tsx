import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Delete your account" };

/**
 * How to delete an account, for people without the app to hand. Google Play
 * asks for a web page like this as well as the button in the app.
 */
export default function DeleteAccountInfoPage() {
  return (
    <LegalPage title="Delete your account">
      <p>
        You can delete your {brand.name} account at any time, in the app or on
        this website:
      </p>
      <ol className="list-decimal space-y-1 pl-6">
        <li>
          <Link href="/login" className="text-primary underline">
            Sign in
          </Link>{" "}
          with the email address on your account.
        </li>
        <li>Open Settings.</li>
        <li>Press &ldquo;Delete my account&rdquo;, and confirm.</li>
      </ol>
      <p>
        Workers with shifts booked cancel them first, and so does a business
        with shifts coming up.
      </p>

      <section aria-labelledby="what-goes" className="space-y-3">
        <h2 id="what-goes" className="text-xl font-semibold">
          What we delete, and what we keep
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Straight away, you&apos;re signed out for good and we stop messaging
            you. We delete your photo, your &ldquo;about me&rdquo;, your
            availability and your phones&apos; notifications.
          </li>
          <li>
            We keep the records the law requires, like shifts, hours, pay and
            invoices, for 7 years. Only our team can see them.
          </li>
          <li>
            If you&apos;re the only owner of a business account, the business
            closes too.
          </li>
        </ul>
      </section>

      <p>
        Can&apos;t sign in? Email{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="text-primary underline"
        >
          {brand.supportEmail}
        </a>{" "}
        from the address on your account, and we&apos;ll delete it for you. More
        about what we keep is in our{" "}
        <Link href="/privacy" className="text-primary underline">
          privacy policy
        </Link>
        .
      </p>
    </LegalPage>
  );
}
