/**
 * Pay rates (brief §4.8). A rate card has a base hourly rate (excluding
 * casual loading) and a multiplier per rate type (including casual loading).
 * All money is integer cents.
 */

export const DAY_TYPES = [
  "ordinary",
  "saturday",
  "sunday",
  "public_holiday",
  "overtime",
  "night",
  "saturday_after",
  "overtime_after",
  "early_late",
  "night_shift",
] as const;

export type DayType = (typeof DAY_TYPES)[number];

/** The rate types every card has. */
export const CORE_DAY_TYPES = [
  "ordinary",
  "saturday",
  "sunday",
  "public_holiday",
  "overtime",
  "night",
] as const;

export type CoreDayType = (typeof CORE_DAY_TYPES)[number];

/**
 * Rate types an award's rules add (owner, 01/11/2026): later hours of
 * Saturday work and of overtime, and loadings for a whole early, late or
 * night shift. A card without them never pays them.
 */
export type AwardDayType = Exclude<DayType, CoreDayType>;

export const AWARD_DAY_TYPES = [
  "saturday_after",
  "overtime_after",
  "early_late",
  "night_shift",
] as const satisfies readonly AwardDayType[];

export const dayTypeLabels: Record<DayType, string> = {
  ordinary: "Ordinary",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "Public holiday",
  overtime: "Overtime",
  night: "Night",
  saturday_after: "Saturday, later hours",
  overtime_after: "Overtime, later hours",
  early_late: "Early or late shift",
  night_shift: "Night shift",
};

/** What an award rate type falls back to on a card that doesn't set it. */
export const PAY_FALLBACK: Record<AwardDayType, CoreDayType> = {
  saturday_after: "saturday",
  overtime_after: "overtime",
  early_late: "ordinary",
  night_shift: "ordinary",
};

export type Multipliers = Record<CoreDayType, number> &
  Partial<Record<AwardDayType, number>>;

/**
 * An award's hours rules, set on the rate card and checked by a payroll
 * professional (brief §4.8: no award rules in code). Each is optional.
 */
export type AwardRules = {
  /** Ordinary minutes in a day before overtime; null means the setting. */
  overtimeAfterMinutes: number | null;
  /** Minutes of overtime, and of Saturday work, at the first rate before the later one. */
  tierMinutes: number;
  /** From this local time on a Saturday ("12:00"), every minute is at the later Saturday rate. */
  saturdayLaterFrom: string | null;
  /** Monday to Friday ordinary hours ("07:00" to "18:00"); minutes outside them are overtime. */
  ordinaryHours: { from: string; to: string } | null;
  /** Monday to Friday, a whole shift starting before or finishing after these times is an early or late shift. */
  earlyLate: {
    startsBefore: string | null;
    finishesAfter: string | null;
  } | null;
  /** Monday to Friday, a whole shift finishing after midnight and at or before this time is a night shift. */
  nightShiftFinishesBy: string | null;
};

/**
 * Rate types an award can make overtime, which super isn't paid on (super
 * is owed on ordinary time earnings). Shift loadings and ordinary hours
 * always carry super, so they aren't among them.
 */
export const SUPER_FREE_CHOICES = [
  "overtime",
  "overtime_after",
  "saturday",
  "saturday_after",
  "sunday",
  "public_holiday",
] as const satisfies readonly DayType[];

export type SuperFreeType = (typeof SUPER_FREE_CHOICES)[number];

/** Overtime, at either rate: every award's overtime is free of super. */
export const DEFAULT_SUPER_FREE_TYPES: readonly SuperFreeType[] = [
  "overtime",
  "overtime_after",
];

/**
 * When an award's allowance is paid (owner, 03/11/2026), as data on the
 * rate card: on every shift worked (like the building award's fares and
 * travel, a day worked), or when the worker stays more than some hours past
 * the booked finish in overtime: overtime nobody asked for the day before,
 * which is when, for example, the cleaning award pays a meal allowance.
 */
export const ALLOWANCE_TRIGGERS = ["each_shift", "late_overtime"] as const;
export type AllowanceTrigger = (typeof ALLOWANCE_TRIGGERS)[number];

export type Allowance = {
  name: string;
  /** Paid to the worker each time. */
  payCents: number;
  when: AllowanceTrigger;
  /** late_overtime: paid once that overtime is more than this. */
  afterMinutes: number;
};

