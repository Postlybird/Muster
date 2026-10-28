/** Launch catalogues from the BRIEF.md appendix. Admins can edit all of it. */

export type SeedCredentialType = {
  code: string;
  name: string;
  kind: "ticket" | "licence" | "police_check" | "wwcc";
  issuer?: string;
  hasNumber: boolean;
  hasExpiry: boolean;
  verification?: "manual" | "register_check";
  description?: string;
};

export const CREDENTIAL_TYPES: SeedCredentialType[] = [
  {
    code: "white_card",
    name: "White Card",
    kind: "ticket",
    issuer: "SafeWork NSW",
    hasNumber: true,
    hasExpiry: false,
    description: "General construction induction (CPCWHS1001).",
  },
  {
    code: "iicrc_wrt",
    name: "IICRC WRT",
    kind: "ticket",
    issuer: "IICRC",
    hasNumber: true,
    hasExpiry: true,
    description: "Water Damage Restoration Technician.",
  },
  {
    code: "iicrc_asd",
    name: "IICRC ASD",
    kind: "ticket",
    issuer: "IICRC",
    hasNumber: true,
    hasExpiry: true,
    description: "Applied Structural Drying.",
  },
  {
    code: "iicrc_amrt",
    name: "IICRC AMRT",
    kind: "ticket",
    issuer: "IICRC",
    hasNumber: true,
    hasExpiry: true,
    description: "Applied Microbial Remediation Technician.",
  },
  {
    code: "iicrc_fsrt",
    name: "IICRC FSRT",
    kind: "ticket",
    issuer: "IICRC",
    hasNumber: true,
    hasExpiry: true,
    description: "Fire and Smoke Restoration Technician.",
  },
  {
    code: "iicrc_oct",
    name: "IICRC OCT",
    kind: "ticket",
    issuer: "IICRC",
    hasNumber: true,
    hasExpiry: true,
    description: "Odour Control Technician.",
  },
  {
    code: "asbestos_awareness",
    name: "Asbestos awareness",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: false,
  },
  {
    code: "working_at_heights",
    name: "Working at heights",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: false,
    description: "RIIWHS204E or equivalent.",
  },
  {
    code: "confined_space",
    name: "Confined space entry",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: false,
    description: "RIIWHS202E or equivalent.",
  },
  {
    code: "first_aid",
    name: "First aid (HLTAID011)",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: true,
  },
  {
    code: "driver_licence_c",
    name: "Driver licence (C)",
    kind: "licence",
    issuer: "Transport for NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
  },
  {
    code: "driver_licence_mr",
    name: "Driver licence (MR)",
    kind: "licence",
    issuer: "Transport for NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
  },
  {
    code: "driver_licence_hr",
    name: "Driver licence (HR)",
    kind: "licence",
    issuer: "Transport for NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
  },
  {
    code: "forklift_lf",
    name: "Forklift licence (LF)",
    kind: "licence",
    issuer: "SafeWork NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
  },
  {
    code: "police_check",
    name: "National Police Check",
    kind: "police_check",
    hasNumber: true,
    hasExpiry: false,
    description:
      "Accepted for the number of months set in police_check_max_age_months.",
  },
  {
    code: "wwcc",
    name: "Working with Children Check",
    kind: "wwcc",
    issuer: "Office of the Children's Guardian",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
  },
  {
    code: "respirator_fit_test",
    name: "Respirator fit test",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: true,
  },
];

export const HAZARDS: { code: string; name: string }[] = [
  { code: "asbestos", name: "Suspected or confirmed asbestos" },
  { code: "mould", name: "Mould" },
  { code: "category_3_water", name: "Category 3 water or sewage" },
  { code: "fire_smoke", name: "Fire and smoke residue" },
  { code: "biohazard_sharps", name: "Biohazards and sharps" },
  { code: "heights", name: "Working at heights" },
  { code: "confined_spaces", name: "Confined spaces" },
  { code: "live_electrical", name: "Live electrical" },
  { code: "structural_damage", name: "Structural damage" },
  { code: "heavy_manual_handling", name: "Heavy manual handling" },
];

