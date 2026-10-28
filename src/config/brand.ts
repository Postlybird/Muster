/**
 * Brand settings. "Muster" is a working name: change `name` here and it
 * changes everywhere in the app.
 */
export const brand = {
  name: "Muster",
  tagline: "Vetted workers for restoration and cleaning, on demand.",
  description:
    "On-demand labour hire for property services and trades. Businesses book vetted workers for shifts; workers pick up shifts from their phone.",
  launchCity: "Sydney",
  supportEmail: "support@muster.example",
  supportPhone: "+61 2 0000 0000",
  /** Hex colours. Each pair has been checked for WCAG 2.1 AA contrast. */
  colours: {
    primary: "#0b5d57",
    primaryForeground: "#ffffff",
    accent: "#f2b53a",
    accentForeground: "#1c1917",
  },
} as const;

export type Brand = typeof brand;
