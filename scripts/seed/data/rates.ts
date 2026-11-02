/** NSW public holidays. Check against the NSW Government list each year. */
export const NSW_PUBLIC_HOLIDAYS: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Easter Saturday" },
  { date: "2026-04-05", name: "Easter Sunday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "Anzac Day" },
  { date: "2026-06-08", name: "King's Birthday" },
  { date: "2026-10-05", name: "Labour Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-28", name: "Additional day (Boxing Day)" },
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-26", name: "Australia Day" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-27", name: "Easter Saturday" },
  { date: "2027-03-28", name: "Easter Sunday" },
  { date: "2027-03-29", name: "Easter Monday" },
  { date: "2027-04-25", name: "Anzac Day" },
  { date: "2027-06-14", name: "King's Birthday" },
  { date: "2027-10-04", name: "Labour Day" },
  { date: "2027-12-25", name: "Christmas Day" },
  { date: "2027-12-26", name: "Boxing Day" },
  { date: "2027-12-27", name: "Additional day (Christmas Day)" },
  { date: "2027-12-28", name: "Additional day (Boxing Day)" },
];

/**
 * PLACEHOLDER default pay rates (level 1, excluding casual loading), in
 * cents per hour, from before the accountant-checked cards: they price
 * demo shifts dated before those cards start (AWARD_RATE_CARDS_EFFECTIVE_FROM).
 * Only the focus work types with checked cards have them (owner, 02/11/2026):
 * the warehouse work types wait for their award's rates, and can't be posted
 * until a checked card is added in Admin → Rates.
 */
export const DEFAULT_BASE_RATES_CENTS: Record<string, number> = {
  restoration_technician: 3050,
  commercial_cleaner: 2600,
  builders_cleaner: 2700,
  general_labourer: 2900,
  removalist_offsider: 2600,
};

export const RATE_CARDS_EFFECTIVE_FROM = "2026-07-01";

/**
 * The award rules and rates on a rate card: the columns of `rate_cards`
 * other than the work type, level, base rate and dates.
 */
type AwardColumns = {
  ordinary_multiplier: number;
  saturday_multiplier: number;
  sunday_multiplier: number;
  public_holiday_multiplier: number;
  overtime_multiplier: number;
  night_multiplier: number;
  saturday_after_multiplier: number | null;
  overtime_after_multiplier: number | null;
  early_late_multiplier: number | null;
  night_shift_multiplier: number | null;
  tier_hours: number;
  overtime_after_hours: number | null;
  saturday_later_from: string | null;
  ordinary_from: string | null;
  ordinary_to: string | null;
  early_late_starts_before: string | null;
  early_late_finishes_after: string | null;
  night_shift_finishes_by: string | null;
};

export type AwardRateCard = {
  /** The work types that use this card. */
  codes: string[];
  level: number;
  baseRateCents: number;
  columns: AwardColumns;
  notes: string;
};

/**
 * Each award's casual rates as multipliers (including casual loading). The
 * night multiplier equals ordinary, so the general night hours setting adds
 * nothing: the awards pay for a whole early, late or night shift instead, or
 * pay overtime outside ordinary hours.
 */
const CLEANING_AWARD: AwardColumns = {
  ordinary_multiplier: 1.25,
  saturday_multiplier: 1.75,
  sunday_multiplier: 2.25,
  public_holiday_multiplier: 2.75,
  overtime_multiplier: 1.75,
  night_multiplier: 1.25,
  saturday_after_multiplier: null,
  overtime_after_multiplier: 2.25,
  early_late_multiplier: 1.4,
  night_shift_multiplier: 1.55,
  tier_hours: 2,
  overtime_after_hours: 7.6,
  saturday_later_from: null,
  ordinary_from: null,
  ordinary_to: null,
  early_late_starts_before: "06:00",
  early_late_finishes_after: "18:00",
  night_shift_finishes_by: "08:00",
};

const BUILDING_AWARD: AwardColumns = {
  ordinary_multiplier: 1.25,
  saturday_multiplier: 1.75,
  sunday_multiplier: 2.25,
  public_holiday_multiplier: 2.75,
  overtime_multiplier: 1.75,
  night_multiplier: 1.25,
  saturday_after_multiplier: 2.25,
  overtime_after_multiplier: 2.25,
  early_late_multiplier: null,
  night_shift_multiplier: null,
  tier_hours: 2,
  overtime_after_hours: 8,
  saturday_later_from: "12:00",
  ordinary_from: "07:00",
  ordinary_to: "18:00",
  early_late_starts_before: null,
  early_late_finishes_after: null,
  night_shift_finishes_by: null,
};

