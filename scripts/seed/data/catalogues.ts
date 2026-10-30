import type { StateCode } from "@/domain/pay";

/**
 * Launch catalogues: the BRIEF.md appendix for restoration and cleaning, and
 * starting work types for the other industries (30/10/2026). Admins can edit
 * all of it.
 */

export type SeedCredentialType = {
  code: string;
  name: string;
  kind: "ticket" | "licence" | "police_check" | "wwcc";
  issuer?: string;
  hasNumber: boolean;
  hasExpiry: boolean;
  verification?: "manual" | "register_check";
  description?: string;
  /** For tickets issued state by state: the state, and the family its versions share. */
  state?: StateCode;
  family?: string;
};

const RSA = "Responsible Service of Alcohol (RSA)";
const WWC = "Working with children check";
const TRAFFIC = "Traffic controller accreditation";

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
    name: "Working with Children Check (NSW)",
    kind: "wwcc",
    issuer: "Office of the Children's Guardian",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
    state: "NSW",
    family: WWC,
  },
  {
    code: "respirator_fit_test",
    name: "Respirator fit test",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: true,
  },
  {
    code: "rsa_nsw",
    name: "RSA (NSW Competency Card)",
    kind: "licence",
    issuer: "Liquor & Gaming NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
    description: "Responsible Service of Alcohol. Needed to serve alcohol.",
    state: "NSW",
    family: RSA,
  },
  {
    code: "traffic_controller",
    name: "Traffic controller card (NSW)",
    kind: "licence",
    issuer: "Transport for NSW",
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
    description: "Traffic Controller and Implement Traffic Control Plans.",
    state: "NSW",
    family: TRAFFIC,
  },
  {
    code: "food_handler",
    name: "Food handler training",
    kind: "ticket",
    hasNumber: false,
    hasExpiry: false,
    description: "Food Handler Basics or equivalent.",
  },
  ...otherStatesTickets(),
];

/**
 * The other states' versions of the tickets issued state by state. Where we
 * couldn't confirm the issuer or whether it expires, it's left out; admins
 * check each state's before opening it.
 */
function otherStatesTickets(): SeedCredentialType[] {
  const rsa = (
    state: StateCode,
    name: string,
    hasExpiry: boolean,
    extra: Partial<SeedCredentialType> = {},
  ): SeedCredentialType => ({
    code: `rsa_${state.toLowerCase()}`,
    name,
    kind: "ticket",
    hasNumber: true,
    hasExpiry,
    description: hasExpiry
      ? "Responsible Service of Alcohol. Refreshed every three years: enter when the refresher is due."
      : "Responsible Service of Alcohol. Needed to serve alcohol.",
    state,
    family: RSA,
    ...extra,
  });
  const wwc = (
    state: StateCode,
    name: string,
    issuer?: string,
  ): SeedCredentialType => ({
    code: `wwcc_${state.toLowerCase()}`,
    name,
    kind: "wwcc",
    ...(issuer ? { issuer } : {}),
    hasNumber: true,
    hasExpiry: true,
    verification: "register_check",
    state,
    family: WWC,
  });
  const traffic = (
    state: StateCode,
    name: string,
    hasExpiry: boolean,
    issuer?: string,
  ): SeedCredentialType => ({
    code: `traffic_controller_${state.toLowerCase()}`,
    name,
    kind: "licence",
    ...(issuer ? { issuer } : {}),
    hasNumber: true,
    hasExpiry,
    state,
    family: TRAFFIC,
  });
  return [
    rsa("VIC", "RSA (Victoria)", true, { issuer: "Liquor Control Victoria" }),
    rsa("QLD", "RSA (Queensland)", false),
    rsa("WA", "RSA (Western Australia)", false),
    rsa("SA", "RSA (South Australia)", false),
    rsa("TAS", "RSA (Tasmania)", false),
    rsa("ACT", "RSA (ACT)", true),
    rsa("NT", "RSA (Northern Territory)", true),
    wwc("VIC", "Working with Children Check (Victoria)"),
    wwc("QLD", "Blue Card (Queensland)", "Blue Card Services"),
    wwc("WA", "Working with Children Check (WA)", "Department of Communities"),
    wwc("SA", "Working with Children Check (SA)"),
    wwc("TAS", "Registration to Work with Vulnerable People (Tasmania)"),
    wwc(
      "ACT",
      "Working with Vulnerable People registration (ACT)",
      "Access Canberra",
    ),
    wwc("NT", "Ochre Card (Northern Territory)"),
    traffic("VIC", "Traffic controller (Victoria)", false),
    traffic(
      "QLD",
      "Traffic controller accreditation (Queensland)",
      true,
      "Department of Transport and Main Roads",
    ),
    traffic(
      "WA",
      "Traffic controller accreditation (WA)",
      false,
      "Main Roads Western Australia",
    ),
    traffic("SA", "Traffic controller (South Australia)", false),
    traffic("TAS", "Traffic controller (Tasmania)", false),
    traffic("ACT", "Traffic controller (ACT)", false),
    traffic("NT", "Traffic controller (Northern Territory)", false),
  ];
}

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
  { code: "hot_surfaces", name: "Hot surfaces, liquids or oil" },
  { code: "knives_sharp_tools", name: "Knives and sharp tools" },
  { code: "moving_vehicles", name: "Forklifts or moving vehicles" },
  { code: "live_traffic", name: "Live traffic" },
  { code: "cold_storage", name: "Cold storage or freezers" },
  { code: "wet_floors", name: "Wet or slippery floors" },
  { code: "large_crowds", name: "Large crowds" },
  { code: "repetitive_work", name: "Repetitive work or long periods standing" },
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
  { code: "non_slip_shoes", name: "Non-slip shoes" },
];

