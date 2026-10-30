import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import { BrandFeatures } from "@/components/home/brand-features";
import { ShiftPreview } from "@/components/home/shift-preview";
import { IndustryCards } from "@/components/industries/industry-cards";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { listIndustries } from "@/server/industries";

type Step = { title: string; text: string; time: string };

const BUSINESS_STEPS: Step[] = [
  {
    title: "Sign up with your ABN",
    text: "We look up your business details for you. Add your sites and anyone on your team who posts work.",
    time: "2 minutes",
  },
  {
    title: "Post the shift",
    text: "Where, when, how many people and what they'll do. You see the cost before you post. Next time, repeat it in a couple of taps.",
    time: "About a minute",
  },
  {
    title: "Get checked staff",
    text: "Choose from the people who apply, or let the first qualified workers book. Short notice? We text available workers nearby straight away.",
    time: "As soon as you post",
  },
  {
    title: "Approve hours, pay one invoice",
    text: "Workers clock in and out on their phones. Check their hours, approve them in one go, and get one invoice a week.",
    time: "Once a week",
  },
];

const WORKER_STEPS: Step[] = [
  {
    title: "Sign up on your phone",
    text: "Your details, right to work, photo ID and any tickets you hold. Save and come back any time.",
    time: "About 5 minutes",
  },
  {
    title: "We check you",
    text: "Our team checks your ID, right to work and tickets, and texts you when you're ready to start.",
    time: "Usually 2 business days",
  },
  {
    title: "Pick shifts that suit you",
    text: "See the pay, suburb, hazards and gear before you say yes. Accept in one tap, and only take what you want.",
    time: "One tap",
  },
  {
    title: "Clock in, get paid weekly",
    text: "Clock in and out with your phone. You're our casual employee, so we pay your wages and super every week.",
    time: "Every week",
  },
];

const QUICK_ANSWERS = [
  {
    question: "How much does it cost?",
    answer:
      "You pay an hourly rate for each worker, and you see the total before you post. It covers their wages, super and insurance.",
  },
  {
    question: "How quickly can I get someone?",
    answer:
      "Your shift goes to matching workers as soon as you post it. For short-notice shifts we also text workers nearby who take last-minute work.",
  },
  {
    question: "Who employs the workers?",
    answer:
      "We do. Workers are our casual employees, so we pay their wages and super and cover workers' compensation.",
  },
  {
    question: "What do I need to start working?",
    answer:
      "The right to work in Australia, photo ID, and any tickets the work needs, like an RSA or a White Card. Some jobs also need a police check.",
  },
];

function StepList({
  id,
  audience,
  title,
  intro,
  steps,
  icon: Icon,
  action,
  tone,
}: {
  id: string;
  audience: string;
  title: string;
  intro: string;
  steps: Step[];
  icon: typeof Smartphone;
  action: React.ReactNode;
  tone: "deep" | "light";
}) {
  const deep = tone === "deep";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "flex scroll-mt-24 flex-col gap-6 rounded-3xl p-6 sm:p-8",
        deep ? "bg-deep text-deep-foreground" : "border bg-card shadow-soft",
      )}
    >
      <div className="space-y-2">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            deep ? "text-deep-foreground/85" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {audience}
        </p>
        <h3
          id={`${id}-title`}
          className="text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {title}
        </h3>
        <p
          className={deep ? "text-deep-foreground/85" : "text-muted-foreground"}
        >
          {intro}
        </p>
      </div>
      <ol className="space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
                deep
                  ? "bg-deep-foreground text-deep"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {index + 1}
            </span>
            <div className="space-y-1">
              <h4 className="text-lg leading-snug font-bold">{step.title}</h4>
              <p
                className={
                  deep ? "text-deep-foreground/85" : "text-muted-foreground"
                }
              >
                {step.text}
              </p>
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-semibold",
                  deep ? "text-highlight" : "text-primary",
                )}
              >
                <Clock3 className="size-4" aria-hidden />
                {step.time}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-auto">{action}</div>
    </section>
  );
}

