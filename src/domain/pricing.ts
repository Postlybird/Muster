import { formatInTimeZone } from "date-fns-tz";

import {
  billRuleFromRow,
  costShift,
  splitShift,
  STATE_TIME_ZONES,
  sumCosts,
  totalOnCostPct,
  type CostRules,
  type CostTotals,
  type MinutesByType,
  type ShiftCost,
  type StateCode,
} from "./pay";
import { pickBillRule, pickRateCard, rateCardFromRow } from "./rates";

/**
 * Pricing shifts from loaded data (brief §4.3 cost estimate, §4.8 rates).
 * The server loads the data (`src/server/pricing.ts`); the seed script uses
 * the same code for demo jobs.
 */

type Dated = { effective_from: string; effective_to: string | null };

export type RateCardRow = Dated & {
  id: string;
  business_id: string | null;
  category_id: string;
  level: number;
  base_rate_cents: number;
  ordinary_multiplier: number | string;
  saturday_multiplier: number | string;
  sunday_multiplier: number | string;
  public_holiday_multiplier: number | string;
  overtime_multiplier: number | string;
  night_multiplier: number | string;
};

export type BillRuleRow = Dated & {
  id: string;
  business_id: string | null;
  category_id: string | null;
  method: "markup" | "fixed";
  margin_pct: number | string | null;
  fixed_ordinary_cents: number | null;
  fixed_saturday_cents: number | null;
  fixed_sunday_cents: number | null;
  fixed_public_holiday_cents: number | null;
  fixed_overtime_cents: number | null;
  fixed_night_cents: number | null;
};

export type PricingData = {
  cards: readonly RateCardRow[];
  rules: readonly BillRuleRow[];
  /** Public holidays in the site's state, as yyyy-mm-dd. */
  publicHolidays: readonly string[];
  category: {
    min_engagement_hours: number | string;
    workers_comp_pct: number | string | null;
  } | null;
  settings: {
    daily_overtime_after_hours: number;
    night_hours: { start: string; end: string };
    margin_pct: number;
    on_costs_pct: {
      super: number;
      workers_comp: number;
      payroll_tax: number;
      insurance: number;
    };
    urgent_loading_pct: { pay: number; bill: number };
    gst_pct: number;
  };
};

export type PricingScope = {
  businessId: string | null;
  categoryId: string;
  level: number;
  state: StateCode;
};

export type ShiftQuote =
  | {
      ok: true;
      /** The shift's local start date (yyyy-mm-dd), which picks the card and rule. */
      date: string;
      minutes: MinutesByType;
      cost: ShiftCost;
      /** The rates and loadings used, kept with each booking (brief §4.8). */
      rules: CostRules;
      card: { id: string; businessOwn: boolean; effectiveFrom: string };
      /** Null when the default margin applies. */
      billRule: { id: string; businessOwn: boolean } | null;
    }
  | { ok: false; problem: string };

export type ShiftToPrice = {
  start: Date;
  end: Date;
  breakMinutes: number;
  urgent: boolean;
};

/** Prices shifts for one business, work type, level and state. */
export function makePricer(scope: PricingScope, data: PricingData) {
  const timeZone = STATE_TIME_ZONES[scope.state];
  const publicHolidays = new Set(data.publicHolidays);
  const businessId = scope.businessId ?? "";
  const { settings } = data;

  function quote(shift: ShiftToPrice): ShiftQuote {
    if (!data.category) return { ok: false, problem: "Unknown work type." };
    const date = formatInTimeZone(shift.start, timeZone, "yyyy-MM-dd");
    const card = pickRateCard(data.cards, {
      businessId,
      categoryId: scope.categoryId,
      level: scope.level,
      date,
    });
    if (!card) {
      return {
        ok: false,
        problem: `There's no pay rate card for this work type at level ${scope.level} on that date.`,
      };
    }
    const rule = pickBillRule(data.rules, {
      businessId,
      categoryId: scope.categoryId,
      date,
    });
    let minutes: MinutesByType;
    try {
      minutes = splitShift(
        {
          start: shift.start,
          end: shift.end,
          breakMinutes: shift.breakMinutes,
        },
        {
          timeZone,
          publicHolidays,
          overtimeAfterMinutes: Math.round(
            settings.daily_overtime_after_hours * 60,
          ),
          night: settings.night_hours,
        },
      );
    } catch (error) {
      return {
        ok: false,
        problem:
          error instanceof RangeError ? error.message : "Check the times.",
      };
    }
    const rules: CostRules = {
      card: rateCardFromRow(card),
      billRule: billRuleFromRow(rule, settings.margin_pct),
      onCostPct: totalOnCostPct(
        settings.on_costs_pct,
        data.category.workers_comp_pct === null
          ? null
          : Number(data.category.workers_comp_pct),
      ),
      minEngagementMinutes: Math.round(
        Number(data.category.min_engagement_hours) * 60,
      ),
      urgent: shift.urgent
        ? {
            payPct: settings.urgent_loading_pct.pay,
            billPct: settings.urgent_loading_pct.bill,
          }
        : null,
      gstPct: settings.gst_pct,
    };
    return {
      ok: true,
      date,
      minutes,
      cost: costShift(minutes, rules),
      rules,
      card: {
        id: card.id,
        businessOwn: card.business_id !== null,
        effectiveFrom: card.effective_from,
      },
      billRule: rule
        ? { id: rule.id, businessOwn: rule.business_id !== null }
        : null,
    };
  }

  /**
   * The estimate for a job: every shift, each filled by `workers` people.
   * Fails if any shift can't be priced.
   */
  function estimate(
    shifts: readonly ShiftToPrice[],
    workers: number,
  ):
    | {
        ok: true;
        totals: CostTotals;
        quotes: Extract<ShiftQuote, { ok: true }>[];
      }
    | { ok: false; problem: string } {
    const quotes: Extract<ShiftQuote, { ok: true }>[] = [];
    for (const shift of shifts) {
      const result = quote(shift);
      if (!result.ok) return result;
      quotes.push(result);
    }
    return {
      ok: true,
      totals: sumCosts(
        quotes.map((q) => q.cost),
        workers,
        settings.gst_pct,
      ),
      quotes,
    };
  }

  return { quote, estimate };
}

export type EstimateLine = {
  type: ShiftCost["lines"][number]["type"];
  kind: ShiftCost["lines"][number]["kind"];
  /** Across every shift and worker. */
  minutes: number;
  billCents: number;
  /** The hourly bill rate, or null when it differs between shifts. */
  billRateCents: number | null;
};

/**
 * An estimate's bill broken down by rate type, across every shift and
 * worker, for "how we worked this out".
 */
export function estimateLines(
  costs: readonly ShiftCost[],
  workers: number,
): { lines: EstimateLine[]; urgentBillCents: number } {
  const lines = new Map<string, EstimateLine>();
  let urgentBillCents = 0;
  for (const cost of costs) {
    urgentBillCents += cost.urgentBillCents * workers;
    for (const line of cost.lines) {
      const key = `${line.type}:${line.kind}`;
      const existing = lines.get(key);
      if (existing) {
        existing.minutes += line.minutes * workers;
        existing.billCents += line.billCents * workers;
        if (existing.billRateCents !== line.billRateCents) {
          existing.billRateCents = null;
        }
      } else {
        lines.set(key, {
          type: line.type,
          kind: line.kind,
          minutes: line.minutes * workers,
          billCents: line.billCents * workers,
          billRateCents: line.billRateCents,
        });
      }
    }
  }
  return { lines: [...lines.values()], urgentBillCents };
}
