import { CircleCheck, HandCoins, LifeBuoy, Mail } from "lucide-react";
import Link from "next/link";

import { CalloutPhone, calloutSteps } from "@/components/home/callout-visual";
import { DashboardFeatures } from "@/components/home/dashboard-features";
import { HeroVisual } from "@/components/home/hero-visual";
import { HowItWorks } from "@/components/home/how-it-works";
import { IndustryStrip } from "@/components/home/industry-strip";
import { LabourTypes } from "@/components/home/labour-types";
import { WhyShifta } from "@/components/home/why-shifta";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { listIndustries } from "@/server/industries";
import { standardWeekdayPay } from "@/server/pricing";
import { getAllSettings } from "@/server/settings";

const HERO_POINTS = [
  "General and skilled labour",
  "ID, right to work and tickets checked",
  "No lock-in contracts",
  "Workers paid every week",
];

/** "a, b and c", for the work types in the first answer. */
function andList(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** What businesses ask first, with the work they can book from the live catalogue. */
const quickAnswers = (bookable: string[]) => [
  {
    question: "What kind of staff can I get?",
    answer:
      bookable.length > 0
        ? `General and skilled staff for a single shift or a busy season: ${andList(bookable.map((name) => name.toLowerCase()))}.`
        : "General and skilled staff for a single shift or a busy season.",
  },
  {
    question: "How quickly can I get someone?",
    answer:
      "Your shift goes to matching workers as soon as you post it. Choose who comes, or let the first qualified worker book.",
  },
  {
    question: "How much does it cost?",
    answer:
      "An hourly rate for each worker, covering their wages, super and insurance. You see the total before you post, and there are no sign-up, monthly or placement fees.",
  },
  {
    question: "Do you check the workers?",
    answer:
      "Yes. Before their first shift we check every worker's photo ID, right to work, and tickets or licences, and we keep track of when they expire.",
  },
  {
    question: "Who employs the workers?",
    answer:
      "We do. Workers are our casual employees, so we pay their wages and super every week and cover workers' compensation.",
  },
  {
    question: "Can I hire someone permanently?",
    answer:
      "Yes. If you find someone great, offer them a permanent job. There's no placement fee and no agency contract.",
  },
];

function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  centred = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  centred?: boolean;
}) {
  return (
    <div className={centred ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-2 text-3xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl"
      >
        {title}
      </h2>
      {intro ? (
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{intro}</p>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [industries, settings, technicianPay] = await Promise.all([
    listIndustries(),
    getAllSettings(),
    standardWeekdayPay("restoration_technician"),
  ]);
  const payPct = settings.urgent_loading_pct.pay;
  const bookable = industries.flatMap((industry) =>
    industry.workTypes
      .filter((workType) => workType.bookable)
      .map((workType) => workType.name),
  );

  return (
    <main className="flex-1">
      {/* First screen: what we do, and people ready to work. */}
      <section aria-labelledby="hero-title" className="bg-card">
        <Container className="grid items-center gap-8 pt-6 pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-12">
          <div className="space-y-5">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              On-demand staff · {brand.area}
            </p>
            <h1
              id="hero-title"
              className="text-5xl font-extrabold tracking-tight text-deep sm:text-6xl xl:text-7xl"
            >
              {brand.tagline}
            </h1>
            <p className="max-w-xl text-xl font-medium text-foreground sm:text-2xl">
              {brand.strapline}
            </p>
            <p className="max-w-xl text-lg text-muted-foreground">
              General labourers and skilled staff for {brand.area} businesses,
              fast. Post a shift in about a minute and checked workers hear
              about it straight away.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 px-7 text-base">
                <Link href="/register/business">Hire staff</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 px-7 text-base"
              >
                <Link href="/register/worker">Find work</Link>
              </Button>
            </div>
            <ul className="grid gap-x-6 gap-y-2 text-sm font-medium text-deep sm:grid-cols-2">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <CircleCheck
                    className="size-5 shrink-0 text-success"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          {/* On phones the people come first, as the first thing you see. */}
          <HeroVisual className="order-first lg:order-none" />
        </Container>
      </section>

      {/* The industries we cover, in one row. */}
      <section
        aria-labelledby="industries-title"
        className="border-y bg-background py-6"
      >
        <Container>
          <IndustryStrip industries={industries} headingId="industries-title" />
        </Container>
      </section>

      {/* The core service: general or skilled labour, fast. */}
      <section
        id="staff"
        aria-labelledby="staff-title"
        className="scroll-mt-24 bg-card py-16 sm:py-24"
      >
        <Container className="space-y-10">
          <SectionHeading
            id="staff-title"
            eyebrow="On-demand labour"
            title="General or skilled labour, when you need it"
            intro="Tell us the work, the site and the times. Workers who match hear about it straight away, and you choose who comes, or let the first qualified worker book."
          />
          <LabourTypes industries={industries} />
        </Container>
      </section>

      {/* Step by step, for each side. */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-title"
        className="scroll-mt-24 py-16 sm:py-24"
      >
        <Container className="space-y-12">
          <SectionHeading
            id="how-it-works-title"
            eyebrow="How it works"
            title="Step by step, from sign-up to pay day"
            intro="Tap a step to see what happens."
            centred
          />
          <HowItWorks autoApproveHours={settings.auto_approve_hours} />
        </Container>
      </section>

      {/* Against an agency. */}
      <section
        id="why-shifta"
        aria-labelledby="why-title"
        className="scroll-mt-24 bg-primary-soft py-16 sm:py-24"
      >
        <Container className="space-y-12">
          <SectionHeading
            id="why-title"
            eyebrow={`Why ${brand.name}`}
            title="Everything an agency does, without the agency"
            intro="We employ the workers, pay them and cover their insurance, like an agency. What's different is everything else."
          />
          <WhyShifta />
        </Container>
      </section>

      {/* What's in each account. */}
      <section aria-labelledby="features-title" className="py-16 sm:py-24">
        <Container className="space-y-12">
          <SectionHeading
            id="features-title"
            eyebrow="Inside your account"
            title="Built for both sides of the shift"
          />
          <DashboardFeatures />
        </Container>
      </section>

      {/* Call-outs: an add-on for short notice. */}
      <section
        id="call-outs"
        aria-labelledby="call-outs-title"
        className="scroll-mt-24 bg-card py-16 sm:py-24"
      >
        <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="space-y-10">
            <SectionHeading
              id="call-outs-title"
              eyebrow="Add-on: call-outs"
              title="Someone off sick? Send a call-out."
              intro={`For short notice, turn a shift into a call-out. Workers nearby who take call-outs hear straight away, the first to accept is booked, and they earn ${payPct}% more an hour for it.`}
            />
            <ol className="grid gap-6 sm:grid-cols-2">
              {calloutSteps(settings.callout_alert_minutes).map(
                (step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-highlight-soft text-deep">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-deep">
                        <span className="sr-only">Step {index + 1}: </span>
                        {step.title}
                      </p>
                      <p className="mt-1 text-muted-foreground">{step.text}</p>
                    </div>
                  </li>
                ),
              )}
            </ol>
          </div>
          <CalloutPhone payPct={payPct} hourlyCents={technicianPay} />
        </Container>
      </section>

      {/* Weekly pay and real support. */}
      <section
        aria-labelledby="support-title"
        className="bg-deep py-16 text-deep-foreground sm:py-24"
      >
        <Container className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <HandCoins className="size-10 text-highlight" aria-hidden />
            <h2
              id="support-title"
              className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Weekly pay. Weekly invoices.
            </h2>
            <p className="text-lg text-deep-foreground/85">
              Workers are paid their wages and super every week. Businesses get
              one itemised tax invoice a week, with every shift listed.
            </p>
          </div>
          <div className="space-y-4">
            <LifeBuoy className="size-10 text-highlight" aria-hidden />
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Support from real people
            </h2>
            <p className="text-lg text-deep-foreground/85">
              A question about a shift, your pay or an invoice? Get in touch and
              a person on our team will help you sort it out.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <a href={`mailto:${brand.supportEmail}`}>
                  <Mail aria-hidden />
                  {brand.supportEmail}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-deep-foreground/40 bg-transparent text-deep-foreground hover:bg-deep-foreground/10 hover:text-deep-foreground"
              >
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Quick answers. */}
      <section aria-labelledby="answers-title" className="py-16 sm:py-24">
        <Container className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              id="answers-title"
              eyebrow="Questions"
              title="Quick answers"
            />
            <Link
              href="/faq"
              className="text-lg font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              All questions and answers
            </Link>
          </div>
          <dl className="grid gap-6 md:grid-cols-2">
            {quickAnswers(bookable).map(({ question, answer }) => (
              <div
                key={question}
                className="space-y-2 rounded-3xl border bg-card p-7 shadow-soft"
              >
                <dt className="text-xl font-bold text-deep">{question}</dt>
                <dd className="text-lg text-muted-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* One more nudge. */}
      <section
        aria-labelledby="start-title"
        className="bg-primary py-16 text-primary-foreground sm:py-24"
      >
        <Container className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <h2
              id="start-title"
              className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl"
            >
              {brand.tagline}
            </h2>
            <p className="text-xl text-primary-foreground">{brand.strapline}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/register/business">Hire staff</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/register/worker">Find work</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
