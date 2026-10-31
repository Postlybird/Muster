/**
 * Brand settings. Change `name` here and it changes everywhere in the app.
 */
export const brand = {
  name: "Shifta",
  /** The slogan (owner's choice, 31/10/2026). */
  tagline: "Work, sorted.",
  /** What we do, in a line. */
  strapline:
    "Connecting great businesses with great people, one shift at a time.",
  /** Where we take work for now: Sydney (owner's choice, 31/10/2026). */
  area: "Sydney",
  description:
    "Connecting great businesses with great people, one shift at a time. Sydney businesses book checked, job-ready staff in minutes; workers pick up shifts on their phone and get paid every week.",
  supportEmail: "support@shifta.com.au",
  /** Shown only once we have a number to give out. */
  supportPhone: null as string | null,
  /** Hex colours. Each pair has been checked for WCAG 2.1 AA contrast. */
  colours: {
    /** A friendly mid blue; the accent is a soft hi-vis orange. */
    primary: "#1d68cf",
    primaryForeground: "#ffffff",
    accent: "#f4a340",
    accentForeground: "#172033",
  },
} as const;

export type Brand = typeof brand;

/** "Questions? Email … or call …", leaving out the phone until there is one. */
export function contactLine(): string {
  return brand.supportPhone
    ? `Questions? Email ${brand.supportEmail} or call ${brand.supportPhone}.`
    : `Questions? Email ${brand.supportEmail}.`;
}