export type SeedIndustry = {
  code: string;
  name: string;
  /** One line for lists and cards. */
  summary: string;
  /** A paragraph for the industry's page on the website. */
  description: string;
  /** An icon name from src/config/industry-icons.ts. */
  icon: string;
};

export const INDUSTRIES: SeedIndustry[] = [
  {
    code: "hospitality",
    name: "Hospitality",
    summary:
      "Bar, floor, kitchen and housekeeping staff for venues, hotels and caterers.",
    description:
      "Cafés, restaurants, pubs, hotels and caterers book bar, floor, kitchen and housekeeping staff for a busy night, a function or a whole season. Bar staff hold a current NSW RSA.",
    icon: "utensils",
  },
  {
    code: "events",
    name: "Events",
    summary: "Crews for festivals, conferences, weddings and sport.",
    description:
      "Event staff and bump-in crews for festivals, conferences, weddings, concerts and sport. Book one person or a full crew, for one night or a whole run.",
    icon: "party-popper",
  },
  {
    code: "warehousing_logistics",
    name: "Warehousing and logistics",
    summary:
      "Pick-packers, storepersons, forklift drivers and removalist offsiders.",
    description:
      "Pick-packers, storepersons, forklift drivers and removalist offsiders for warehouses, distribution centres and peak seasons. Forklift shifts go only to licensed drivers.",
    icon: "package",
  },
  {
    code: "manufacturing",
    name: "Manufacturing",
    summary: "Process workers and packers for production lines.",
    description:
      "Process workers and packers for factories and food production, from one shift to cover a gap to extra hands for a big order.",
    icon: "factory",
  },
  {
    code: "retail",
    name: "Retail",
    summary: "Sales assistants, stocktake teams and merchandisers.",
    description:
      "Sales assistants for busy trading periods, and stocktake teams and merchandisers for stores, centres and pop-ups.",
    icon: "shopping-bag",
  },
  {
    code: "cleaning",
    name: "Cleaning",
    summary: "Commercial and builders cleaners.",
    description:
      "Commercial cleaners for offices, venues and sites, and builders cleaners who get new and renovated spaces ready to hand over.",
    icon: "sparkles",
  },
  {
    code: "construction",
    name: "Construction and labouring",
    summary:
      "Labourers, trades assistants and traffic controllers with the right tickets.",
    description:
      "Labourers, trades assistants and traffic controllers for building sites, civil works and fit-outs. Every worker holds a White Card, and traffic controllers hold a current card.",
    icon: "hard-hat",
  },
  {
    code: "office_admin",
    name: "Office and admin",
    summary: "Receptionists, admin assistants and data entry staff.",
    description:
      "Receptionists, administration assistants and data entry staff to cover leave, busy periods and projects.",
    icon: "briefcase",
  },
  {
    code: "restoration",
    name: "Restoration",
    summary: "Labourers and technicians for water, fire and storm damage.",
    description:
      "Restoration labourers and technicians, strip-out crews and pack-out teams for water, fire, mould and storm damage, including urgent call-outs.",
    icon: "droplets",
  },
];

