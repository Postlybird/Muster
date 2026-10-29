import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  HardHat,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { ShiftPreview } from "@/components/home/shift-preview";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

type Step = { title: string; text: string; time: string };

const BUSINESS_STEPS: Step[] = [
  {
    title: "Sign up with your ABN",
    text: "We look up your business details for you. Add your sites and anyone on your team who posts work.",
    time: "2 minutes",
  },
  {
    title: "Post the shift",
    text: "Where, when, how many people, and any hazards. You see the cost before you post. Next time, repeat it in a couple of taps.",
    time: "About a minute",
  },
  {
    title: "Get checked workers",
    text: "Choose from the people who apply, or let the first qualified workers book. Urgent job? We text workers nearby straight away.",
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
    text: "Clock in and out on site with your phone. You're our casual employee, so we pay your wages and super every week.",
    time: "Every week",
  },
];

const PROMISES = [
  {
    icon: BadgeCheck,
    title: "Every worker checked",
    text: "Photo ID, right to work and tickets are checked before anyone's offered work, and we keep an eye on expiry dates.",
  },
  {
    icon: HardHat,
    title: "The right tickets for the job",
    text: "Each job lists what it needs, like a White Card or asbestos awareness. Only workers who hold them can take it.",
  },
  {
    icon: Wallet,
    title: "We're the employer",
    text: "Wages, super, workers' compensation and tax are on us. You pay one hourly rate and get one invoice a week.",
  },
  {
    icon: ShieldCheck,
    title: "Safety from the start",
    text: "Hazards and protective gear are listed before anyone accepts, and safety reports reach our team straight away.",
  },
];

const WORK_TYPES = [
  "Flood and storm clean-up",
  "Water damage and drying",
  "Mould remediation",
  "Fire and smoke clean-up",
  "Strip-out and make-safe",
  "Contents pack-out",
  "Carpet cleaning",
  "Commercial cleaning",
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
      "Your shift goes to matching workers as soon as you post it. For urgent call-outs we also text workers nearby who take short-notice work.",
  },
  {
    question: "Who employs the workers?",
    answer:
      "We do. Workers are our casual employees, so we pay their wages and super and cover workers' compensation.",
  },
  {
    question: "What do I need to start working?",
    answer:
      "The right to work in Australia, photo ID, and the tickets for the work you want, like a White Card. Some jobs also need a police check.",
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
  tone: "navy" | "light";
}) {
  const navy = tone === "navy";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "flex scroll-mt-24 flex-col gap-6 rounded-3xl p-6 sm:p-8",
        navy
          ? "bg-primary text-primary-foreground"
          : "border bg-card shadow-soft",
      )}
    >
      <div className="space-y-2">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            navy ? "text-primary-foreground/80" : "text-muted-foreground",
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
          className={
            navy ? "text-primary-foreground/80" : "text-muted-foreground"
          }
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
                navy
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {index + 1}
            </span>
            <div className="space-y-1">
              <h4 className="text-lg leading-snug font-bold">{step.title}</h4>
              <p
                className={
                  navy ? "text-primary-foreground/80" : "text-muted-foreground"
                }
              >
                {step.text}
              </p>
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-semibold",
                  navy ? "text-highlight" : "text-primary",
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

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Two doors: hiring or working. */}
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24">
        <div className="space-y-7">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="size-2 rounded-full bg-highlight" aria-hidden />
            {brand.launchCity} · Restoration and cleaning
          </p>
          <h1 className="max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-primary sm:text-5xl lg:text-6xl">
            The right people on site, when you need them.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {brand.name} is labour hire for restoration and cleaning work.
            Businesses post a shift in about a minute. Workers pick the shifts
            that suit them and get paid every week.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">I need workers</h2>
                <p className="text-primary-foreground/80">
                  Post a shift in about a minute. Checked, ticketed workers.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/login?as=business">
                  Hire workers
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  I want work
                </h2>
                <p className="text-muted-foreground">
                  Sign up on your phone in about 5 minutes. Pick your shifts.
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
      </div>

      {/* Step by step, for each side. */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-title"
        className="scroll-mt-20 border-t bg-card/60 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl space-y-10 px-4">
          <div className="max-w-2xl space-y-3">
            <h2
              id="how-it-works-title"
              className="text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-4xl"
            >
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Four steps each way, with nothing to print or post. Most of it is
              done in a few minutes, on your phone or your computer.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <StepList
              id="hire-workers"
              audience="For businesses"
              title="Hire workers"
              intro="Checked workers for restoration, cleaning and make-safe jobs, for a shift, a week or an urgent call-out."
              steps={BUSINESS_STEPS}
              icon={BriefcaseBusiness}
              tone="navy"
              action={
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 sm:w-auto"
                >
                  <Link href="/login?as=business">Sign up your business</Link>
                </Button>
              }
            />
            <StepList
              id="find-work"
              audience="For workers"
              title="Find work"
              intro={`Restoration, cleaning and labouring shifts around ${brand.launchCity}, on your phone.`}
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
        </div>
      </section>

      {/* Why businesses and workers can rely on it. */}
      <section
        aria-labelledby="promises-title"
        className="border-t py-16 sm:py-20"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <h2
              id="promises-title"
              className="text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-4xl"
            >
              Less chasing. More work done.
            </h2>
            <p className="text-lg text-muted-foreground">
              No ringing around agencies, no paperwork for each new face on
              site. We do the checking and the employing, so you can get on with
              the job.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {PROMISES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="space-y-2 border-t-2 border-primary pt-4"
              >
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Icon className="size-5 text-primary" aria-hidden />
                  {title}
                </h3>
                <p className="text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The work. */}
      <section
        aria-labelledby="work-title"
        className="border-t bg-card/60 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4">
          <div className="max-w-2xl space-y-3">
            <h2
              id="work-title"
              className="text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-4xl"
            >
              The work we cover
            </h2>
            <p className="text-lg text-muted-foreground">
              Restoration and cleaning work across {brand.launchCity}, from a
              single shift to a week-long job or an urgent call-out after a
              storm.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {WORK_TYPES.map((work) => (
              <li
                key={work}
                className="rounded-full border bg-card px-4 py-2 font-medium text-foreground"
              >
                {work}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Quick answers. */}
      <section
        aria-labelledby="answers-title"
        className="border-t py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="answers-title"
              className="text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-4xl"
            >
              Quick answers
            </h2>
            <Link
              href="/faq"
              className="font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              All questions and answers
            </Link>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2">
            {QUICK_ANSWERS.map(({ question, answer }) => (
              <div
                key={question}
                className="space-y-2 rounded-2xl border bg-card p-6 shadow-soft"
              >
                <dt className="text-lg font-bold text-foreground">
                  {question}
                </dt>
                <dd className="text-muted-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* One more nudge. */}
      <section aria-labelledby="start-title" className="px-4 pb-16 sm:pb-20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 rounded-3xl bg-primary p-8 text-primary-foreground sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <h2
              id="start-title"
              className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Got a job coming up?
            </h2>
            <p className="text-lg text-primary-foreground/80">
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
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login?as=worker">Look for shifts</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
