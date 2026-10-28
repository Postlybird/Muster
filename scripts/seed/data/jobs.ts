/**
 * Demo jobs posted by the demo businesses. Dates are relative to the day the
 * seed runs; a business gets fresh ones whenever it has no upcoming work, so
 * the demo always has shifts to look at.
 */
export type SeedJob = {
  /** Trading name of the business (see people.ts). */
  business: string;
  site: string;
  /** Work type code (see catalogues.ts). */
  category: string;
  type: "single" | "multi_day" | "urgent";
  headcount: number;
  fillMode: "pick" | "auto";
  /** Days from today to the first shift. */
  startInDays: number;
  /** Multi-day jobs: how many weekdays in a row. */
  days?: number;
  start: string;
  end: string;
  breakMinutes: number;
  /** Hazard codes; none means "no known hazards". */
  hazards: string[];
  controls?: string;
  induction?: string;
  instructions: string;
  ppeSuppliedBy: "business" | "worker" | "both";
  favouritesFirstMinutes?: number;
  template?: string;
};

export const DEMO_JOBS: SeedJob[] = [
  {
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "restoration_labourer",
    type: "multi_day",
    headcount: 3,
    fillMode: "pick",
    startInDays: 3,
    days: 5,
    start: "07:00",
    end: "15:30",
    breakMinutes: 30,
    hazards: ["category_3_water", "mould", "heavy_manual_handling"],
    controls:
      "Contaminated areas are marked. Wash station on site. Two-person lifts for wet carpet and plaster.",
    induction: "Site induction with Tom at 6:45 am on the first day.",
    instructions:
      "Strip wet carpet and underlay, bag debris, and set up drying equipment across six ground-floor units.",
    ppeSuppliedBy: "business",
    favouritesFirstMinutes: 60,
    template: "Flood strip-out crew",
  },
  {
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "commercial_cleaner",
    type: "single",
    headcount: 2,
    fillMode: "auto",
    startInDays: 2,
    start: "18:00",
    end: "22:00",
    breakMinutes: 0,
    hazards: [],
    instructions:
      "After-hours clean of levels 3 and 4 after an office fit-out: vacuum, wipe down and empty bins.",
    ppeSuppliedBy: "worker",
  },
  {
    business: "Beaches Make Safe",
    site: "Manly storm repairs",
    category: "strip_out_demolition",
    type: "urgent",
    headcount: 2,
    fillMode: "auto",
    startInDays: 1,
    start: "06:00",
    end: "14:00",
    breakMinutes: 30,
    hazards: ["structural_damage", "heights"],
    controls:
      "Engineer has signed off the work zone. No work above two metres without the scaffold. Exclusion zone around the damaged roof.",
    instructions:
      "Remove storm-damaged ceilings and plasterboard from the ground floor, and load the skip.",
    ppeSuppliedBy: "both",
  },
  {
    business: "Southern Cross Pack-out",
    site: "Sutherland storage",
    category: "contents_packout",
    type: "single",
    headcount: 4,
    fillMode: "pick",
    startInDays: 4,
    start: "08:00",
    end: "16:00",
    breakMinutes: 30,
    hazards: ["heavy_manual_handling"],
    controls:
      "Trolleys and furniture dollies provided. Two-person lifts for anything over 20 kg.",
    instructions:
      "Unpack, sort and list household contents from a fire-affected home, ready for cleaning.",
    ppeSuppliedBy: "business",
  },
];
