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

const EMAIL = (
  <a href={`mailto:${brand.supportEmail}`} className="text-primary underline">
    {brand.supportEmail}
  </a>
);

/**
 * How we handle personal information (brief §4.9: a privacy policy and
 * collection notice at sign-up). Checked against the Australian Privacy
 * Principles (14/11/2026), including APP 1's rule on decisions made by
 * computer programs, from 10/12/2026. The collection notice section says
 * what the `privacy_collection_notice` agreement says. Draft wording, for
 * the owner to approve.
 */
export default function PrivacyPage() {
  return (
    <DraftPage title="Privacy policy">
      <p>
        {brand.name} supplies workers to businesses as a labour hire provider:
        workers are our casual employees. To do that we need some personal
        information about the people who work with us and the businesses we work
        for. This policy explains what we collect, why, where it comes from, who
        we share it with, the decisions our app makes with it, and how you can
        see or correct it. We follow the Australian Privacy Principles in the
        Privacy Act 1988. Contact us about your information at {EMAIL}.
      </p>

      <Section id="collection-notice" title="Collection notice">
        <p>When you sign up with us as a worker:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            We collect your contact details, date of birth, suburb and photo,
            your right to work, photo ID and a selfie, your tickets and
            licences, police check results (only with your consent, where the
            work needs them), your shifts, hours, ratings and reliability, and
            where your phone is when you clock in and out. The sections below
            explain each.
          </li>
          <li>
            We use it to check you can legally and safely do the work, to employ
            you and offer you shifts, and to pay you. The law requires us to
            check your right to work and to keep records of your hours and pay.
          </li>
          <li>
            We also get information about you from the Department of Home
            Affairs (visa checks), police check providers, and businesses you
            work for (ratings, hours and reports).
          </li>
          <li>
            If you don&apos;t give us your identity, right to work and the
            tickets the work needs, we can&apos;t employ you or offer you that
            work.
          </li>
          <li>
            Businesses you&apos;re offered to or work for see your preferred
            name, photo, rating, reliability and verified tickets, never your
            documents. Some service providers handle your details overseas,
            mainly in the United States.
          </li>
          <li>
            Our app decides which shifts you&apos;re offered, and puts your
            account on hold after two no-shows within 30 days until our team
            reviews it (see{" "}
            <a href="#decisions" className="text-primary underline">
              Decisions our app makes
            </a>
            ).
          </li>
          <li>
            You can ask to see or correct your information, or make a complaint,
            at any time.
          </li>
        </ul>
        <p>
          Businesses: we collect your business and contact details to check your
          business, supply workers and bill you.
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
            photo ID and a selfie, which our team checks to confirm who you are.
            We delete the images once they&apos;re checked and keep only the
            outcome
          </li>
          <li>
            your tickets and licences, and police check results only with your
            consent and where the work needs them. We delete police certificates
            once checked and keep the outcome, date and reference
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

      <Section id="where-from" title="Where we get it">
        <p>
          Mostly from you. We also get visa details from the Department of Home
          Affairs, police check results from the provider that runs the check,
          business details from the Australian Business Register, and ratings,
          hours and safety reports from the businesses workers work for.
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
        <p>
          Some of it the law requires: checking a worker&apos;s right to work
          (Migration Act 1958), and keeping records of hours and pay (Fair Work
          Act 2009).
        </p>
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
            Companies that host our systems and provide our email, texts,
            address search, the bot check when you sign in, and app
            notifications. Our database and files are kept in Australia. These
            providers may handle your contact details, the messages we send you,
            addresses you search for and details of your device overseas, mainly
            in the United States.
          </li>
          <li>Government agencies, when the law requires it.</li>
        </ul>
        <p>We don&apos;t sell personal information.</p>
      </Section>

      <Section id="decisions" title="Decisions our app makes">
        <p>
          Our app uses computer programs to make some decisions that affect
          workers:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Which open shifts a worker is offered and can take, from their work
            types, tickets and licences, right to work, home suburb and travel
            distance, availability, other bookings, reliability, and whether a
            business has blocked them. For first-in shifts and call-outs, the
            first eligible worker to accept is booked.
          </li>
          <li>
            Putting a worker&apos;s account on hold after two no-shows within 30
            days, until our team reviews it.
          </li>
          <li>
            Approving hours a business hasn&apos;t approved or queried within 48
            hours, and working out pay from the rates and hours.
          </li>
          <li>
            The order in which workers are offered a shift: the business&apos;s
            favourites first, then past shifts with that business, rating,
            reliability, distance and experience. Where a business picks from
            applicants, it still chooses who to book.
          </li>
        </ul>
        <p>
          If you think one of these decisions is wrong, ask us and someone from
          our team will review it.
        </p>
      </Section>

      <Section id="security" title="Keeping it safe">
        <p>
          Documents are kept in private storage that only our team can open,
          through links that expire within minutes. We record who looks at or
          changes personal records, and when. If a data breach is likely to
          cause you serious harm, we&apos;ll tell you and the Office of the
          Australian Information Commissioner.
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
          copy of your information, correct it, or make a complaint, email{" "}
          {EMAIL} or{" "}
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
