import type { Metadata } from "next";
import Link from "next/link";

import { DraftPage } from "@/components/layout/draft-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy policy" };

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
 * How we handle personal information (brief §4.9: a privacy policy and
 * collection notice at sign-up). Draft wording, for a lawyer to check.
 */
export default function PrivacyPage() {
  return (
    <DraftPage title="Privacy policy">
      <p>
        {brand.name} supplies workers to businesses as a labour hire provider.
        To do that we need some personal information about the people who work
        with us and the businesses we work for. This policy explains what we
        collect, why, who we share it with and how you can see or correct it. We
        follow the Australian Privacy Principles in the Privacy Act 1988.
      </p>

      <Section id="collection-notice" title="Collection notice">
        <p>
          When you sign up, we collect the details you give us so we can check
          you, employ you or work with your business, pay and bill, and meet our
          legal duties. If you don&apos;t give us what we ask for, we may not be
          able to offer you work or post work for you. We share it only as this
          policy describes, and keep it in Australia except as it explains. You
          can ask to see or correct your information, or make a complaint, at
          any time.
        </p>
      </Section>

      <Section id="what-we-collect" title="What we collect">
        <p>From workers:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>your name, date of birth, mobile, email, suburb and photo</li>
          <li>
            your right to work: citizenship evidence, or passport and visa
            details and the results of checks with the Department of Home
            Affairs (VEVO)
          </li>
          <li>
            photo ID and a selfie to confirm who you are. We delete the images
            once they&apos;re checked and keep only the outcome
          </li>
          <li>
            your tickets and licences, and police check results. We delete
            police certificates once checked and keep the outcome, date and
            reference
          </li>
          <li>
            the work you do, your availability, the shifts you take, your hours,
            ratings and reliability, and safety reports
          </li>
          <li>
            where your phone is when you clock in and out, to confirm
            you&apos;re on site
          </li>
        </ul>
        <p>
          Your tax file number, super and bank details go straight to our
          payroll provider. We don&apos;t keep them.
        </p>
        <p>
          From businesses: business and contact details, sites, the people on
          your team, the work you post, the hours you approve, and billing
          records.
        </p>
        <p>
          From everyone: when you sign in, the messages we send you, and your IP
          address when you accept an agreement.
        </p>
      </Section>

      <Section id="why" title="Why we collect it">
        <ul className="list-disc space-y-1 pl-6">
          <li>to check that workers can legally and safely do the work</li>
          <li>to employ workers, match them with work, and pay them</li>
          <li>to supply workers to businesses and bill for the work</li>
          <li>
            to meet our duties under employment, tax, work health and safety and
            labour hire laws
          </li>
          <li>to keep people safe and sort out problems</li>
        </ul>
      </Section>

      <Section id="sharing" title="Who we share it with">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Businesses you&apos;re offered to or work for see your preferred
            name, photo, rating, reliability and the names of your verified
            tickets. They never see your documents, date of birth or visa
            details.
          </li>
          <li>Our payroll provider, to pay you.</li>
          <li>The Department of Home Affairs, for visa checks.</li>
          <li>
            Companies that host our systems and send our texts and emails. Our
            database and files are kept in Australia. Our text and email
            providers may handle your mobile number, email address and the
            messages we send you overseas.
          </li>
          <li>Government agencies, when the law requires it.</li>
        </ul>
        <p>We don&apos;t sell personal information.</p>
      </Section>

      <Section id="security" title="Keeping it safe">
        <p>
          Documents are kept in private storage that only our team can open,
          through links that expire within minutes. We record who looks at or
          changes personal records, and when.
        </p>
      </Section>

      <Section id="how-long" title="How long we keep it">
        <p>
          We keep employment records, such as timesheets, hours and pay rates,
          for 7 years, as the law requires. We delete ID images and police
          certificates once they&apos;re checked.
        </p>
      </Section>

      <Section id="access" title="Seeing, correcting or complaining">
        <p>
          You can see and update most of your details in the app. To ask for a
          copy of your information, correct it, or make a complaint,{" "}
          <Link href="/contact" className="text-primary underline">
            contact us
          </Link>
          . We&apos;ll reply within 30 days. If you&apos;re not happy with our
          answer, you can complain to the Office of the Australian Information
          Commissioner at oaic.gov.au.
        </p>
      </Section>
    </DraftPage>
  );
}
