import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageBand } from "@/components/layout/page-band";

import { brand } from "@/config/brand";
import { getAllSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Questions and answers" };

type Question = { id: string; question: string; answer: React.ReactNode };

function Questions({
  id,
  title,
  questions,
}: {
  id: string;
  title: string;
  questions: Question[];
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-2">
        {questions.map((item) => (
          <details
            key={item.id}
            id={item.id}
            className="group scroll-mt-20 rounded-lg border bg-card"
          >
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 font-medium">
              {item.question}
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-2 px-4 pb-4 text-muted-foreground">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * Questions workers and businesses ask (brief §7), with today's settings
 * (only those marked public) so the numbers stay right.
 */
export default async function FaqPage() {
  const settings = await getAllSettings();
  const workers: Question[] = [
    {
      id: "employer",
      question: "Who employs me?",
      answer: (
        <p>
          We do. You work as our casual employee, so we pay your wages, super
          and workers&apos; compensation insurance. The business you&apos;re
          sent to directs the work on site.
        </p>
      ),
    },
    {
      id: "sign-up",
      question: "How do I sign up?",
      answer: (
        <p>
          Sign up with your email address, then add your mobile number,
          details, right to work, photo ID, the work you do and your tickets.
          It takes about five
          minutes on your phone. We check everything and text you when
          you&apos;re ready to work. You need to be at least{" "}
          {settings.min_worker_age}.
        </p>
      ),
    },
    {
      id: "documents",
      question: "What do I need?",
      answer: (
        <>
          <p>
            Photo ID (a driver licence or passport) and proof of your right to
            work: an Australian passport or birth or citizenship certificate, or
            your visa details so we can check them with the Department of Home
            Affairs.
          </p>
          <p>
            Add the tickets your work needs, like an RSA, a White Card or a
            forklift licence. Some jobs also need a National Police Check no
            older than {settings.police_check_max_age_months} months.
          </p>
        </>
      ),
    },
    {
      id: "abn",
      question: "Do I need an ABN?",
      answer: (
        <p>
          No. You&apos;re an employee, not a contractor. You give your tax file
          number, super and bank details to our payroll provider when you start;
          we never keep them ourselves.
        </p>
      ),
    },
    {
      id: "pay",
      question: "How much am I paid, and when?",
      answer: (
        <p>
          Every shift shows its hourly pay before you accept, with higher rates
          for weekends, public holidays, nights and overtime. Pay rates are
          based on the award and checked by a payroll professional. We pay
          weekly for the hours approved the week before.
        </p>
      ),
    },
    {
      id: "shifts",
      question: "How do shifts work?",
      answer: (
        <p>
          You see work that suits your tickets, where you live and when
          you&apos;re free, with the suburb, pay, hazards and protective gear
          before you accept. Some businesses pick from the people who apply;
          others take the first people to accept. Once you&apos;re booked you
          see the address and who to report to, and we remind you the day before
          and two hours before.
        </p>
      ),
    },
    {
      id: "cancelling",
      question: "What if I can't make a shift?",
      answer: (
        <p>
          Cancel in the app as early as you can, so we can find someone else.
          Cancelling within {settings.worker_late_cancel_hours} hours of the
          start, or not turning up, lowers your reliability score.{" "}
          {settings.no_show_suspend_count} no-shows within{" "}
          {settings.no_show_window_days} days puts your account on hold while we
          talk it through with you.
        </p>
      ),
    },
    {
      id: "clocking-in",
      question: "How do I clock in?",
      answer: (
        <p>
          On your phone, at the site: we check you&apos;re within{" "}
          {settings.geofence_radius_m} metres. No signal? It&apos;s saved and
          sent when you&apos;re back online.
        </p>
      ),
    },
    {
      id: "safety",
      question: "What if something's unsafe?",
      answer: (
        <p>
          Every job lists its hazards and the protective gear you need before
          you accept. If something on site is unsafe, tap &ldquo;Report a safety
          issue&rdquo; on the shift screen. It reaches our team straight away.
        </p>
      ),
    },
  ];

  const businesses: Question[] = [
    {
      id: "how-it-works",
      question: "How does it work?",
      answer: (
        <p>
          We&apos;re a labour hire provider. The workers are our employees and
          we supply them to you. You direct the work on site; we look after pay,
          super, workers&apos; compensation, tax and the checks.
        </p>
      ),
    },
    {
      id: "who-can-sign-up",
      question: "Who can sign up?",
      answer: (
        <p>
          Australian businesses with an active ABN. We look up your ABN, you add
          your sites and accept our services agreement, and we check your
          details before you post work.
        </p>
      ),
    },
    {
      id: "cost",
      question: "What does it cost?",
      answer: (
        <p>
          An hourly rate for each worker, shown with GST before you post. It
          covers the worker&apos;s pay, super, workers&apos; compensation,
          payroll tax, insurance and our fee. Weekends, public holidays, nights
          and overtime cost more, and so do urgent call-outs.
        </p>
      ),
    },
    {
      id: "checks",
      question: "How do you check workers?",
      answer: (
        <p>
          We check photo ID, right to work (including visa checks with the
          Department of Home Affairs), tickets and, when a job needs one, a
          police check. We watch expiry dates and take people off work their
          tickets no longer cover.
        </p>
      ),
    },
    {
      id: "speed",
      question: "How quickly can I get people?",
      answer: (
        <p>
          You can post work in under a minute, using your saved sites, a
          template or your last job. Urgent call-outs go to every qualified
          worker nearby straight away.
        </p>
      ),
    },
    {
      id: "choosing",
      question: "Can I choose who works for me?",
      answer: (
        <p>
          Yes. Pick from the people who apply, or let the first qualified
          workers book. Add people you like to your favourites to offer them
          work first, and block anyone you don&apos;t want back.
        </p>
      ),
    },
    {
      id: "business-safety",
      question: "Who looks after safety?",
      answer: (
        <p>
          We both do. Before you post, you tell us the hazards on site, the
          controls in place and the protective gear needed, so workers know
          before they accept. You keep the workplace safe and give a site
          induction; as the employer we check workers&apos; tickets and act on
          safety reports straight away.
        </p>
      ),
    },
    {
      id: "business-cancelling",
      question: "What if I need to cancel?",
      answer: (
        <p>
          Cancel in the app and we tell the workers. Cancelling within{" "}
          {settings.business_late_cancel_hours} hours of the start is charged at{" "}
          {settings.business_late_cancel_charge_hours} hours for each booked
          worker. If a worker has already arrived, they&apos;re paid at least
          the minimum hours for that kind of work.
        </p>
      ),
    },
    {
      id: "timesheets",
      question: "How do timesheets and invoices work?",
      answer: (
        <p>
          Workers clock in and out on their phones. You approve the hours, or
          query them, within {settings.auto_approve_hours} hours; after that
          they&apos;re approved automatically. Each week we send one invoice for
          the hours approved, with a line for each worker and shift.
        </p>
      ),
    },
  ];

  return (
    <main className="flex-1">
      <PageBand title="Questions and answers">
        About working with {brand.name} and hiring through us. Can&apos;t find
        what you need?{" "}
        <Link href="/contact" className="text-primary underline">
          Contact us
        </Link>
        .
      </PageBand>
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-2">
        <Questions id="workers" title="Working with us" questions={workers} />
        <Questions
          id="businesses"
          title="Hiring workers"
          questions={businesses}
        />
      </Container>
    </main>
  );
}