export default async function HomePage() {
  const industries = await listIndustries();
  return (
    <main className="flex-1">
      {/* The first screen: who it's for, and two doors in. */}
      <section aria-labelledby="hero-title" className="bg-primary-soft">
        <Container className="grid items-center gap-12 py-12 sm:py-16 lg:min-h-[calc(100svh-4rem-var(--banner-h))] lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="space-y-8">
            <p className="flex items-center gap-2 font-semibold text-deep">
              <span
                className="size-2.5 rounded-full bg-highlight"
                aria-hidden
              />
              Now in {brand.launchCity} · Every industry
            </p>
            <h1
              id="hero-title"
              className="max-w-3xl text-5xl leading-[1.02] font-extrabold tracking-tight text-balance text-deep sm:text-6xl xl:text-7xl"
            >
              {brand.tagline}
            </h1>
            <p className="max-w-2xl text-xl text-muted-foreground">
              {brand.name} finds checked, job-ready staff for any business, from
              cafés and warehouses to events, offices and building sites. Post a
              shift in about a minute. Workers pick the shifts that suit them
              and get paid every week.
            </p>
            <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-5 rounded-3xl bg-primary p-6 text-primary-foreground shadow-soft">
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-bold">I need staff</h2>
                  <p className="text-primary-foreground">
                    Post a shift in about a minute. Checked, job-ready people.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link href="/login?as=business">
                    Hire staff
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-col gap-5 rounded-3xl bg-card p-6 shadow-soft">
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-bold text-foreground">
                    I want work
                  </h2>
                  <p className="text-muted-foreground">
                    {brand.workerTagline} Sign up on your phone in about 5
                    minutes.
                  </p>
                </div>
                <Button asChild size="lg" className="mt-auto">
                  <Link href="/login?as=worker">
                    Find work
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <ShiftPreview />
        </Container>
      </section>

      {/* Every industry, each with its own page. */}
      <section aria-labelledby="work-title" className="bg-card py-20 sm:py-28">
        <Container className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl space-y-4">
              <h2
                id="work-title"
                className="text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl"
              >
                Staff for every industry
              </h2>
              <p className="text-xl text-muted-foreground">
                One app for the shifts every business has to fill, from a single
                shift to a busy season.
              </p>
            </div>
            <Link
              href="/industries"
              className="text-lg font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              Every industry
            </Link>
          </div>
          <IndustryCards industries={industries} />
        </Container>
      </section>

      {/* Step by step, for each side. */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-title"
        className="scroll-mt-16 bg-primary-soft py-20 sm:py-28"
      >
        <Container className="space-y-12">
          <div className="max-w-3xl space-y-4">
            <h2
              id="how-it-works-title"
              className="text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl"
            >
              How it works
            </h2>
            <p className="text-xl text-muted-foreground">
              Four steps each way, with nothing to print or post. Most of it is
              done in a few minutes, on your phone or your computer.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <StepList
              id="hire-staff"
              audience="For businesses"
              title="Hire staff"
              intro="Checked, job-ready people for one shift, a busy week or a last-minute gap, in any industry."
              steps={BUSINESS_STEPS}
              icon={BriefcaseBusiness}
              tone="deep"
              action={
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-deep-foreground text-deep hover:bg-deep-foreground/90 sm:w-auto"
                >
                  <Link href="/login?as=business">Sign up your business</Link>
                </Button>
              }
            />
            <StepList
              id="find-work"
              audience="For workers"
              title="Find work"
              intro={`Shifts in hospitality, events, warehousing, retail, cleaning and more, around ${brand.launchCity}, on your phone.`}
              steps={WORKER_STEPS}
              icon={Smartphone}
              tone="light"
              action={
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login?as=worker">Sign up to work</Link>
                </Button>
              }
            />
          </div>
        </Container>
      </section>

      {/* What the app does for every shift, by name. */}
      <BrandFeatures />

      {/* Quick answers. */}
      <section aria-labelledby="answers-title" className="py-20 sm:py-28">
        <Container className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="answers-title"
              className="text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl"
            >
              Quick answers
            </h2>
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
                <dt className="text-xl font-bold text-foreground">
                  {question}
                </dt>
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
              Need staff this week?
            </h2>
            <p className="text-xl text-primary-foreground">
              Post it now and see who&apos;s available. Questions first?{" "}
              <Link
                href="/contact"
                className="font-semibold text-primary-foreground underline underline-offset-4 hover:no-underline"
              >
                Talk to us
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/login?as=business">Post a shift</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login?as=worker">Look for shifts</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
