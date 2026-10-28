/** Labels and choices shared by the worker wizard and the admin screens. */

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

export const BASIS_LABELS = {
  citizen: "Australian citizen",
  permanent_resident: "Permanent resident",
  nz_citizen: "New Zealand citizen",
  visa: "Another visa",
} as const;

export const BASIS_DESCRIPTIONS: Record<keyof typeof BASIS_LABELS, string> = {
  citizen: "You'll upload proof of citizenship.",
  permanent_resident: "You'll give your visa and passport details.",
  nz_citizen: "You'll give your New Zealand passport details.",
  visa: "For example a student, working holiday or bridging visa.",
};

export const EVIDENCE_LABELS = {
  australian_passport: "Australian passport",
  birth_certificate: "Australian birth certificate",
  citizenship_certificate: "Australian citizenship certificate",
} as const;

export type Basis = keyof typeof BASIS_LABELS;
export type Evidence = keyof typeof EVIDENCE_LABELS;
