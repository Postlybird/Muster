/**
 * Demo shifts already worked, so businesses have hours to approve and a
 * query for admins to settle (step 1.11). Dates are relative to the day
 * the seed runs; a business that already has timesheets is left alone.
 */
export type SeedWorkedShift = {
  /** Trading name and site of a demo business (see people.ts). */
  business: string;
  site: string;
  /** Work type code (see catalogues.ts). */
  category: string;
  daysAgo: number;
  start: string;
  end: string;
  breakMinutes: number;
  workers: {
    /** First and last name. */
    name: string;
    clockIn: string;
    /** None: they didn't clock out, so the rostered finish is used. */
    clockOut?: string;
    /** Left waiting for the business if not set. */
    outcome?: "approved" | "disputed";
    /** The business's reason for a query. */
    note?: string;
  }[];
};

export const DEMO_WORKED: SeedWorkedShift[] = [
  {
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "commercial_cleaner",
    daysAgo: 1,
    start: "18:00",
    end: "22:00",
    breakMinutes: 0,
    workers: [
      { name: "Priya Patel", clockIn: "17:55", clockOut: "22:04" },
      { name: "Hannah Schmidt", clockIn: "18:12" },
    ],
  },
  {
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "restoration_labourer",
    daysAgo: 8,
    start: "07:00",
    end: "15:30",
    breakMinutes: 30,
    workers: [
      {
        name: "Ethan Murphy",
        clockIn: "06:52",
        clockOut: "15:34",
        outcome: "approved",
      },
      {
        name: "Rangi Parata",
        clockIn: "07:01",
        clockOut: "15:30",
        outcome: "disputed",
        note: "Left at 2:30 pm to drop off a dehumidifier and didn't come back.",
      },
    ],
  },
];
