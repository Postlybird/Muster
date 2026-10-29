/**
 * The logo mark: a rounded "m" with a hi-vis dot, the point in "muster
 * point". Drawn on a 32 × 32 grid; colours come from the brand. The header
 * logo (`LogoMark`) and the app icons (`npm run icons`) both use it.
 */
export const logo = {
  viewBox: "0 0 32 32",
  /** Corner radius of the square, on the 32 grid. */
  radius: 7.5,
  letter:
    "M6.7 11.3V20.8M6.7 14.8a3.5 3.5 0 0 1 7 0v6M13.7 14.8a3.5 3.5 0 0 1 7 0v6",
  strokeWidth: 3.4,
  dot: { cx: 24.8, cy: 20, r: 2.3 },
} as const;
