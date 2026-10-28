export const RADIUS_OPTIONS_KM = [5, 10, 15, 20, 30, 40, 50, 75, 100];

export const LICENCE_LABELS = {
  none: "No driver licence",
  C: "Car (C)",
  MR: "Medium rigid truck (MR)",
  HR: "Heavy rigid truck (HR)",
} as const;

export type LicenceClass = keyof typeof LICENCE_LABELS;

/** "Parramatta NSW 2150": how a saved suburb shows in the picker. */
export function suburbLabel(
  suburb: string | null,
  state: string,
  postcode: string | null,
): string {
  return suburb ? [suburb, state, postcode].filter(Boolean).join(" ") : "";
}
