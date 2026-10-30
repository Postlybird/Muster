import { BadgeCheck, MapPinCheck, Wallet, Zap } from "lucide-react";

import { Container } from "@/components/layout/container";
import { brand } from "@/config/brand";

/**
 * The four things the app does for every shift, by name. Each is something
 * the app really does: keep them that way when the app changes.
 */
export const BRAND_FEATURES = [
  {
    name: `${brand.name} Verified`,
    icon: BadgeCheck,
    title: "Every worker checked",
    text: "Our team checks photo ID, right to work and tickets before anyone's first shift, then keeps watching expiry dates and visas.",
  },
  {
    name: `${brand.name} FastFill`,
    icon: Zap,
    title: "Shifts filled fast",
    text: "Post in about a minute. Matching workers see it on their phone straight away, your favourites first, and short-notice shifts go out by text.",
  },
  {
    name: `${brand.name} Live`,
    icon: MapPinCheck,
    title: "Know who's on shift",
    text: "Workers clock in and out on their phone when they're there, you confirm arrival in a tap, and we flag anyone who hasn't turned up.",
  },
  {
    name: `${brand.name} Pay`,
    icon: Wallet,
    title: "One invoice a week",
    text: "Approve hours in one go. We pay workers' wages and super every week, and you get one invoice with every shift on it.",
  },
] as const;

/** The features on a deep blue band, with what being the employer covers. */
export function BrandFeatures({
  title = "Less chasing. More work done.",
}: {
  title?: string;
}) {
  return (
    <section
      aria-labelledby="features-title"
      className="bg-deep py-20 text-deep-foreground sm:py-28"
    >
      <Container className="space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="font-semibold text-highlight">The {brand.name} way</p>
          <h2
            id="features-title"
            className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl"
          >
            {title}
          </h2>
          <p className="text-xl text-deep-foreground/85">
            No ringing around agencies, no paperwork for each new face. We do
            the checking and the employing, so you can get on with business.
          </p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_FEATURES.map(({ name, icon: Icon, title: heading, text }) => (
            <li
              key={name}
              className="flex flex-col gap-4 rounded-3xl bg-deep-foreground/[0.06] p-6 ring-1 ring-deep-foreground/15"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-highlight text-highlight-foreground">
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  {name}
                  <span className="block text-base font-semibold text-deep-foreground/85">
                    {heading}
                  </span>
                </h3>
                <p className="text-deep-foreground/85">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl border-t-2 border-highlight pt-5 text-lg">
          <strong>We&apos;re the employer.</strong>{" "}
          <span className="text-deep-foreground/85">
            Wages, super, workers&apos; compensation and tax are on us. You pay
            one hourly rate, and see the cost before you post.
          </span>
        </p>
      </Container>
    </section>
  );
}
