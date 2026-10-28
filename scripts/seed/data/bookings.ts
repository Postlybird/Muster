/**
 * Demo applications and bookings on the demo jobs (see jobs.ts), so the
 * businesses have applicants to pick and booked workers to see. Liam
 * O'Brien is left free to try applying.
 */
export type SeedBooking = {
  /** Trading name and site of the demo job. */
  business: string;
  site: string;
  /** Workers (first and last name) who applied for every day they can do. */
  applied?: string[];
  /** Workers booked on every day they can do. */
  booked?: string[];
};

export const DEMO_BOOKINGS: SeedBooking[] = [
  {
    business: "Harbour Restoration",
    site: "Granville flood job",
    applied: ["Rangi Parata", "Minh Nguyen"],
    booked: ["Ethan Murphy"],
  },
  {
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    booked: ["Priya Patel"],
  },
];
