"use client";

import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  HandCoins,
  MailCheck,
  MapPin,
  ReceiptText,
  Search,
  Send,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Step = { icon: LucideIcon; title: string; text: string; time: string };

/** Posting work, from sign-up to the invoice (brief §4.2 to §4.8). */
const businessSteps = (autoApproveHours: number): Step[] => [
  {
    icon: Building2,
    title: "Create your account",
    text: "Sign up with your work email and your ABN. We fill in your business details from the ABN register, then you add your sites and anyone on your team who posts work.",
    time: "About 2 minutes",
  },
  {
    icon: Send,
    title: "Post your shift",
    text: "Choose the type of work, the site and the times, and tell workers about hazards and the gear they need. You see the full cost, GST included, before you post. Next time, repeat a job or use a template.",
    time: "About a minute",
  },
  {
    icon: UserRoundCheck,
    title: "Choose who comes",
    text: "Pick from applicants with their ratings, reliability, checks and a note on why they're a good fit. Or let the first qualified worker book, and for short notice, post a call-out.",
    time: "As soon as you post",
  },
  {
    icon: MapPin,
    title: "On the day",
    text: "Workers clock in on site with their phone, and you can confirm who's arrived. Anyone can report a safety issue straight from the shift.",
    time: "On the day",
  },
  {
    icon: ClipboardCheck,
    title: "Approve the hours",
    text: `Check everyone's hours and approve them in one go, or change and query them. Hours you haven't looked at approve themselves after ${autoApproveHours} hours.`,
    time: "A minute a week",
  },
  {
    icon: ReceiptText,
    title: "Pay one invoice a week",
    text: "Every shift itemised on one tax invoice a week, GST included, emailed to your accounts contact. No sign-up or monthly fees.",
    time: "Weekly",
  },
];

/** Working with us, from sign-up to pay day (brief §4.1, §4.4 to §4.8). */
const WORKER_STEPS: Step[] = [
  {
    icon: MailCheck,
    title: "Sign up with your email",
    text: "Create your account with your email address. Then add your details on your phone, in your own time: save and come back whenever you like.",
    time: "About 5 minutes",
  },
  {
    icon: FileCheck2,
    title: "Add your documents",
    text: "Your right to work, photo ID with a selfie, and the tickets you hold, like a White Card or RSA. Read and accept your casual employment contract.",
    time: "About 5 minutes",
  },
  {
    icon: BadgeCheck,
    title: "We check you",
    text: "Our team checks your ID, right to work and tickets, then lets you know you're ready. Businesses see that you're checked.",
    time: "Usually 2 business days",
  },
  {
    icon: Search,
    title: "Pick shifts that suit you",
    text: "See the pay, the suburb, the hazards and what to bring before you say yes. Apply with a note on why you're a good fit, or accept first-in shifts and call-outs in one tap.",
    time: "Whenever suits you",
  },
  {
    icon: CalendarCheck,
    title: "Clock in on your phone",
    text: "We remind you the day before. On the day, clock in and out on site, and your hours go to the business to approve.",
    time: "On the day",
  },
  {
    icon: HandCoins,
    title: "Get paid every week",
    text: "You're our casual employee, so we pay your wages and super every week, with your casual loading and any weekend or call-out rates.",
    time: "Every week",
  },
];

function StepTabs({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <Tabs
      defaultValue="0"
      orientation="vertical"
      className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10"
    >
      <TabsList
        aria-label={label}
        className="h-auto flex-col items-stretch gap-1.5 bg-transparent p-0"
      >
        {steps.map((step, index) => (
          <TabsTrigger
            key={step.title}
            value={String(index)}
            className="min-h-14 justify-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left text-base whitespace-normal text-foreground hover:bg-card data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-soft"
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary"
            >
              {index + 1}
            </span>
            <span className="font-semibold">{step.title}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {steps.map((step, index) => (
        <TabsContent
          key={step.title}
          value={String(index)}
          className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8 md:self-start"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <step.icon className="size-7" aria-hidden />
            </span>
            <span className="rounded-full bg-highlight-soft px-3 py-1 text-xs font-semibold text-deep">
              {step.time}
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold text-primary">
            Step {index + 1} of {steps.length}
          </p>
          <h4 className="mt-1 text-2xl font-bold tracking-tight text-deep">
            {step.title}
          </h4>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {step.text}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Which side a link's #fragment opens, if it's one of ours. */
function audienceFor(hash: string): "business" | "worker" | null {
  if (hash === "#how-it-works-workers") return "worker";
  if (hash === "#how-it-works") return "business";
  return null;
}

/**
 * Step by step for businesses (putting up a shift) and for workers
 * (sign-up, documents and checks, through to pay). Each step opens on a
 * click or tap; /#how-it-works-workers opens the workers' side and
 * /#how-it-works the businesses'.
 */
export function HowItWorks({ autoApproveHours }: { autoApproveHours: number }) {
  const [audience, setAudience] = useState("business");
  useEffect(() => {
    const fromHash = () => {
      const side = audienceFor(window.location.hash);
      if (side) setAudience(side);
    };
    // Links on this page change the address without a hashchange event,
    // so a click on a link to either side switches to it too.
    const fromClick = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.pathname !== window.location.pathname) return;
      const side = audienceFor(url.hash);
      if (side) setAudience(side);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    document.addEventListener("click", fromClick);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      document.removeEventListener("click", fromClick);
    };
  }, []);

  return (
    <Tabs value={audience} onValueChange={setAudience} className="gap-8">
      <TabsList
        aria-label="Who it's for"
        className="mx-auto h-12 w-full max-w-md"
      >
        <TabsTrigger value="business" className="text-base">
          For businesses
        </TabsTrigger>
        <TabsTrigger
          value="worker"
          id="how-it-works-workers"
          className="scroll-mt-28 text-base"
        >
          For workers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="business" className="space-y-8">
        <StepTabs
          steps={businessSteps(autoApproveHours)}
          label="Steps for businesses"
        />
        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/login?as=business">Post your first shift</Link>
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="worker" className="space-y-8">
        <StepTabs steps={WORKER_STEPS} label="Steps for workers" />
        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/login?as=worker">Start your sign-up</Link>
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