/** Allowances as saved on a card (snake case), keeping only complete ones. */
export function allowancesFrom(value: unknown): Allowance[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Allowance[] => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const payCents = Number(row.pay_cents);
    const when = ALLOWANCE_TRIGGERS.find((trigger) => trigger === row.when);
    const afterHours = Number(row.after_hours ?? 0);
    if (!name || !when || !Number.isInteger(payCents) || payCents <= 0) {
      return [];
    }
    return [
      {
        name,
        payCents,
        when,
        afterMinutes:
          when === "late_overtime" && Number.isFinite(afterHours)
            ? Math.round(Math.max(0, afterHours) * 60)
            : 0,
      },
    ];
  });
}

/** Allowances to save on a card. */
export function allowancesToRow(allowances: readonly Allowance[]) {
  return allowances.map((a) => ({
    name: a.name,
    pay_cents: a.payCents,
    when: a.when,
    after_hours: a.when === "late_overtime" ? a.afterMinutes / 60 : null,
  }));
}

export type RateCard = {
  baseRateCents: number;
  multipliers: Multipliers;
  /** Absent on rates kept with bookings made before award rules existed. */
  award?: AwardRules;
  /**
   * The rate types this card's award makes overtime, priced without super
   * (owner, 03/11/2026). Absent on rates kept with bookings made before.
   */
  superFreeTypes?: SuperFreeType[];
  /** The award's allowances (owner, 03/11/2026). */
  allowances?: Allowance[];
};

/** A saved list of rate types, keeping only the ones super can be left off. */
export function superFreeTypesFrom(
  values: readonly string[] | null | undefined,
): SuperFreeType[] {
  return SUPER_FREE_CHOICES.filter((type) => values?.includes(type));
}

/** The multiplier for a rate type, falling back for a card that doesn't set it. */
export function multiplierFor(card: RateCard, dayType: DayType): number {
  const own = card.multipliers[dayType];
  if (own !== undefined) return own;
  return card.multipliers[PAY_FALLBACK[dayType as AwardDayType]];
}

/** Multipliers are stored to 3 decimal places; work in thousandths to avoid float error. */
function thousandths(multiplier: number): number {
  return Math.round(multiplier * 1000);
}

/** Rounds half away from zero to a whole cent. */
function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Hourly pay in cents for a rate type: base × multiplier, to the nearest cent. */
export function hourlyPayCents(card: RateCard, dayType: DayType): number {
  return roundCents(
    (card.baseRateCents * thousandths(multiplierFor(card, dayType))) / 1000,
  );
}

/** Hourly pay for every rate type. */
export function hourlyPayTable(card: RateCard): Record<DayType, number> {
  return Object.fromEntries(
    DAY_TYPES.map((d) => [d, hourlyPayCents(card, d)]),
  ) as Record<DayType, number>;
}

/** The rate types a card actually uses: the core ones, and any its award rules add. */
export function cardDayTypes(card: RateCard): DayType[] {
  return DAY_TYPES.filter((type) => {
    if (!(type in PAY_FALLBACK)) return true;
    const award = card.award;
    if (!award || card.multipliers[type] === undefined) return false;
    if (type === "early_late") return award.earlyLate !== null;
    if (type === "night_shift") return award.nightShiftFinishesBy !== null;
    return true;
  });
}

