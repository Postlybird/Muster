import { NO_PRIOR_HOURS, type PriorHours } from "./overtime";
import {
  DAY_TYPES,
  DEFAULT_SUPER_FREE_TYPES,
  hourlyPayCents,
  multiplierFor,
  type AwardDayType,
  type CoreDayType,
  type DayType,
  type RateCard,
} from "./rates";

/**
 * Hours, pay and bill for one shift (brief §4.8; plan "Rate types").
 * Money is integer cents and time is whole minutes. The caller loads the
 * rate card, bill rule, public holidays and settings.
 */

/** Local time for each state, which decides weekends, holidays and night hours. */
export const STATE_TIME_ZONES = {
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  WA: "Australia/Perth",
  TAS: "Australia/Hobart",
  NT: "Australia/Darwin",
} as const;

export type StateCode = keyof typeof STATE_TIME_ZONES;

/**
 * Rate types from highest to lowest priority. Without award rules each
 * minute takes the first that applies; with them, ties go to the first.
 */
export const RATE_PRECEDENCE: readonly DayType[] = [
  "public_holiday",
  "sunday",
  "saturday_after",
  "saturday",
  "overtime_after",
  "overtime",
  "night_shift",
  "early_late",
  "night",
  "ordinary",
];

export type MinutesByType = Record<DayType, number>;

export type HoursRules = {
  timeZone: string;
  /** Public holidays in the site's state, as yyyy-mm-dd. */
  publicHolidays: ReadonlySet<string>;
  /** Worked minutes in a day after which the overtime rate applies. */
  overtimeAfterMinutes: number;
  /**
   * Ordinary minutes in a week (Monday to Sunday) after which the overtime
   * rate applies (owner, 02/11/2026). Absent: no weekly limit.
   */
  weeklyOvertimeAfterMinutes?: number;
  /** Night hours as local "HH:MM" times. The window may cross midnight. */
  night: { start: string; end: string };
};

export type ShiftTimes = {
  start: Date;
  end: Date;
  /** Unpaid break, placed in the middle of the shift unless `breaks` says when. */
  breakMinutes: number;
  breaks?: { start: Date; end: Date }[];
};

const MINUTE = 60_000;

export function emptyMinutes(): MinutesByType {
  return Object.fromEntries(
    DAY_TYPES.map((type) => [type, 0]),
  ) as MinutesByType;
}

