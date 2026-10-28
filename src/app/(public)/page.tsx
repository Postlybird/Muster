import {
  BadgeCheck,
  BriefcaseBusiness,
  HardHat,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

const WORKER_STEPS = [
  {
    title: "Sign up on your phone",
    text: "Add your details, right to work, photo ID and tickets. It takes about five minutes, and we text you when you're checked.",
  },
  {
    title: "Pick shifts that suit you",
    text: "See the suburb, the pay, the hazards and the gear you need before you accept. Set when you're free, and turn on urgent call-outs if you want them.",
  },
  {
    title: "Clock in and out on site",
    text: "Your phone checks you're there. Reminders come the day before and two hours before.",
  },
  {
    title: "Get paid every week",
    text: "You're our casual employee, so we pay your wages and super, with higher rates for weekends, nights and public holidays.",
  },
];

const BUSINESS_STEPS = [
  {
    title: "Sign up with your ABN",
    text: "We look up your business, you add your sites and team, and we check your account.",
  },
  {
    title: "Post work in under a minute",
    text: "Choose the work, the times and how many people, and tell us the hazards. You see the cost before you post.",
  },
  {
    title: "Get checked workers",
    text: "Pick from the people who apply, or let the first qualified workers book. Urgent call-outs go out straight away.",
  },
  {
    title: "Approve hours, get one invoice",
    text: "Workers clock in and out on their phones. Approve their hours, and we send one invoice each week.",
  },
];

function Steps({
  id,
  title,
  intro,
  steps,
  action,
}: {
  id: string;
  title: string;
  intro: string;
  steps: { title: string; text: string }[];
  action: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 space-y-5 rounded-2xl border bg-card p-6"
    >
      <div className="space-y-1">
        <h2
          id={`${id}-title`}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </h2>
        <p className="text-muted-foreground">{intro}</p>
      </div>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      {action}
    </section>
  );
}

const PROMISES = [
  {
    icon: ShieldCheck,
    title: "Every worker checked",
    text: "Photo ID, right to work and tickets, checked by our team and watched for expiry.",
  },
  {
    icon: Wallet,
    title: "We're the employer",
    text: "Wages, super, workers' compensation and tax are on us. You pay one hourly rate.",
  },
  {
    icon: HardHat,
    title: "Safety on every job",
    text: "Hazards and protective gear are listed before anyone accepts, and safety reports reach us straight away.",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:py-16">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {brand.launchCity} · Restoration and cleaning
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {brand.tagline}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {brand.name} connects restoration and cleaning businesses with
            checked, reliable workers for a shift, a week or an urgent call-out.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login?as=worker">
                <HardHat aria-hidden />
                Find work
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?as=business">
                <BriefcaseBusiness aria-hidden />
                Hire workers
              </Link>
            </Button>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="space-y-2">
              <Icon className="size-6 text-primary" aria-hidden />
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>

        <div className="grid gap-6 lg:grid-cols-2">
          <Steps
            id="find-work"
            title="Find work"
            intro={`Restoration, cleaning and labouring work around ${brand.launchCity}, on your phone.`}
            steps={WORKER_STEPS}
            action={
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login?as=worker">Sign up to work</Link>
              </Button>
            }
          />
          <Steps
            id="hire-workers"
            title="Hire workers"
            intro="Checked workers for restoration, cleaning and make-safe jobs, when you need them."
            steps={BUSINESS_STEPS}
            action={
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/login?as=business">Sign up your business</Link>
              </Button>
            }
          />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-muted p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <BadgeCheck
              className="mt-0.5 size-6 shrink-0 text-primary"
              aria-hidden
            />
            <p>
              Questions about pay, checks, cancellations or invoices?{" "}
              <Link href="/faq" className="font-medium text-primary underline">
                Read the answers
              </Link>{" "}
              or{" "}
              <Link
                href="/contact"
                className="font-medium text-primary underline"
              >
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
