/**
 * Pay rates (brief §4.8). A rate card has a base hourly rate (excluding
 * casual loading) and a multiplier per day type (including casual loading).
 * All money is integer cents.
 */

export const DAY_TYPES = [
  "ordinary",
  "saturday",
  "sunday",
  "public_holiday",
  "overtime",
  "night",
] as const;

export type DayType = (typeof DAY_TYPES)[number];

export const dayTypeLabels: Record<DayType, string> = {
  ordinary: "Ordinary",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "Public holiday",
  overtime: "Overtime",
  night: "Night",
};

export type Multipliers = Record<DayType, number>;

export type RateCard = {
  baseRateCents: number;
  multipliers: Multipliers;
};

/** Multipliers are stored to 3 decimal places; work in thousandths to avoid float error. */
function thousandths(multiplier: number): number {
  return Math.round(multiplier * 1000);
}

/** Rounds half away from zero to a whole cent. */
function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Hourly pay in cents for a day type: base × multiplier, to the nearest cent. */
export function hourlyPayCents(card: RateCard, dayType: DayType): number {
  return roundCents(
    (card.baseRateCents * thousandths(card.multipliers[dayType])) / 1000,
  );
}

/** Hourly pay for every day type. */
export function hourlyPayTable(card: RateCard): Record<DayType, number> {
  return Object.fromEntries(
    DAY_TYPES.map((d) => [d, hourlyPayCents(card, d)]),
  ) as Record<DayType, number>;
}

/** Reads a rate card row from the database into a RateCard. */
export function rateCardFromRow(row: {
  base_rate_cents: number;
  ordinary_multiplier: number | string;
  saturday_multiplier: number | string;
  sunday_multiplier: number | string;
  public_holiday_multiplier: number | string;
  overtime_multiplier: number | string;
  night_multiplier: number | string;
}): RateCard {
  return {
    baseRateCents: row.base_rate_cents,
    multipliers: {
      ordinary: Number(row.ordinary_multiplier),
      saturday: Number(row.saturday_multiplier),
      sunday: Number(row.sunday_multiplier),
      public_holiday: Number(row.public_holiday_multiplier),
      overtime: Number(row.overtime_multiplier),
      night: Number(row.night_multiplier),
    },
  };
}
