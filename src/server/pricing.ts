import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import {
  billRuleFromRow,
  costShift,
  splitShift,
  STATE_TIME_ZONES,
  totalOnCostPct,
  type MinutesByType,
  type ShiftCost,
  type StateCode,
} from "@/domain/pay";
import { pickBillRule, pickRateCard, rateCardFromRow } from "@/domain/rates";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

export type ShiftQuote =
  | {
      ok: true;
      /** The shift's local start date (yyyy-mm-dd), which picks the card and rule. */
      date: string;
      minutes: MinutesByType;
      cost: ShiftCost;
      card: { id: string; businessOwn: boolean; effectiveFrom: string };
      /** Null when the default margin applies. */
      billRule: { id: string; businessOwn: boolean } | null;
    }
  | { ok: false; problem: string };

/**
 * Loads what's needed to price shifts for one business, work type, level and
 * state, then prices each shift. Rate cards and bill rules are admin-only
 * tables, so they're read with the service-role key; callers only ever get
 * the result.
 */
export async function loadPricing(scope: {
  businessId: string | null;
  categoryId: string;
  level: number;
  state: StateCode;
}) {
  const admin = createAdminClient();
  const [cards, rules, holidays, category, settings] = await Promise.all([
    admin
      .from("rate_cards")
      .select("*")
      .eq("category_id", scope.categoryId)
      .is("archived_at", null),
    admin.from("bill_rate_rules").select("*").is("archived_at", null),
    admin.from("public_holidays").select("date").eq("state", scope.state),
    admin
      .from("categories")
      .select("min_engagement_hours, workers_comp_pct")
      .eq("id", scope.categoryId)
      .maybeSingle(),
    getAllSettings(),
  ]);
  const timeZone = STATE_TIME_ZONES[scope.state];
  const publicHolidays = new Set((holidays.data ?? []).map((h) => h.date));
  const businessId = scope.businessId ?? "";

  return {
    quote(shift: {
      start: Date;
      end: Date;
      breakMinutes: number;
      urgent: boolean;
    }): ShiftQuote {
      if (!category.data) return { ok: false, problem: "Unknown work type." };
      const date = formatInTimeZone(shift.start, timeZone, "yyyy-MM-dd");
      const card = pickRateCard(cards.data ?? [], {
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
      const rule = pickBillRule(rules.data ?? [], {
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
      const cost = costShift(minutes, {
        card: rateCardFromRow(card),
        billRule: billRuleFromRow(rule, settings.margin_pct),
        onCostPct: totalOnCostPct(
          settings.on_costs_pct,
          category.data.workers_comp_pct === null
            ? null
            : Number(category.data.workers_comp_pct),
        ),
        minEngagementMinutes: Math.round(
          Number(category.data.min_engagement_hours) * 60,
        ),
        urgent: shift.urgent
          ? {
              payPct: settings.urgent_loading_pct.pay,
              billPct: settings.urgent_loading_pct.bill,
            }
          : null,
        gstPct: settings.gst_pct,
      });
      return {
        ok: true,
        date,
        minutes,
        cost,
        card: {
          id: card.id,
          businessOwn: card.business_id !== null,
          effectiveFrom: card.effective_from,
        },
        billRule: rule
          ? { id: rule.id, businessOwn: rule.business_id !== null }
          : null,
      };
    },
  };
}
