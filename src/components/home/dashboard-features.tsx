import {
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  HandCoins,
  Heart,
  Repeat2,
  ShieldCheck,
  Siren,
  Smartphone,
  Star,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; text: string };

/** In the worker app: only what it really does (CLAUDE.md, Look). */
const WORKER_FEATURES: Feature[] = [
  {
    icon: HandCoins,
    title: "Paid every week",
    text: "Wages and super every week, including your casual loading and weekend rates.",
  },
  {
    icon: Smartphone,
    title: "Shifts that fit you",
    text: "Only work you're qualified for, within the distance you choose, at times you're free.",
  },
  {
    icon: Siren,
    title: "Call-outs pay more",
    text: "Switch on call-outs to hear about urgent work first, and earn more per hour when you take one.",
  },
  {
    icon: Star,
    title: "A profile that speaks for you",
    text: "Ratings, badges and your own words, so businesses can see you're the right fit.",
  },
  {
    icon: Clock3,
    title: "Clock in on your phone",
    text: "Clock in and out on site, even with patchy signal. Your hours go straight in.",
  },
  {
    icon: CalendarClock,
    title: "Reminders, never surprises",
    text: "A reminder the day before and before you start, with the address and who to ask for.",
  },
];

/** In the business dashboard. */
const BUSINESS_FEATURES: Feature[] = [
  {
    icon: Repeat2,
    title: "Post in about a minute",
    text: "Templates and one-tap repeats for the shifts you post often. The cost is shown before you post.",
  },
  {
    icon: UserRoundSearch,
    title: "Know who's coming",
    text: "Profiles with ratings, reliability, experience, checks and a note on why they're a good fit.",
  },
  {
    icon: BellRing,
    title: "Call-outs you can watch",
    text: "See how many workers heard about it, and who accepted, the moment they do.",
  },
  {
    icon: Heart,
    title: "Favourites first",
    text: "Give the workers you like a head start on your shifts, and block anyone you'd rather not have back.",
  },
  {
    icon: ClipboardCheck,
    title: "Hours and invoices, sorted",
    text: "Approve a week of hours in one go, then get one itemised invoice a week.",
  },
  {
    icon: ShieldCheck,
    title: "Safety built in",
    text: "Hazards, gear and inductions on every shift, and safety reports from the site.",
  },
];

function FeatureList({
  id,
  title,
  features,
}: {
  id: string;
  title: string;
  features: Feature[];
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
    >
      <h3 id={id} className="text-xl font-bold text-deep">
        {title}
      </h3>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature.title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-deep">{feature.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What's in each side's account, as it really works. */
export function DashboardFeatures() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FeatureList
        id="for-workers"
        title="In the worker app"
        features={WORKER_FEATURES}
      />
      <FeatureList
        id="for-businesses"
        title="In the business dashboard"
        features={BUSINESS_FEATURES}
      />
    </div>
  );
}
