import {
  DAY_TYPES,
  hourlyPayCents,
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

/** Rate types from highest to lowest priority: each minute takes the first that applies. */
export const RATE_PRECEDENCE: readonly DayType[] = [
  "public_holiday",
  "sunday",
  "saturday",
  "overtime",
  "night",
  "ordinary",
];

export type MinutesByType = Record<DayType, number>;

export type HoursRules = {
  timeZone: string;
  /** Public holidays in the site's state, as yyyy-mm-dd. */
  publicHolidays: ReadonlySet<string>;
  /** Worked minutes in a shift after which the overtime rate applies. */
  overtimeAfterMinutes: number;
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
  return {
    ordinary: 0,
    saturday: 0,
    sunday: 0,
    public_holiday: 0,
    overtime: 0,
    night: 0,
  };
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
 * Splits a shift's worked minutes by rate type. Each minute takes the first
 * that applies: public holiday, Sunday, Saturday, overtime, night, ordinary.
 * Days and night hours follow the site's local time, so a shift over
 * midnight or a daylight-saving change is split correctly. Overtime counts
 * worked minutes from the start of the shift (daily overtime only, plan
 * question 5).
 */
export function splitShift(
  shift: ShiftTimes,
  rules: HoursRules,
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

  const minutes = emptyMinutes();
  let worked = 0;
  for (let minute = start; minute < end; minute++) {
    if (breaks.some(([from, to]) => minute >= from && minute < to)) continue;
    // Local wall-clock time, read through the UTC getters.
    const local = new Date((minute + offsetAt(minute)) * MINUTE);
    const weekday = local.getUTCDay();
    let type: DayType;
    if (rules.publicHolidays.has(local.toISOString().slice(0, 10))) {
      type = "public_holiday";
    } else if (weekday === 0) {
      type = "sunday";
    } else if (weekday === 6) {
      type = "saturday";
    } else if (worked >= rules.overtimeAfterMinutes) {
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
  }
  return minutes;
}

export function totalMinutes(minutes: MinutesByType): number {
  return Object.values(minutes).reduce((sum, value) => sum + value, 0);
}

// ---------------------------------------------------------------------------
// Pay and bill
// ---------------------------------------------------------------------------

/** How a business is billed: pay plus on-costs plus a margin, or fixed hourly rates. */
export type BillRule =
  | { method: "markup"; marginPct: number }
  | { method: "fixed"; hourlyCents: Record<DayType, number> };

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
  } | null,
  defaultMarginPct: number,
): BillRule {
  if (!row) return { method: "markup", marginPct: defaultMarginPct };
  if (row.method === "fixed") {
    return {
      method: "fixed",
      hourlyCents: Object.fromEntries(
        DAY_TYPES.map((type) => [type, row[`fixed_${type}_cents`] ?? 0]),
      ) as Record<DayType, number>,
    };
  }
  return { method: "markup", marginPct: Number(row.margin_pct ?? 0) };
}

export type CostRules = {
  card: RateCard;
  billRule: BillRule;
  /** Total on-costs as a percent of pay (super, workers' comp, payroll tax, insurance). */
  onCostPct: number;
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

/** The hourly bill rate (excluding GST) for a rate type. */
export function hourlyBillCents(
  card: RateCard,
  rule: BillRule,
  onCostPct: number,
  type: DayType,
): number {
  if (rule.method === "fixed") return rule.hourlyCents[type];
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
      rules.onCostPct,
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
  const onCostCents = percentOf(payCents, rules.onCostPct);
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