function hoursText(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

/** "18:00" → "6 pm", "05:30" → "5:30 am". */
function clockText(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour} ${suffix}`
    : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * A card's award rules in plain words, for admin screens: one line each.
 * Money is formatted by the caller (`money`), so this stays pure.
 */
export function awardRulesSummary(
  card: RateCard,
  money: (cents: number) => string,
): string[] {
  const award = card.award;
  if (!award) return [];
  const lines: string[] = [];
  const later = (type: AwardDayType) =>
    card.multipliers[type] !== undefined &&
    multiplierFor(card, type) !== multiplierFor(card, PAY_FALLBACK[type]);
  if (award.overtimeAfterMinutes !== null) {
    lines.push(`Overtime after ${hoursText(award.overtimeAfterMinutes)} a day`);
  }
  if (award.ordinaryHours) {
    lines.push(
      `Overtime outside ${clockText(award.ordinaryHours.from)} to ${clockText(award.ordinaryHours.to)}, Monday to Friday`,
    );
  }
  if (later("overtime_after")) {
    lines.push(
      `Overtime after the first ${hoursText(award.tierMinutes)}: ${money(hourlyPayCents(card, "overtime_after"))} an hour`,
    );
  }
  if (later("saturday_after")) {
    const from = award.saturdayLaterFrom
      ? ` and from ${clockText(award.saturdayLaterFrom)}`
      : "";
    lines.push(
      `Saturday after the first ${hoursText(award.tierMinutes)}${from}: ${money(hourlyPayCents(card, "saturday_after"))} an hour`,
    );
  }
  if (award.earlyLate) {
    const parts = [
      award.earlyLate.startsBefore
        ? `starting before ${clockText(award.earlyLate.startsBefore)}`
        : null,
      award.earlyLate.finishesAfter
        ? `finishing after ${clockText(award.earlyLate.finishesAfter)}`
        : null,
    ].filter(Boolean);
    lines.push(
      `Shift ${parts.join(" or ")}, Monday to Friday: ${money(hourlyPayCents(card, "early_late"))} an hour`,
    );
  }
  if (award.nightShiftFinishesBy) {
    lines.push(
      `Shift finishing after midnight and by ${clockText(award.nightShiftFinishesBy)}, Monday to Friday: ${money(hourlyPayCents(card, "night_shift"))} an hour`,
    );
  }
  return lines;
}

/** "07:00:00" from the database → "07:00". */
function hhmm(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

function optionalNumber(value: number | string | null | undefined) {
  return value === null || value === undefined ? undefined : Number(value);
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
  saturday_after_multiplier?: number | string | null;
  overtime_after_multiplier?: number | string | null;
  early_late_multiplier?: number | string | null;
  night_shift_multiplier?: number | string | null;
  tier_hours?: number | string | null;
  overtime_after_hours?: number | string | null;
  saturday_later_from?: string | null;
  ordinary_from?: string | null;
  ordinary_to?: string | null;
  early_late_starts_before?: string | null;
  early_late_finishes_after?: string | null;
  night_shift_finishes_by?: string | null;
  super_free_types?: string[] | null;
  allowances?: unknown;
}): RateCard {
  const multipliers: Multipliers = {
    ordinary: Number(row.ordinary_multiplier),
    saturday: Number(row.saturday_multiplier),
    sunday: Number(row.sunday_multiplier),
    public_holiday: Number(row.public_holiday_multiplier),
    overtime: Number(row.overtime_multiplier),
    night: Number(row.night_multiplier),
  };
  const extra: Partial<Record<AwardDayType, number | undefined>> = {
    saturday_after: optionalNumber(row.saturday_after_multiplier),
    overtime_after: optionalNumber(row.overtime_after_multiplier),
    early_late: optionalNumber(row.early_late_multiplier),
    night_shift: optionalNumber(row.night_shift_multiplier),
  };
  for (const [type, value] of Object.entries(extra)) {
    if (value !== undefined) multipliers[type as AwardDayType] = value;
  }
  const startsBefore = hhmm(row.early_late_starts_before);
  const finishesAfter = hhmm(row.early_late_finishes_after);
  const ordinaryFrom = hhmm(row.ordinary_from);
  const ordinaryTo = hhmm(row.ordinary_to);
  const overtimeAfterHours = optionalNumber(row.overtime_after_hours);
  return {
    baseRateCents: row.base_rate_cents,
    multipliers,
    award: {
      overtimeAfterMinutes:
        overtimeAfterHours === undefined
          ? null
          : Math.round(overtimeAfterHours * 60),
      tierMinutes: Math.round((optionalNumber(row.tier_hours) ?? 2) * 60),
      saturdayLaterFrom: hhmm(row.saturday_later_from),
      ordinaryHours:
        ordinaryFrom && ordinaryTo
          ? { from: ordinaryFrom, to: ordinaryTo }
          : null,
      earlyLate:
        extra.early_late !== undefined && (startsBefore || finishesAfter)
          ? { startsBefore, finishesAfter }
          : null,
      nightShiftFinishesBy:
        extra.night_shift !== undefined
          ? hhmm(row.night_shift_finishes_by)
          : null,
    },
    superFreeTypes:
      row.super_free_types === undefined || row.super_free_types === null
        ? [...DEFAULT_SUPER_FREE_TYPES]
        : superFreeTypesFrom(row.super_free_types),
    allowances: allowancesFrom(row.allowances),
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