/** "19:30" → 1170 minutes after midnight. */
function minutesAfterMidnight(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function inWindow(minuteOfDay: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end
    ? minuteOfDay >= start && minuteOfDay < end
    : minuteOfDay >= start || minuteOfDay < end;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Minutes the time zone is ahead of UTC at a moment (whole minutes since the epoch). */
function zoneOffset(timeZone: string, minute: number): number {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  const part = Object.fromEntries(
    formatter
      .formatToParts(new Date(minute * MINUTE))
      .map(({ type, value }) => [type, Number(value)]),
  );
  const wallClock = Date.UTC(
    part.year!,
    part.month! - 1,
    part.day!,
    part.hour!,
    part.minute!,
  );
  return wallClock / MINUTE - minute;
}

/**
 * Splits a shift's worked minutes by rate type. Days and night hours follow
 * the site's local time, so a shift over midnight or a daylight-saving
 * change is split correctly. Overtime is daily (plan question 5).
 *
 * With a rate card that has award rules (owner, 01/11/2026), each minute is
 * paid at the highest rate that applies: the day's rate (public holiday,
 * Sunday, Saturday and its later hours, or a weekday shift's early, late or
 * night shift loading), overtime and its later hours once the day's
 * ordinary hours are used up or outside the award's ordinary hours, and the
 * night rate. Without them (rates kept with older bookings) each minute
 * takes the first that applies: public holiday, Sunday, Saturday, overtime,
 * night, ordinary.
 *
 * `prior` is the worker's hours with us before this shift that day and week
 * (src/domain/overtime.ts): they count towards the daily and weekly limits,
 * so a worker's later-booked shift can go into overtime (owner, 02/11/2026).
 */
export function splitShift(
  shift: ShiftTimes,
  rules: HoursRules,
  card?: RateCard,
  prior: PriorHours = NO_PRIOR_HOURS,
): MinutesByType {
  const start = Math.round(shift.start.getTime() / MINUTE);
  const end = Math.round(shift.end.getTime() / MINUTE);
  if (!(end > start)) throw new RangeError("A shift must end after it starts");
  const length = end - start;
  if (shift.breakMinutes < 0 || shift.breakMinutes >= length) {
    throw new RangeError("The break must be shorter than the shift");
  }
  const middle = start + Math.floor((length - shift.breakMinutes) / 2);
  const breaks: [number, number][] = shift.breaks?.length
    ? shift.breaks.map((b) => [
        Math.round(b.start.getTime() / MINUTE),
        Math.round(b.end.getTime() / MINUTE),
      ])
    : shift.breakMinutes > 0
      ? [[middle, middle + shift.breakMinutes]]
      : [];

  const nightStart = minutesAfterMidnight(rules.night.start);
  const nightEnd = minutesAfterMidnight(rules.night.end);
  // Clocks change on the quarter hour at most, so one lookup per 15 minutes.
  const offsets = new Map<number, number>();
  const offsetAt = (minute: number) => {
    const quarter = Math.floor(minute / 15);
    let offset = offsets.get(quarter);
    if (offset === undefined) {
      offset = zoneOffset(rules.timeZone, quarter * 15);
      offsets.set(quarter, offset);
    }
    return offset;
  };

  const localAt = (minute: number) =>
    new Date((minute + offsetAt(minute)) * MINUTE);
  const isBreak = (minute: number) =>
    breaks.some(([from, to]) => minute >= from && minute < to);

  if (card?.award) {
    return splitWithAward(
      { start, end, localAt, isBreak },
      rules,
      card as RateCard & { award: NonNullable<RateCard["award"]> },
      [nightStart, nightEnd],
      prior,
    );
  }

  const minutes = emptyMinutes();
  const weeklyLimit = rules.weeklyOvertimeAfterMinutes ?? Infinity;
  let worked = prior.dayMinutes;
  let weekOrdinary = prior.weekOrdinaryMinutes;
  for (let minute = start; minute < end; minute++) {
    if (isBreak(minute)) continue;
    // Local wall-clock time, read through the UTC getters.
    const local = localAt(minute);
    const weekday = local.getUTCDay();
    let type: DayType;
    if (rules.publicHolidays.has(local.toISOString().slice(0, 10))) {
      type = "public_holiday";
    } else if (weekday === 0) {
      type = "sunday";
    } else if (weekday === 6) {
      type = "saturday";
    } else if (
      worked >= rules.overtimeAfterMinutes ||
      weekOrdinary >= weeklyLimit
    ) {
      type = "overtime";
    } else if (
      inWindow(
        local.getUTCHours() * 60 + local.getUTCMinutes(),
        nightStart,
        nightEnd,
      )
    ) {
      type = "night";
    } else {
      type = "ordinary";
    }
    minutes[type]++;
    worked++;
    if (type !== "overtime") weekOrdinary++;
  }
  return minutes;
}

function minuteOfDay(local: Date): number {
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/** The shift's award rate for its weekday minutes: a whole-shift loading, or ordinary. */
function weekdayShiftType(
  card: RateCard & { award: NonNullable<RateCard["award"]> },
  startLocal: Date,
  endLocal: Date,
): DayType {
  const { award } = card;
  const startMinute = minuteOfDay(startLocal);
  const endMinute = minuteOfDay(endLocal);
  const crossesMidnight =
    endLocal.toISOString().slice(0, 10) !==
    startLocal.toISOString().slice(0, 10);
  let type: DayType = "ordinary";
  const takeIfHigher = (candidate: DayType) => {
    if (multiplierFor(card, candidate) > multiplierFor(card, type)) {
      type = candidate;
    }
  };
  if (
    award.nightShiftFinishesBy &&
    crossesMidnight &&
    endMinute > 0 &&
    endMinute <= minutesAfterMidnight(award.nightShiftFinishesBy)
  ) {
    takeIfHigher("night_shift");
  }
  if (award.earlyLate) {
    const { startsBefore, finishesAfter } = award.earlyLate;
    const early =
      startsBefore !== null && startMinute < minutesAfterMidnight(startsBefore);
    const late =
      finishesAfter !== null &&
      (crossesMidnight || endMinute > minutesAfterMidnight(finishesAfter));
    if (early || late) takeIfHigher("early_late");
  }
  return type;
}

/** splitShift with a card's award rules: each minute at the highest rate that applies. */
function splitWithAward(
  shift: {
    start: number;
    end: number;
    localAt: (minute: number) => Date;
    isBreak: (minute: number) => boolean;
  },
  rules: HoursRules,
  card: RateCard & { award: NonNullable<RateCard["award"]> },
  [nightStart, nightEnd]: [number, number],
  prior: PriorHours,
): MinutesByType {
  const { award } = card;
  const rate = (type: DayType) => multiplierFor(card, type);
  const overtimeAfter =
    award.overtimeAfterMinutes ?? rules.overtimeAfterMinutes;
  const weeklyLimit = rules.weeklyOvertimeAfterMinutes ?? Infinity;
  const laterFrom = award.saturdayLaterFrom
    ? minutesAfterMidnight(award.saturdayLaterFrom)
    : null;
  const spread = award.ordinaryHours
    ? [
        minutesAfterMidnight(award.ordinaryHours.from),
        minutesAfterMidnight(award.ordinaryHours.to),
      ]
    : null;
  const weekdayType = weekdayShiftType(
    card,
    shift.localAt(shift.start),
    shift.localAt(shift.end),
  );

  const minutes = emptyMinutes();
  // The worker's earlier hours that day: ordinary up to the limit, and any
  // past it already overtime, which counts towards the later rate.
  let ordinarySoFar = Math.min(prior.dayMinutes, overtimeAfter);
  let overtimeSoFar = Math.max(0, prior.dayMinutes - overtimeAfter);
  let weekOrdinary = prior.weekOrdinaryMinutes;
  let saturdaySoFar = 0;
  for (let minute = shift.start; minute < shift.end; minute++) {
    if (shift.isBreak(minute)) continue;
    const local = shift.localAt(minute);
    const weekday = local.getUTCDay();
    const time = minuteOfDay(local);
    const holiday = rules.publicHolidays.has(local.toISOString().slice(0, 10));

    let type: DayType;
    if (holiday) {
      type = "public_holiday";
    } else if (weekday === 0) {
      type = "sunday";
    } else if (weekday === 6) {
      const later =
        saturdaySoFar >= award.tierMinutes ||
        (laterFrom !== null && time >= laterFrom);
      type =
        later && rate("saturday_after") > rate("saturday")
          ? "saturday_after"
          : "saturday";
      saturdaySoFar++;
    } else {
      type = weekdayType;
    }

    const outsideOrdinaryHours =
      !holiday &&
      weekday >= 1 &&
      weekday <= 5 &&
      spread !== null &&
      !inWindow(time, spread[0]!, spread[1]!);
    if (
      outsideOrdinaryHours ||
      ordinarySoFar >= overtimeAfter ||
      weekOrdinary >= weeklyLimit
    ) {
      const overtime: DayType =
        overtimeSoFar >= award.tierMinutes &&
        rate("overtime_after") > rate("overtime")
          ? "overtime_after"
          : "overtime";
      overtimeSoFar++;
      if (rate(overtime) > rate(type)) type = overtime;
    } else {
      ordinarySoFar++;
      weekOrdinary++;
    }

    if (inWindow(time, nightStart, nightEnd) && rate("night") > rate(type)) {
      type = "night";
    }
    minutes[type]++;
  }
  return minutes;
}

export function totalMinutes(minutes: MinutesByType): number {
  return Object.values(minutes).reduce((sum, value) => sum + value, 0);
}

// ---------------------------------------------------------------------------
// Pay and bill
// ---------------------------------------------------------------------------

/**
 * How a business is billed: pay plus on-costs plus a margin, or fixed hourly
 * rates. Fixed rates for the award rate types fall back (BILL_FALLBACK).
 */
export type BillRule =
  | { method: "markup"; marginPct: number }
  | {
      method: "fixed";
      hourlyCents: Record<CoreDayType, number> &
        Partial<Record<AwardDayType, number>>;
    };

/** The fixed rate an award rate type is billed at when its own isn't set. */
export const BILL_FALLBACK: Record<AwardDayType, CoreDayType> = {
  saturday_after: "saturday",
  overtime_after: "overtime",
  early_late: "night",
  night_shift: "night",
};

/** A bill rule from the database, or the default margin when no rule applies. */
export function billRuleFromRow(
  row: {
    method: "markup" | "fixed";
    margin_pct: number | string | null;
    fixed_ordinary_cents: number | null;
    fixed_saturday_cents: number | null;
    fixed_sunday_cents: number | null;
    fixed_public_holiday_cents: number | null;
    fixed_overtime_cents: number | null;
    fixed_night_cents: number | null;
    fixed_saturday_after_cents?: number | null;
    fixed_overtime_after_cents?: number | null;
    fixed_early_late_cents?: number | null;
    fixed_night_shift_cents?: number | null;
  } | null,
  defaultMarginPct: number,
): BillRule {
  if (!row) return { method: "markup", marginPct: defaultMarginPct };
  if (row.method === "fixed") {
    const hourlyCents: Extract<BillRule, { method: "fixed" }>["hourlyCents"] = {
      ordinary: row.fixed_ordinary_cents ?? 0,
      saturday: row.fixed_saturday_cents ?? 0,
      sunday: row.fixed_sunday_cents ?? 0,
      public_holiday: row.fixed_public_holiday_cents ?? 0,
      overtime: row.fixed_overtime_cents ?? 0,
      night: row.fixed_night_cents ?? 0,
    };
    for (const type of Object.keys(BILL_FALLBACK) as AwardDayType[]) {
      const own = row[`fixed_${type}_cents`];
      if (own !== null && own !== undefined) hourlyCents[type] = own;
    }
    return { method: "fixed", hourlyCents };
  }
  return { method: "markup", marginPct: Number(row.margin_pct ?? 0) };
}

export type CostRules = {
  card: RateCard;
  billRule: BillRule;
  /** Total on-costs as a percent of pay (super, workers' comp, payroll tax, insurance). */
  onCostPct: number;
  /**
   * Super's part of the on-costs, left off the hours the card's award makes
   * overtime (owner, 03/11/2026: super isn't owed on overtime). Absent on
   * rates kept with bookings made before, which add it to every hour.
   */
  superPct?: number;
  /** Shorter shifts are paid and billed up to this (brief §4.8). */
  minEngagementMinutes: number;
  /** Urgent call-out loadings, or null for an ordinary shift (plan question 7). */
  urgent: { payPct: number; billPct: number } | null;
  gstPct: number;
};

export type CostLine = {
  type: DayType;
  /** Hours worked, or the top-up to the minimum engagement. */
  kind: "worked" | "minimum";
  minutes: number;
  payRateCents: number;
  payCents: number;
  /** Hourly, excluding GST. */
  billRateCents: number;
  billCents: number;
};

export type ShiftCost = {
  workedMinutes: number;
  paidMinutes: number;
  lines: CostLine[];
  /** Urgent call-out allowance, paid on top of the hours. */
  urgentPayCents: number;
  urgentBillCents: number;
  /** Hours plus allowances. */
  payCents: number;
  onCostCents: number;
  /** Excluding GST. */
  billCents: number;
  gstCents: number;
  /** Including GST. */
  totalCents: number;
  /** Bill (excluding GST) less pay and on-costs. */
  marginCents: number;
};

/** Rounds half away from zero to a whole cent. */
function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** A percent in hundredths, so 5.45% is exactly 545 and sums don't drift. */
function basisPoints(pct: number): number {
  return Math.round(pct * 100);
}

/** `pct` percent of an amount, to the nearest cent. */
export function percentOf(cents: number, pct: number): number {
  return roundCents((cents * basisPoints(pct)) / 10_000);
}

/** On-costs as one percent; a category's workers' comp rate replaces the standard one. */
export function totalOnCostPct(
  onCosts: {
    super: number;
    workers_comp: number;
    payroll_tax: number;
    insurance: number;
  },
  categoryWorkersCompPct: number | null,
): number {
  const bp =
    basisPoints(onCosts.super) +
    basisPoints(categoryWorkersCompPct ?? onCosts.workers_comp) +
    basisPoints(onCosts.payroll_tax) +
    basisPoints(onCosts.insurance);
  return bp / 100;
}

/**
 * The on-costs on an hour of a rate type, as a percent of pay: all of them,
 * less super on the hours that are overtime (the card's superFreeTypes).
 */
export function onCostPctFor(
  rules: Pick<CostRules, "card" | "onCostPct" | "superPct">,
  type: DayType,
): number {
  if (rules.superPct === undefined) return rules.onCostPct;
  const superFree: readonly DayType[] =
    rules.card.superFreeTypes ?? DEFAULT_SUPER_FREE_TYPES;
  return superFree.includes(type)
    ? (basisPoints(rules.onCostPct) - basisPoints(rules.superPct)) / 100
    : rules.onCostPct;
}

/** The hourly bill rate (excluding GST) for a rate type. */
export function hourlyBillCents(
  card: RateCard,
  rule: BillRule,
  onCostPct: number,
  type: DayType,
): number {
  if (rule.method === "fixed") {
    return (
      rule.hourlyCents[type] ??
      rule.hourlyCents[BILL_FALLBACK[type as AwardDayType]]
    );
  }
  return roundCents(
    (hourlyPayCents(card, type) *
      (10_000 + basisPoints(onCostPct)) *
      (10_000 + basisPoints(rule.marginPct))) /
      100_000_000,
  );
}

function forMinutes(hourlyCents: number, minutes: number): number {
  return roundCents((hourlyCents * minutes) / 60);
}

/** The rate type with the most minutes (ties go to the higher-priority type). */
export function mainType(minutes: MinutesByType): DayType {
  let best: DayType | null = null;
  for (const type of RATE_PRECEDENCE) {
    if (best === null || minutes[type] > minutes[best]) best = type;
  }
  return best !== null && minutes[best] > 0 ? best : "ordinary";
}

/**
 * Pay, on-costs, bill, GST and margin for one worker on one shift. A shift
 * shorter than the minimum engagement is topped up at the rate that covered
 * most of it.
 */
export function costShift(minutes: MinutesByType, rules: CostRules): ShiftCost {
  const workedMinutes = totalMinutes(minutes);
  const line = (
    type: DayType,
    kind: CostLine["kind"],
    count: number,
  ): CostLine => {
    const payRateCents = hourlyPayCents(rules.card, type);
    const billRateCents = hourlyBillCents(
      rules.card,
      rules.billRule,
      onCostPctFor(rules, type),
      type,
    );
    return {
      type,
      kind,
      minutes: count,
      payRateCents,
      payCents: forMinutes(payRateCents, count),
      billRateCents,
      billCents: forMinutes(billRateCents, count),
    };
  };

  const lines = DAY_TYPES.filter((type) => minutes[type] > 0).map((type) =>
    line(type, "worked", minutes[type]),
  );
  const topUp = Math.max(0, rules.minEngagementMinutes - workedMinutes);
  if (topUp > 0) lines.push(line(mainType(minutes), "minimum", topUp));

  const hoursPay = lines.reduce((sum, l) => sum + l.payCents, 0);
  const hoursBill = lines.reduce((sum, l) => sum + l.billCents, 0);
  const urgentPayCents = rules.urgent
    ? percentOf(hoursPay, rules.urgent.payPct)
    : 0;
  const urgentBillCents = rules.urgent
    ? percentOf(hoursBill, rules.urgent.billPct)
    : 0;
  const payCents = hoursPay + urgentPayCents;
  // Less super on the overtime hours (none for rates kept from before).
  const superFreePay = lines
    .filter((l) => onCostPctFor(rules, l.type) !== rules.onCostPct)
    .reduce((sum, l) => sum + l.payCents, 0);
  const onCostCents =
    percentOf(payCents, rules.onCostPct) -
    (rules.superPct === undefined
      ? 0
      : percentOf(superFreePay, rules.superPct));
  const billCents = hoursBill + urgentBillCents;
  const gstCents = percentOf(billCents, rules.gstPct);
  return {
    workedMinutes,
    paidMinutes: workedMinutes + topUp,
    lines,
    urgentPayCents,
    urgentBillCents,
    payCents,
    onCostCents,
    billCents,
    gstCents,
    totalCents: billCents + gstCents,
    marginCents: billCents - payCents - onCostCents,
  };
}

export type CostTotals = Pick<
  ShiftCost,
  | "workedMinutes"
  | "paidMinutes"
  | "payCents"
  | "onCostCents"
  | "billCents"
  | "gstCents"
  | "totalCents"
  | "marginCents"
>;

/**
 * Adds up shifts, each filled by `workers` people, for a cost estimate.
 * GST is worked out once on the total, as on an invoice.
 */
export function sumCosts(
  costs: readonly ShiftCost[],
  workers: number,
  gstPct: number,
): CostTotals {
  const add = (pick: (cost: ShiftCost) => number) =>
    costs.reduce((sum, cost) => sum + pick(cost), 0) * workers;
  const billCents = add((c) => c.billCents);
  const gstCents = percentOf(billCents, gstPct);
  const payCents = add((c) => c.payCents);
  const onCostCents = add((c) => c.onCostCents);
  return {
    workedMinutes: add((c) => c.workedMinutes),
    paidMinutes: add((c) => c.paidMinutes),
    payCents,
    onCostCents,
    billCents,
    gstCents,
    totalCents: billCents + gstCents,
    marginCents: billCents - payCents - onCostCents,
  };
}