export const PPE_ITEMS: { code: string; name: string }[] = [
  { code: "p2_disposable", name: "P2 disposable respirator" },
  {
    code: "half_face_respirator",
    name: "Half-face respirator (P2/P3 filters)",
  },
  { code: "full_face_respirator", name: "Full-face respirator" },
  { code: "disposable_coveralls", name: "Disposable coveralls" },
  { code: "nitrile_gloves", name: "Nitrile gloves" },
  { code: "cut_resistant_gloves", name: "Cut-resistant gloves" },
  { code: "steel_cap_boots", name: "Steel-cap boots" },
  { code: "gumboots", name: "Gumboots" },
  { code: "hi_vis", name: "Hi-vis" },
  { code: "safety_glasses", name: "Safety glasses or goggles" },
  { code: "hearing_protection", name: "Hearing protection" },
  { code: "hard_hat", name: "Hard hat" },
];

export type SeedCategory = {
  code: string;
  name: string;
  description: string;
  policeCheckRequired: boolean;
  /** PLACEHOLDER minimum engagement; to be confirmed by a payroll professional. */
  minEngagementHours: number;
  requiredCredentials: string[];
  defaultPpe: string[];
};

export const CATEGORIES: SeedCategory[] = [
  {
    code: "restoration_labourer",
    name: "Restoration labourer",
    description:
      "General labour on water, fire and storm damage jobs: moving equipment, removing debris, setting up drying gear.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card"],
    defaultPpe: [
      "steel_cap_boots",
      "nitrile_gloves",
      "p2_disposable",
      "safety_glasses",
    ],
  },
  {
    code: "restoration_technician",
    name: "Restoration technician",
    description:
      "Qualified technician for water damage and drying: moisture mapping, equipment placement and monitoring.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card", "iicrc_wrt"],
    defaultPpe: [
      "steel_cap_boots",
      "nitrile_gloves",
      "p2_disposable",
      "safety_glasses",
    ],
  },
  {
    code: "contents_packout",
    name: "Contents and pack-out crew",
    description:
      "Carefully packing, listing and moving household contents out of damaged homes, and back again.",
    policeCheckRequired: true,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots", "cut_resistant_gloves"],
  },
  {
    code: "strip_out_demolition",
    name: "Strip-out and demolition labourer",
    description:
      "Removing damaged plaster, flooring, cabinetry and fixtures, and loading skips.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card", "asbestos_awareness"],
    defaultPpe: [
      "steel_cap_boots",
      "cut_resistant_gloves",
      "p2_disposable",
      "safety_glasses",
      "hearing_protection",
      "hard_hat",
    ],
  },
  {
    code: "mould_remediation_assistant",
    name: "Mould remediation assistant",
    description:
      "Helping technicians contain and remove mould: containment set-up, HEPA vacuuming, wiping down.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card", "respirator_fit_test"],
    defaultPpe: [
      "half_face_respirator",
      "disposable_coveralls",
      "nitrile_gloves",
      "safety_glasses",
      "gumboots",
    ],
  },
  {
    code: "commercial_cleaner",
    name: "Commercial cleaner",
    description:
      "Cleaning offices, builds and commercial sites, including post-construction and post-restoration cleans.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: ["nitrile_gloves"],
  },
  {
    code: "trades_assistant",
    name: "Trades assistant",
    description:
      "Assisting carpenters, plasterers and other trades on repair work.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card"],
    defaultPpe: ["steel_cap_boots", "safety_glasses", "hi_vis"],
  },
  {
    code: "removalist_offsider",
    name: "Removalist offsider",
    description:
      "Lifting, carrying and loading furniture and boxes alongside a removalist.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots"],
  },
];
