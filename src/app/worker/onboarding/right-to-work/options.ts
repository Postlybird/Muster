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
