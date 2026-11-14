import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms of use" };

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="scroll-mt-20 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The rules for using the website and app. Checked 14/11/2026 against the
 * Australian Consumer Law (unfair terms) and the approved agreements, and
 * approved by the owner (14/11/2026); the company's name and ABN go in once
 * it's registered.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p className="text-sm text-muted-foreground">Last updated 14/11/2026</p>
      <p>
        These terms cover using the {brand.name} website and app. By signing up
        or using them, you agree to these terms and to our{" "}
        <Link href="/privacy" className="text-primary underline">
          privacy policy
        </Link>
        .
      </p>

      <Section id="agreements" title="Your agreement with us">
        <p>
          Workers are employed by us under a casual employment contract, which
          you accept before your first shift. Businesses hire workers from us
          under our labour hire services agreement, which you accept when you
          sign up. If anything in these terms conflicts with your contract or
          agreement, the contract or agreement applies.
        </p>
      </Section>

      <Section id="accounts" title="Your account">
        <ul className="list-disc space-y-1 pl-6">
          <li>Give us true and current details, and keep them up to date.</li>
          <li>
            Keep your email secure: we send sign-in codes there, and anyone who
            can read them can use your account.
          </li>
          <li>
            One account each. Don&apos;t share it or sign in as someone else.
          </li>
          <li>Tell us straight away if you think someone else has used it.</li>
        </ul>
      </Section>

      <Section id="use" title="Using the app properly">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Don&apos;t upload documents that aren&apos;t yours or that
            you&apos;ve changed.
          </li>
          <li>
            Record hours, arrivals and locations honestly. Don&apos;t clock in
            for someone else.
          </li>
          <li>
            Don&apos;t use workers&apos; or businesses&apos; details for
            anything but the work booked through us.
          </li>
          <li>
            Don&apos;t try to break, overload or get around the app&apos;s
            security.
          </li>
        </ul>
        <p>
          We may suspend or close an account that breaks these terms, after
          telling you why unless that would be unsafe or unlawful.
        </p>
      </Section>

      <Section id="uploads" title="What you upload">
        <p>
          You keep ownership of what you upload, like your photo and documents,
          and let us use it to run the service as our privacy policy explains.
          The website and app themselves are ours: please don&apos;t copy them.
        </p>
      </Section>

      <Section id="messages" title="Messages">
        <p>
          We send you the messages you need about your account, shifts, hours
          and pay, by app notification, text or email, and you can turn some
          kinds off in your settings. We only send marketing to people
          who&apos;ve agreed to it, with a way to unsubscribe.
        </p>
      </Section>

      <Section id="service" title="Our service">
        <p>
          We work to keep the app running and accurate, but we can&apos;t
          promise it will always be available or error-free. We may change it,
          and these terms, from time to time; we&apos;ll tell you about
          important changes before they apply. If you don&apos;t agree to a
          change, you can stop using the app and ask us to close your account.
        </p>
      </Section>

      <Section id="liability" title="Responsibility">
        <p>
          Nothing in these terms takes away your rights under the Australian
          Consumer Law or other laws that can&apos;t be excluded. Otherwise, as
          far as the law allows, we aren&apos;t responsible for loss caused by
          the app being unavailable, or by information someone else gave us.
        </p>
      </Section>

      <Section id="law" title="Law and contact">
        <p>
          These terms are governed by the laws of New South Wales. Questions?
          Email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-primary underline"
          >
            {brand.supportEmail}
          </a>{" "}
          or{" "}
          <Link href="/contact" className="text-primary underline">
            contact us
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
