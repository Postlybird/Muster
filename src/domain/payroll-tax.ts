/**
 * NSW payroll tax (owner, 14/11/2026): it's left out of prices until wages
 * near the threshold, and the admin dashboard warns before then. Taxable
 * wages include super, and a month's wages over the month's share of the
 * yearly threshold also mean registering with Revenue NSW.
 */

/** Warn from this share of the threshold. */
export const PAYROLL_TAX_WARN_SHARE = 0.8;

export type PayrollTaxWages = {
  /** Wages paid in the last 365 days (pay runs), without super. */
  yearPayCents: number;
  /** Wages paid in the last 30 days, without super. */
  monthPayCents: number;
  /** The yearly threshold. */
  thresholdCents: number;
  superPct: number;
};

export type PayrollTaxWarning = {
  /** Past a threshold, not just near one. */
  over: boolean;
  /** Taxable wages (with super), the last 365 days. */
  yearCents: number;
  /** Taxable wages (with super), the last 30 days. */
  monthCents: number;
  /** The share of the yearly threshold for 30 days. */
  monthThresholdCents: number;
};

/** A warning once taxable wages near either threshold, or null. */
export function payrollTaxWarning(
  wages: PayrollTaxWages,
): PayrollTaxWarning | null {
  const withSuper = (cents: number) =>
    Math.round((cents * (100 + wages.superPct)) / 100);
  const yearCents = withSuper(wages.yearPayCents);
  const monthCents = withSuper(wages.monthPayCents);
  const monthThresholdCents = Math.round((wages.thresholdCents * 30) / 365);
  const near =
    yearCents >= wages.thresholdCents * PAYROLL_TAX_WARN_SHARE ||
    monthCents >= monthThresholdCents * PAYROLL_TAX_WARN_SHARE;
  if (!near) return null;
  return {
    over: yearCents > wages.thresholdCents || monthCents > monthThresholdCents,
    yearCents,
    monthCents,
    monthThresholdCents,
  };
}
