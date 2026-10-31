import { HandCoins, LifeBuoy, Mail } from "lucide-react";
import Link from "next/link";

import { CalloutPhone, calloutSteps } from "@/components/home/callout-visual";
import { DashboardFeatures } from "@/components/home/dashboard-features";
import { HeroVisual } from "@/components/home/hero-visual";
import { HowItWorks } from "@/components/home/how-it-works";
import { WhyShifta } from "@/components/home/why-shifta";
import { IndustryCards } from "@/components/industries/industry-cards";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { listIndustries } from "@/server/industries";
import { getAllSettings } from "@/server/settings";

const QUICK_ANSWERS = [
  {
    question: "How much does it cost?",
    answer:
      "An hourly rate for each worker, covering their wages, super and insurance. You see the total before you post, and there are no sign-up, monthly or placement fees.",
  },
  {
    question: "How quickly can I get someone?",
    answer:
      "Your shift goes to matching workers as soon as you post it. For short notice, post a call-out and workers nearby hear straight away.",
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
  const [industries, settings] = await Promise.all([
    listIndustries(),
    getAllSettings(),
  ]);
  const payPct = settings.urgent_loading_pct.pay;

  return (
    <main className="flex-1">
      {/* Above the fold: the promise, and what it looks like in the app. */}
      <section aria-labelledby="hero-title" className="bg-primary-soft">
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="space-y-7">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              {brand.area} · Every industry
            </p>
            <h1
              id="hero-title"
              className="text-6xl font-extrabold tracking-tight text-deep sm:text-7xl lg:text-8xl"
            >
              {brand.tagline}
            </h1>
            <p className="max-w-xl text-xl text-foreground sm:text-2xl">
              {brand.strapline}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 px-7 text-base">
                <Link href="/login?as=business">Hire staff</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 bg-card px-7 text-base"
              >
                <Link href="/login?as=worker">Find work</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-deep">
              <li>Checked, job-ready workers</li>
              <li>Call-outs for last-minute cover</li>
              <li>Workers paid every week</li>
            </ul>
          </div>
          <HeroVisual />
        </Container>
      </section>

      {/* Call-outs, with what they look like. */}
      <section
        id="call-outs"
        aria-labelledby="call-outs-title"
        className="scroll-mt-24 bg-card py-20 sm:py-28"
      >
        <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="space-y-10">
            <SectionHeading
              id="call-outs-title"
              eyebrow="Call-outs"
              title="Someone off sick? Find cover fast."
              intro={`When you need an extra pair of hands now, post a call-out. Workers nearby hear straight away, the first to accept is booked, and they earn ${payPct}% more an hour for it.`}
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
          <CalloutPhone payPct={payPct} />
        </Container>
      </section>

      {/* Step by step, for each side. */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-title"
        className="scroll-mt-24 py-20 sm:py-28"
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
        aria-labelledby="why-title"
        className="bg-primary-soft py-20 sm:py-28"
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
      <section aria-labelledby="features-title" className="py-20 sm:py-28">
        <Container className="space-y-12">
          <SectionHeading
            id="features-title"
            eyebrow="Inside your account"
            title="Built for both sides of the shift"
          />
          <DashboardFeatures />
        </Container>
      </section>

      {/* Weekly pay and real support. */}
      <section
        aria-labelledby="support-title"
        className="bg-deep py-20 text-deep-foreground sm:py-24"
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

      {/* Every industry. */}
      <section aria-labelledby="work-title" className="bg-card py-20 sm:py-28">
        <Container className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              id="work-title"
              eyebrow="Every industry"
              title="Staff for the work you do"
              intro="From a single shift to a busy season."
            />
            <Link
              href="/industries"
              className="text-lg font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              All industries
            </Link>
          </div>
          <IndustryCards industries={industries} />
        </Container>
      </section>

      {/* Quick answers. */}
      <section aria-labelledby="answers-title" className="py-20 sm:py-28">
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
            {QUICK_ANSWERS.map(({ question, answer }) => (
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
        className="bg-primary py-20 text-primary-foreground sm:py-24"
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
              <Link href="/login?as=business">Hire staff</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login?as=worker">Find work</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
