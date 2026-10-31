import {
  BellRing,
  CircleCheck,
  Hand,
  PhoneCall,
  Siren,
  type LucideIcon,
} from "lucide-react";

type Step = { icon: LucideIcon; title: string; text: string };

/** How a call-out runs, from the business's side (brief §4.3, owner 31/10/2026). */
export function calloutSteps(alertMinutes: number): Step[] {
  return [
    {
      icon: Siren,
      title: "Someone calls in sick",
      text: "Post a call-out from your dashboard in about a minute, or turn an open shift into one.",
    },
    {
      icon: BellRing,
      title: "Workers nearby hear straight away",
      text: "Every available, qualified worker who takes call-outs gets a text and an app notification, at any hour.",
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

/** Four weekday hours at the demo rate for a restoration labourer ($33.13). */
const EXAMPLE_HOURS_PAY_CENTS = 13_252;

/**
 * A phone showing a call-out text, worded as the real message is, and the
 * booking that follows. Example details only.
 */
export function CalloutPhone({ payPct }: { payPct: number }) {
  const dollars = Math.round(
    (EXAMPLE_HOURS_PAY_CENTS * (100 + payPct)) / 10_000,
  );
  return (
    <figure
      aria-labelledby="callout-phone-caption"
      className="mx-auto w-full max-w-xs"
    >
      <div className="rounded-[2.5rem] border-[10px] border-deep bg-background p-4 shadow-soft">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-deep/20" />
        <p className="text-center text-xs text-muted-foreground">
          Text message · now
        </p>
        <p className="mt-2 rounded-2xl rounded-tl-sm bg-card p-3 text-sm shadow-xs">
          Urgent work: Restoration labourer in Granville, today from 2:00 pm.
          About ${dollars} with the call-out rate. First in gets it:{" "}
          <span className="text-primary underline">open the shift</span>
        </p>
        <div className="mt-4 rounded-2xl bg-card p-3 shadow-xs">
          <p className="text-sm font-semibold text-deep">
            Restoration labourer
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
        What a worker sees. Example details.
      </figcaption>
    </figure>
  );
}