const TRANSPORT_AWARD: AwardColumns = {
  ordinary_multiplier: 1.25,
  saturday_multiplier: 1.75,
  sunday_multiplier: 2.25,
  public_holiday_multiplier: 2.75,
  overtime_multiplier: 1.6,
  night_multiplier: 1.25,
  saturday_after_multiplier: null,
  overtime_after_multiplier: 2.1,
  early_late_multiplier: null,
  night_shift_multiplier: null,
  tier_hours: 2,
  overtime_after_hours: 7.6,
  saturday_later_from: null,
  ordinary_from: "05:30",
  ordinary_to: "18:30",
  early_late_starts_before: null,
  early_late_finishes_after: null,
  night_shift_finishes_by: null,
};

/**
 * The launch work types' rates (owner, 01/11/2026), checked by the owner's
 * accountant: each award's casual rate plus $0.50 an hour, from the Fair
 * Work Ombudsman pay guides effective 1 July 2026. The base rate is set so
 * the weekday rate is the award's plus $0.50; weekend, holiday, overtime and
 * shift rates follow from it, so they stay above the award too. Not hand-coded
 * award rules (brief §4.8): admins change them in Admin → Rates.
 */
export const AWARD_RATE_CARDS: AwardRateCard[] = [
  {
    codes: [
      "commercial_cleaner",
      "builders_cleaner",
      "restoration_labourer",
      "contents_packout",
      "strip_out_demolition",
      "mould_remediation_assistant",
    ],
    level: 1,
    baseRateCents: 2748,
    columns: CLEANING_AWARD,
    notes:
      "Cleaning Services Award 2020 [MA000022], cleaning service employee level 1, casual: pay guide effective 01/07/2026, plus $0.50 an hour. Overtime after 7.6 hours a day: 1.75 for the first 2 hours, then 2.25. Early or late shift: Monday to Friday, starting before 6 am or finishing after 6 pm. Night shift: finishing after midnight and by 8 am. To confirm with the accountant: overtime after 7.6 hours a day for casuals.",
  },
  {
    codes: ["restoration_technician"],
    level: 1,
    baseRateCents: 2837,
    columns: CLEANING_AWARD,
    notes:
      "Cleaning Services Award 2020 [MA000022], cleaning service employee level 2 (certified technician), casual: pay guide effective 01/07/2026, plus $0.50 an hour. Rules as for the level 1 cleaning card. To confirm with the accountant: overtime after 7.6 hours a day for casuals.",
  },
  {
    codes: ["general_labourer"],
    level: 1,
    baseRateCents: 2884,
    columns: BUILDING_AWARD,
    notes:
      "Building and Construction General On-site Award 2020 [MA000020], CW/ECW 1 (level a), general building and construction (not residential), casual, including the industry allowance: pay guide effective 01/07/2026, plus $0.50 an hour. Saturday: first 2 hours before noon at 1.75, then 2.25. Day work: hours outside 7 am to 6 pm on weekdays, or after 8 hours, are overtime (higher than the shift rates). Not in these rates: fares and travel allowance, $22.41 a day worked. To confirm with the accountant: ordinary hours 7 am to 6 pm, and overtime after 8 hours a day for casuals.",
  },
  {
    codes: ["removalist_offsider"],
    level: 1,
    baseRateCents: 2727,
    columns: TRANSPORT_AWARD,
    notes:
      "Road Transport and Distribution Award 2020 [MA000038], transport worker grade 1, casual: pay guide effective 01/07/2026, plus $0.50 an hour. Day work: hours outside 5:30 am to 6:30 pm on weekdays, or after 7.6 hours, are overtime (higher than the shift rates). Not in these rates: furniture carter allowance, $27.39 a week, if it applies. To confirm with the accountant: ordinary hours 5:30 am to 6:30 pm, and overtime after 7.6 hours a day for casuals.",
  },
];

export const AWARD_RATE_CARDS_EFFECTIVE_FROM = "2026-11-01";
export const AWARD_RATE_CARDS_CHECKED = {
  by: "Owner's accountant",
  on: "2026-11-01",
};
