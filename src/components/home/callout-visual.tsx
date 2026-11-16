import {
  BellRing,
  CircleCheck,
  Hand,
  PhoneCall,
  Siren,
  type LucideIcon,
} from "lucide-react";

type Step = { icon: LucideIcon; title: string; text: string };

/**
 * How a call-out runs, from the business's side (brief §4.3, owner
 * 31/10/2026). Texts only once they're on (owner, 16/11/2026).
 */
export function calloutSteps(alertMinutes: number, textsOn: boolean): Step[] {
  return [
    {
      icon: Siren,
      title: "Someone calls in sick",
      text: "Post a call-out from your dashboard in about a minute, or turn an open shift into one.",
    },
    {
      icon: BellRing,
      title: "Workers nearby hear straight away",
      text: textsOn
        ? "Every available, qualified worker who takes call-outs gets a text and an app notification, at any hour."
        : "Every available, qualified worker who takes call-outs hears straight away, by app notification or email, at any hour.",
    },
    {
      icon: Hand,
      title: "The first to accept is booked",
      text: "They tap the link, check the details and accept. You're told at once, and can see their profile.",
    },
    {
      icon: PhoneCall,
      title: "Still open? You'll know",
      text: `If nobody has accepted after ${alertMinutes} minutes, we tell you and our team, so we can help find someone.`,
    },
  ];
}

/** The call-out in the picture: four weekday hours. */
const EXAMPLE_HOURS = 4;

/**
 * A phone showing a call-out text (or, while texts are off, the app
 * notification), worded as the real message is, and the booking that
 * follows. The details are illustrative (the footer says so); the pay
 * follows a restoration technician's current rate (`hourlyCents`) and the
 * call-out loading.
 */
export function CalloutPhone({
  payPct,
  hourlyCents,
  textsOn,
}: {
  payPct: number;
  hourlyCents: number | null;
  textsOn: boolean;
}) {
  const dollars =
    hourlyCents === null
      ? null
      : Math.round((hourlyCents * EXAMPLE_HOURS * (100 + payPct)) / 10_000);
  return (
    <figure
      aria-labelledby="callout-phone-caption"
      className="mx-auto w-full max-w-xs"
    >
      <div className="rounded-[2.5rem] border-[10px] border-deep bg-background p-4 shadow-soft">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-deep/20" />
        <p className="text-center text-xs text-muted-foreground">
          {textsOn ? "Text message" : "App notification"} · now
        </p>
        <p className="mt-2 rounded-2xl rounded-tl-sm bg-card p-3 text-sm shadow-xs">
          Urgent work: Restoration technician in Granville, today from 2:00 pm.
          {dollars === null
            ? ""
            : ` About $${dollars} with the call-out rate.`}{" "}
          First in gets it:{" "}
          <span className="text-primary underline">open the shift</span>
        </p>
        <div className="mt-4 rounded-2xl bg-card p-3 shadow-xs">
          <p className="text-sm font-semibold text-deep">
            Restoration technician
          </p>
          <p className="text-xs text-muted-foreground">
            Granville · today 2:00 pm to 6:00 pm · {payPct}% more per hour
          </p>
          <span
            aria-hidden
            className="mt-3 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          >
            Accept now
          </span>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          <CircleCheck className="size-4" aria-hidden />
          You&apos;re booked
        </p>
      </div>
      <figcaption
        id="callout-phone-caption"
        className="mt-3 text-center text-xs text-muted-foreground"
      >
        What a worker sees.
      </figcaption>
    </figure>
  );
}
