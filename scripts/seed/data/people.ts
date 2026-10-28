import type { OnboardingStepKey } from "../../../src/domain/onboarding";

/**
 * Demo people. Everyone is fictional:
 * - emails use the reserved .test domain (demo "Sign in as" only accepts these)
 * - mobiles are from the ACMA range set aside for fiction (0491 57x xxx)
 * - landlines are from the fictional 02 5550 xxxx range
 *
 * Phase 0 creates their logins and profiles. Phase 1 steps add the rest
 * (worker details, tickets, businesses, sites) from the same data.
 */

export type SeedAdmin = { fullName: string; email: string };

export const ADMINS: SeedAdmin[] = [
  { fullName: "Alex Morgan", email: "alex.morgan@demo.test" },
  { fullName: "Priya Shah", email: "priya.shah@demo.test" },
];

export type SeedBusiness = {
  abn: string;
  tradingName: string;
  suburb: string;
  /** Approval status once businesses exist (step 1.4). */
  status: "approved" | "pending";
  accountsEmail: string;
  phone: string;
  people: {
    fullName: string;
    email: string;
    role: "owner" | "manager" | "supervisor";
    /** Supervisors: the sites (by name) they look after. */
    sites?: string[];
  }[];
  /** Street address plus suburb, as typed into the address picker. */
  sites: {
    name: string;
    address: string;
    accessNotes?: string;
    parkingNotes?: string;
  }[];
};

export const BUSINESSES: SeedBusiness[] = [
  {
    abn: "90551661605",
    tradingName: "Harbour Restoration",
    suburb: "Parramatta",
    status: "approved",
    accountsEmail: "accounts.harbour@demo.test",
    phone: "+61255500101",
    people: [
      {
        fullName: "Mark Davies",
        email: "mark.davies@demo.test",
        role: "owner",
      },
      {
        fullName: "Lisa Nguyen",
        email: "lisa.nguyen@demo.test",
        role: "manager",
      },
      {
        fullName: "Tom Walsh",
        email: "tom.walsh@demo.test",
        role: "supervisor",
        sites: ["Granville flood job"],
      },
    ],
    sites: [
      {
        name: "Parramatta depot",
        address: "18 Church St, Parramatta",
        accessNotes: "Sign in at the front office. Induction is 15 minutes.",
        parkingNotes: "Staff parking at the back, off Macquarie St.",
      },
      {
        name: "Granville flood job",
        address: "42 Parramatta Rd, Granville",
        accessNotes: "Report to the site container at the driveway.",
        parkingNotes: "Street parking only.",
      },
    ],
  },
  {
    abn: "87192327523",
    tradingName: "Westside Cleaning",
    suburb: "Blacktown",
    status: "approved",
    accountsEmail: "accounts.westside@demo.test",
    phone: "+61255500202",
    people: [
      {
        fullName: "Sofia Rossi",
        email: "sofia.rossi@demo.test",
        role: "owner",
      },
      {
        fullName: "Daniel Kim",
        email: "daniel.kim@demo.test",
        role: "manager",
      },
    ],
    sites: [
      {
        name: "Blacktown office tower",
        address: "35 Main St, Blacktown",
        accessNotes:
          "Building security will let you in through the loading dock.",
        parkingNotes:
          "Loading dock bays for 30 minutes, then the public car park.",
      },
    ],
  },
  {
    abn: "28322761077",
    tradingName: "Beaches Make Safe",
    suburb: "Brookvale",
    status: "approved",
    accountsEmail: "accounts.beaches@demo.test",
    phone: "+61255500303",
    people: [
      {
        fullName: "Craig Thompson",
        email: "craig.thompson@demo.test",
        role: "owner",
      },
      {
        fullName: "Ella Brooks",
        email: "ella.brooks@demo.test",
        role: "supervisor",
        sites: ["Manly storm repairs"],
      },
    ],
    sites: [
      {
        name: "Brookvale warehouse",
        address: "7 Winbourne Rd, Brookvale",
        parkingNotes: "Plenty of parking in the yard.",
      },
      {
        name: "Manly storm repairs",
        address: "60 Pittwater Rd, Manly",
        accessNotes: "Meet the supervisor on the front steps.",
      },
    ],
  },
  {
    abn: "50893268002",
    tradingName: "Southern Cross Pack-out",
    suburb: "Sutherland",
    status: "approved",
    accountsEmail: "accounts.southerncross@demo.test",
    phone: "+61255500404",
    people: [
      { fullName: "Hannah Lee", email: "hannah.lee@demo.test", role: "owner" },
    ],
    sites: [
      {
        name: "Sutherland storage",
        address: "9 Eton St, Sutherland",
        accessNotes: "Roller door at the side. Call when you arrive.",
      },
    ],
  },
  {
    abn: "21533645048",
    tradingName: "JP Carpet Care",
    suburb: "Mount Druitt",
    status: "pending",
    accountsEmail: "jordan.parker@demo.test",
    phone: "+61255500505",
    people: [
      {
        fullName: "Jordan Parker",
        email: "jordan.parker@demo.test",
        role: "owner",
      },
    ],
    sites: [
      {
        name: "Home base",
        address: "14 Luxford Rd, Mount Druitt",
      },
    ],
  },
];

