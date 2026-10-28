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

// ---------------------------------------------------------------------------
// Which card and bill rule apply to a shift
// ---------------------------------------------------------------------------

type Dated = { effective_from: string; effective_to: string | null };

function inEffect(row: Dated, date: string): boolean {
  return (
    row.effective_from <= date &&
    (!row.effective_to || row.effective_to >= date)
  );
}

/** The row with the latest start date, or null. */
function latest<T extends Dated>(rows: T[]): T | null {
  return (
    [...rows].sort((a, b) =>
      b.effective_from.localeCompare(a.effective_from),
    )[0] ?? null
  );
}

/**
 * The pay rate card for a shift on `date` (yyyy-mm-dd): the business's own
 * card for the category and level if one is in effect (brief §4.8 host
 * overrides), otherwise the standard card. The latest start date wins.
 * Null means there's no rate for that work, so it can't be posted.
 */
export function pickRateCard<
  T extends Dated & {
    business_id: string | null;
    category_id: string;
    level: number;
  },
>(
  cards: readonly T[],
  shift: {
    businessId: string;
    categoryId: string;
    level: number;
    date: string;
  },
): T | null {
  const matching = cards.filter(
    (card) =>
      card.category_id === shift.categoryId &&
      card.level === shift.level &&
      inEffect(card, shift.date),
  );
  return (
    latest(matching.filter((card) => card.business_id === shift.businessId)) ??
    latest(matching.filter((card) => card.business_id === null))
  );
}

/**
 * The bill rule for a shift: the most specific in effect wins (the
 * business's rule for the category, then its rule for all categories, then
 * the category's standard rule), and the latest start date within that.
 * Null means the default margin applies.
 */
export function pickBillRule<
  T extends Dated & { business_id: string | null; category_id: string | null },
>(
  rules: readonly T[],
  shift: { businessId: string; categoryId: string; date: string },
): T | null {
  const inForce = rules.filter((rule) => inEffect(rule, shift.date));
  const tiers: ((rule: T) => boolean)[] = [
    (rule) =>
      rule.business_id === shift.businessId &&
      rule.category_id === shift.categoryId,
    (rule) =>
      rule.business_id === shift.businessId && rule.category_id === null,
    (rule) =>
      rule.business_id === null && rule.category_id === shift.categoryId,
  ];
  for (const tier of tiers) {
    const found = latest(inForce.filter(tier));
    if (found) return found;
  }
  return null;
}