export type SeedCategory = {
  code: string;
  name: string;
  /** The industry's code. */
  industry: string;
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
    industry: "restoration",
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
    industry: "restoration",
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
    industry: "restoration",
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
    industry: "restoration",
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
    industry: "restoration",
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
    industry: "cleaning",
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
    industry: "construction",
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
    industry: "warehousing_logistics",
    name: "Removalist offsider",
    description:
      "Lifting, carrying and loading furniture and boxes alongside a removalist.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots"],
  },
  // Other industries (30/10/2026).
  {
    code: "food_beverage_attendant",
    name: "Waiter and food and beverage attendant",
    industry: "hospitality",
    description:
      "Taking orders, serving food and drinks, clearing and resetting tables.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: [],
    defaultPpe: ["non_slip_shoes"],
  },
  {
    code: "bartender",
    name: "Bartender",
    industry: "hospitality",
    description:
      "Pouring beer and wine, making drinks, and keeping the bar stocked and clean.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: ["rsa_nsw"],
    defaultPpe: ["non_slip_shoes"],
  },
  {
    code: "barista",
    name: "Barista",
    industry: "hospitality",
    description: "Making espresso coffee to a café standard, at speed.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: [],
    defaultPpe: ["non_slip_shoes"],
  },
  {
    code: "kitchen_hand",
    name: "Kitchen hand",
    industry: "hospitality",
    description: "Washing up, food preparation and keeping the kitchen clean.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: [],
    defaultPpe: ["non_slip_shoes"],
  },
  {
    code: "cook",
    name: "Cook",
    industry: "hospitality",
    description:
      "Cooking on a section or line, following the venue's recipes and food safety rules.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: [],
    defaultPpe: ["non_slip_shoes"],
  },
  {
    code: "room_attendant",
    name: "Housekeeping room attendant",
    industry: "hospitality",
    description: "Cleaning and making up hotel rooms to the hotel's standard.",
    policeCheckRequired: false,
    minEngagementHours: 2,
    requiredCredentials: [],
    defaultPpe: ["nitrile_gloves"],
  },
  {
    code: "event_staff",
    name: "Event staff",
    industry: "events",
    description:
      "Ushering, ticket scanning, cloakroom, information points and crowd flow.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "bump_in_crew",
    name: "Bump-in and bump-out crew",
    industry: "events",
    description:
      "Setting up and packing down staging, furniture, fencing and equipment.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots", "hi_vis"],
  },
  {
    code: "pick_packer",
    name: "Warehouse pick-packer",
    industry: "warehousing_logistics",
    description:
      "Picking orders with a scanner, packing and labelling them for dispatch.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots", "hi_vis"],
  },
  {
    code: "storeperson",
    name: "Storeperson",
    industry: "warehousing_logistics",
    description:
      "Receiving and checking deliveries, putting stock away and stocktakes.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots", "hi_vis"],
  },
  {
    code: "forklift_driver",
    name: "Forklift driver",
    industry: "warehousing_logistics",
    description:
      "Loading and unloading trucks and moving stock with a counterbalance or reach forklift.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["forklift_lf"],
    defaultPpe: ["steel_cap_boots", "hi_vis"],
  },
  {
    code: "process_worker",
    name: "Process worker",
    industry: "manufacturing",
    description:
      "Working on a production line: feeding, checking and finishing products.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots", "hearing_protection"],
  },
  {
    code: "production_packer",
    name: "Production packer",
    industry: "manufacturing",
    description: "Packing, labelling and palletising finished goods.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: [],
    defaultPpe: ["steel_cap_boots"],
  },
  {
    code: "retail_assistant",
    name: "Retail sales assistant",
    industry: "retail",
    description:
      "Serving customers, working the register and keeping the floor stocked.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "stocktake_counter",
    name: "Stocktake counter",
    industry: "retail",
    description: "Counting stock accurately with a scanner, often after hours.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "merchandiser",
    name: "Merchandiser",
    industry: "retail",
    description: "Setting up displays, filling shelves and changing ticketing.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "builders_cleaner",
    name: "Builders cleaner",
    industry: "cleaning",
    description:
      "Cleaning new and renovated buildings ready for handover: dust, paint and debris.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card"],
    defaultPpe: ["steel_cap_boots", "hi_vis", "p2_disposable"],
  },
  {
    code: "general_labourer",
    name: "General labourer",
    industry: "construction",
    description:
      "Site clean-up, carrying materials, loading skips and helping the trades.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card"],
    defaultPpe: ["steel_cap_boots", "hi_vis", "hard_hat", "safety_glasses"],
  },
  {
    code: "traffic_controller",
    name: "Traffic controller",
    industry: "construction",
    description:
      "Controlling traffic with a stop-slow bat at roadworks and site entries.",
    policeCheckRequired: false,
    minEngagementHours: 4,
    requiredCredentials: ["white_card", "traffic_controller"],
    defaultPpe: ["steel_cap_boots", "hi_vis"],
  },
  {
    code: "receptionist",
    name: "Receptionist",
    industry: "office_admin",
    description: "Greeting visitors, answering phones and managing bookings.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "admin_assistant",
    name: "Administration assistant",
    industry: "office_admin",
    description: "Filing, emails, scheduling and general office support.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
  {
    code: "data_entry_operator",
    name: "Data entry operator",
    industry: "office_admin",
    description: "Entering and checking data accurately and quickly.",
    policeCheckRequired: false,
    minEngagementHours: 3,
    requiredCredentials: [],
    defaultPpe: [],
  },
];