export type SeedTicket = {
  code: string;
  status: "verified" | "pending" | "rejected" | "expired";
  /** Days from the seed date; negative means already expired. */
  expiresInDays?: number;
  issuedDaysAgo?: number;
  rejectionReason?: string;
};

export type SeedRightToWork =
  | { basis: "citizen" }
  | {
      basis: "visa";
      subclass: string;
      label: string;
      /** null: no expiry (e.g. permanent residents, some bridging visas). */
      expiresInDays: number | null;
      conditions?: string;
      passportCountry: string;
    };

export type SeedWorker = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  suburb: string;
  dateOfBirth: string;
  status: "draft" | "pending" | "active" | "suspended";
  rightToWork: SeedRightToWork;
  categories: { code: string; years: number }[];
  tickets: SeedTicket[];
  transport: {
    car: boolean;
    licenceClass?: "C" | "MR" | "HR";
    publicTransport: boolean;
  };
  travelRadiusKm: number;
  urgentOptIn: boolean;
  bio?: string;
  /** Draft workers only: the onboarding steps they've finished so far. */
  stepsDone?: OnboardingStepKey[];
};

const citizen: SeedRightToWork = { basis: "citizen" };

export const WORKERS: SeedWorker[] = [
  {
    firstName: "Liam",
    lastName: "O'Brien",
    email: "liam.obrien@demo.test",
    phone: "+61491570006",
    suburb: "Parramatta",
    dateOfBirth: "1994-03-12",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "restoration_labourer", years: 4 },
      { code: "strip_out_demolition", years: 2 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 1800 },
      { code: "asbestos_awareness", status: "verified", issuedDaysAgo: 600 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: true },
    travelRadiusKm: 30,
    urgentOptIn: true,
    bio: "Four years on water damage jobs around Western Sydney. Happy to start early.",
  },
  {
    firstName: "Mei",
    lastName: "Chen",
    email: "mei.chen@demo.test",
    phone: "+61491570156",
    suburb: "Chatswood",
    dateOfBirth: "1988-11-02",
    status: "active",
    rightToWork: {
      basis: "visa",
      subclass: "186",
      label: "Employer Nomination Scheme (permanent)",
      expiresInDays: null,
      passportCountry: "Singapore",
    },
    categories: [
      { code: "commercial_cleaner", years: 6 },
      { code: "contents_packout", years: 2 },
    ],
    tickets: [{ code: "police_check", status: "verified", issuedDaysAgo: 120 }],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
  },
  {
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@demo.test",
    phone: "+61491570157",
    suburb: "Bankstown",
    dateOfBirth: "1990-06-21",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "restoration_technician", years: 7 }],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 2500 },
      { code: "iicrc_wrt", status: "verified", expiresInDays: 12 },
      { code: "iicrc_asd", status: "verified", expiresInDays: 220 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 45,
    urgentOptIn: true,
    bio: "WRT and ASD certified technician. Own moisture meter.",
  },
  {
    firstName: "Sophie",
    lastName: "Williams",
    email: "sophie.williams@demo.test",
    phone: "+61491570158",
    suburb: "Penrith",
    dateOfBirth: "1997-09-30",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "contents_packout", years: 3 },
      { code: "removalist_offsider", years: 1 },
    ],
    tickets: [
      { code: "police_check", status: "verified", issuedDaysAgo: 90 },
      { code: "driver_licence_c", status: "verified", expiresInDays: 900 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 40,
    urgentOptIn: false,
  },
  {
    firstName: "Jack",
    lastName: "Thompson",
    email: "jack.thompson@demo.test",
    phone: "+61491570159",
    suburb: "Liverpool",
    dateOfBirth: "1992-01-17",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "strip_out_demolition", years: 5 },
      { code: "trades_assistant", years: 3 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 3000 },
      { code: "asbestos_awareness", status: "verified", issuedDaysAgo: 400 },
      { code: "working_at_heights", status: "verified", issuedDaysAgo: 300 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 35,
    urgentOptIn: true,
  },
  {
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@demo.test",
    phone: "+61491570110",
    suburb: "Blacktown",
    dateOfBirth: "1999-05-08",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "commercial_cleaner", years: 2 }],
    tickets: [],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
  },
  {
    firstName: "Minh",
    lastName: "Nguyen",
    email: "minh.nguyen@demo.test",
    phone: "+61491570313",
    suburb: "Cabramatta",
    dateOfBirth: "1986-12-03",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "restoration_labourer", years: 3 },
      { code: "mould_remediation_assistant", years: 2 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 1500 },
      { code: "respirator_fit_test", status: "verified", expiresInDays: 5 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: true },
    travelRadiusKm: 30,
    urgentOptIn: true,
  },
  {
    firstName: "Olivia",
    lastName: "Brown",
    email: "olivia.brown@demo.test",
    phone: "+61491570737",
    suburb: "Manly",
    dateOfBirth: "2001-02-14",
    status: "pending",
    rightToWork: citizen,
    categories: [{ code: "contents_packout", years: 1 }],
    tickets: [{ code: "police_check", status: "pending", issuedDaysAgo: 60 }],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
  },
  {
    firstName: "Daniel",
    lastName: "Kowalski",
    email: "daniel.kowalski@demo.test",
    phone: "+61491571266",
    suburb: "Sutherland",
    dateOfBirth: "1983-08-25",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "trades_assistant", years: 10 },
      { code: "strip_out_demolition", years: 6 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 4000 },
      { code: "asbestos_awareness", status: "verified", issuedDaysAgo: 900 },
      { code: "first_aid", status: "expired", expiresInDays: -10 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 40,
    urgentOptIn: true,
  },
  {
    firstName: "Fatima",
    lastName: "Al-Sayed",
    email: "fatima.alsayed@demo.test",
    phone: "+61491571491",
    suburb: "Auburn",
    dateOfBirth: "1995-04-19",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "commercial_cleaner", years: 4 }],
    tickets: [],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
  },
  {
    firstName: "Ethan",
    lastName: "Murphy",
    email: "ethan.murphy@demo.test",
    phone: "+61491571804",
    suburb: "Campbelltown",
    dateOfBirth: "2000-10-10",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "restoration_labourer", years: 1 }],
    tickets: [{ code: "white_card", status: "verified", issuedDaysAgo: 400 }],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 50,
    urgentOptIn: true,
  },
  {
    firstName: "Grace",
    lastName: "Kim",
    email: "grace.kim@demo.test",
    phone: "+61491572549",
    suburb: "Hornsby",
    dateOfBirth: "1993-07-07",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "mould_remediation_assistant", years: 3 }],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 1200 },
      { code: "respirator_fit_test", status: "verified", expiresInDays: 200 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: true },
    travelRadiusKm: 30,
    urgentOptIn: false,
  },
  {
    firstName: "Lachlan",
    lastName: "Ross",
    email: "lachlan.ross@demo.test",
    phone: "+61491572665",
    suburb: "Castle Hill",
    dateOfBirth: "1987-02-28",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "restoration_technician", years: 9 },
      { code: "mould_remediation_assistant", years: 4 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 3500 },
      { code: "iicrc_wrt", status: "verified", expiresInDays: 300 },
      { code: "iicrc_amrt", status: "verified", expiresInDays: 150 },
      { code: "respirator_fit_test", status: "verified", expiresInDays: 90 },
    ],
    transport: { car: true, licenceClass: "MR", publicTransport: false },
    travelRadiusKm: 60,
    urgentOptIn: true,
    bio: "Senior restoration tech, WRT and AMRT.",
  },
  {
    firstName: "Aisha",
    lastName: "Rahman",
    email: "aisha.rahman@demo.test",
    phone: "+61491572983",
    suburb: "Granville",
    dateOfBirth: "1996-12-15",
    status: "active",
    rightToWork: {
      basis: "visa",
      subclass: "010",
      label: "Bridging visa A",
      expiresInDays: null,
      conditions: "No work limitation",
      passportCountry: "Malaysia",
    },
    categories: [
      { code: "commercial_cleaner", years: 3 },
      { code: "contents_packout", years: 1 },
    ],
    tickets: [{ code: "police_check", status: "verified", issuedDaysAgo: 85 }],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
  },
  {
    firstName: "Tom",
    lastName: "Nguyen",
    email: "tom.nguyen@demo.test",
    phone: "+61491573770",
    suburb: "Fairfield",
    dateOfBirth: "1991-03-03",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "removalist_offsider", years: 5 }],
    tickets: [
      { code: "driver_licence_c", status: "verified", expiresInDays: 1200 },
      { code: "forklift_lf", status: "verified", expiresInDays: 700 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 35,
    urgentOptIn: false,
  },
  {
    firstName: "Chloe",
    lastName: "Martin",
    email: "chloe.martin@demo.test",
    phone: "+61491573087",
    suburb: "Marrickville",
    dateOfBirth: "1998-06-02",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "commercial_cleaner", years: 3 }],
    tickets: [{ code: "wwcc", status: "verified", expiresInDays: 1500 }],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
  },
  {
    firstName: "Mohammed",
    lastName: "Ali",
    email: "mohammed.ali@demo.test",
    phone: "+61491574118",
    suburb: "Bankstown",
    dateOfBirth: "1989-09-09",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "strip_out_demolition", years: 2 }],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 700 },
      { code: "asbestos_awareness", status: "pending", issuedDaysAgo: 3 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 30,
    urgentOptIn: true,
  },
  {
    firstName: "Isabella",
    lastName: "Rossi",
    email: "isabella.rossi@demo.test",
    phone: "+61491574632",
    suburb: "Leichhardt",
    dateOfBirth: "2002-01-25",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "contents_packout", years: 2 }],
    tickets: [{ code: "police_check", status: "verified", issuedDaysAgo: 30 }],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
  },
  {
    firstName: "Ben",
    lastName: "Carter",
    email: "ben.carter@demo.test",
    phone: "+61491575254",
    suburb: "Windsor",
    dateOfBirth: "1985-11-11",
    status: "active",
    rightToWork: citizen,
    categories: [
      { code: "restoration_labourer", years: 6 },
      { code: "removalist_offsider", years: 4 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 2200 },
      { code: "driver_licence_mr", status: "verified", expiresInDays: 600 },
    ],
    transport: { car: true, licenceClass: "MR", publicTransport: false },
    travelRadiusKm: 60,
    urgentOptIn: true,
  },
  {
    firstName: "Hannah",
    lastName: "Schmidt",
    email: "hannah.schmidt@demo.test",
    phone: "+61491575789",
    suburb: "Ryde",
    dateOfBirth: "1994-04-04",
    status: "active",
    rightToWork: citizen,
    categories: [{ code: "commercial_cleaner", years: 5 }],
    tickets: [{ code: "first_aid", status: "verified", expiresInDays: 25 }],
    transport: { car: true, licenceClass: "C", publicTransport: true },
    travelRadiusKm: 25,
    urgentOptIn: false,
  },
  {
    firstName: "Rangi",
    lastName: "Parata",
    email: "rangi.parata@demo.test",
    phone: "+61491576398",
    suburb: "Mount Druitt",
    dateOfBirth: "1990-08-18",
    status: "active",
    rightToWork: {
      basis: "visa",
      subclass: "444",
      label: "Special Category (New Zealand citizen)",
      expiresInDays: null,
      passportCountry: "New Zealand",
    },
    categories: [
      { code: "restoration_labourer", years: 5 },
      { code: "strip_out_demolition", years: 5 },
    ],
    tickets: [
      { code: "white_card", status: "verified", issuedDaysAgo: 2600 },
      { code: "asbestos_awareness", status: "verified", issuedDaysAgo: 1000 },
      { code: "working_at_heights", status: "verified", issuedDaysAgo: 500 },
    ],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 40,
    urgentOptIn: true,
  },
  {
    firstName: "Sanjay",
    lastName: "Kumar",
    email: "sanjay.kumar@demo.test",
    phone: "+61491576801",
    suburb: "Seven Hills",
    dateOfBirth: "1997-03-27",
    status: "pending",
    rightToWork: citizen,
    categories: [{ code: "trades_assistant", years: 1 }],
    tickets: [{ code: "white_card", status: "pending", issuedDaysAgo: 20 }],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 30,
    urgentOptIn: false,
  },
  {
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@demo.test",
    phone: "+61491577426",
    suburb: "Kellyville",
    dateOfBirth: "2003-07-19",
    status: "pending",
    rightToWork: citizen,
    categories: [{ code: "commercial_cleaner", years: 0 }],
    tickets: [],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
  },
  {
    firstName: "Kenji",
    lastName: "Tanaka",
    email: "kenji.tanaka@demo.test",
    phone: "+61491577644",
    suburb: "Strathfield",
    dateOfBirth: "2000-12-01",
    status: "pending",
    rightToWork: {
      basis: "visa",
      subclass: "500",
      label: "Student visa",
      expiresInDays: 400,
      conditions:
        "8105: work limited to 48 hours per fortnight during study periods",
      passportCountry: "Japan",
    },
    categories: [{ code: "mould_remediation_assistant", years: 1 }],
    tickets: [
      { code: "white_card", status: "pending", issuedDaysAgo: 40 },
      { code: "respirator_fit_test", status: "pending", expiresInDays: 330 },
    ],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
  },
  {
    firstName: "Zoe",
    lastName: "Anderson",
    email: "zoe.anderson@demo.test",
    phone: "+61491578957",
    suburb: "Bondi",
    dateOfBirth: "1999-10-05",
    status: "pending",
    rightToWork: citizen,
    categories: [{ code: "contents_packout", years: 2 }],
    tickets: [
      {
        code: "police_check",
        status: "rejected",
        issuedDaysAgo: 500,
        rejectionReason:
          "This check is more than 12 months old. Upload a check issued in the last 12 months.",
      },
    ],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
  },
  {
    firstName: "Carlos",
    lastName: "Mendes",
    email: "carlos.mendes@demo.test",
    phone: "+61491578148",
    suburb: "Prestons",
    dateOfBirth: "1992-05-23",
    status: "pending",
    rightToWork: {
      basis: "visa",
      subclass: "189",
      label: "Skilled Independent (permanent)",
      expiresInDays: null,
      passportCountry: "Brazil",
    },
    categories: [{ code: "restoration_labourer", years: 2 }],
    tickets: [{ code: "white_card", status: "pending", issuedDaysAgo: 15 }],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 35,
    urgentOptIn: true,
  },
  {
    firstName: "Ava",
    lastName: "Wilson",
    email: "ava.wilson@demo.test",
    phone: "+61491578888",
    suburb: "Cronulla",
    dateOfBirth: "2004-02-09",
    status: "draft",
    rightToWork: citizen,
    categories: [],
    tickets: [],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 20,
    urgentOptIn: false,
    stepsDone: ["about", "contact"],
  },
  {
    firstName: "Noah",
    lastName: "Jackson",
    email: "noah.jackson@demo.test",
    phone: "+61491579212",
    suburb: "St Marys",
    dateOfBirth: "1998-08-08",
    status: "draft",
    rightToWork: citizen,
    categories: [{ code: "removalist_offsider", years: 1 }],
    tickets: [],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 30,
    urgentOptIn: false,
    stepsDone: [
      "about",
      "contact",
      "travel",
      "right-to-work",
      "identity",
      "work-types",
    ],
  },
  {
    firstName: "Lucy",
    lastName: "Tran",
    email: "lucy.tran@demo.test",
    phone: "+61491579760",
    suburb: "Hurstville",
    dateOfBirth: "2001-11-30",
    status: "draft",
    rightToWork: citizen,
    categories: [],
    tickets: [],
    transport: { car: false, publicTransport: true },
    travelRadiusKm: 15,
    urgentOptIn: false,
    stepsDone: [],
  },
  {
    firstName: "Josh",
    lastName: "Kelly",
    email: "josh.kelly@demo.test",
    phone: "+61491579455",
    suburb: "Narellan",
    dateOfBirth: "1995-06-16",
    status: "suspended",
    rightToWork: citizen,
    categories: [{ code: "restoration_labourer", years: 2 }],
    tickets: [{ code: "white_card", status: "verified", issuedDaysAgo: 900 }],
    transport: { car: true, licenceClass: "C", publicTransport: false },
    travelRadiusKm: 40,
    urgentOptIn: true,
  },
];

export function workerFullName(worker: SeedWorker): string {
  return `${worker.firstName} ${worker.lastName}`;
}
