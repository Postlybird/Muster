/**
 * The logo mark: a rounded "s" with a hi-vis dot (staff, on the dot). Drawn
 * on a 32 × 32 grid; colours come from the brand. The header logo
 * (`LogoMark`) and the app icons (`npm run icons`) both use it.
 */
export const logo = {
  viewBox: "0 0 32 32",
  /** Corner radius of the square, on the 32 grid. */
  radius: 7.5,
  letter:
    "M17.3 12.4C16.4 11 14.8 10.2 12.9 10.2 10.4 10.2 8.6 11.5 8.6 13.4 8.6 15.1 9.9 15.7 12.9 16.2 15.9 16.7 17.4 17.4 17.4 19.1 17.4 20.8 15.5 21.9 12.9 21.9 10.7 21.9 9 21 8.1 19.5",
  strokeWidth: 3.6,
  dot: { cx: 23.6, cy: 20.5, r: 2.4 },
} as const;
