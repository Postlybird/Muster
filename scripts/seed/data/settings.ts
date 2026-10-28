/**
 * Policy settings (brief §12: "make these settings or placeholders"). Values
 * marked PLACEHOLDER are guesses for the demo and must be confirmed by the
 * owner (and a payroll professional where noted) before launch.
 */
export type SeedSetting = {
  key: string;
  value: unknown;
  isPublic: boolean;
  description: string;
};

export const SETTINGS: SeedSetting[] = [
  // Workers
  {
    key: "min_worker_age",
    value: 18,
    isPublic: true,
    description: "Minimum worker age in years (brief: 18+ in v1).",
  },
  {
    key: "default_travel_radius_km",
    value: 30,
    isPublic: true,
    description:
      "Starting travel radius for new workers, in km. Workers can change it.",
  },
  {
    key: "police_check_max_age_months",
    value: 12,
    isPublic: true,
    description:
      "PLACEHOLDER. Oldest National Police Check we accept, in months from issue date.",
  },
  {
    key: "expiry_warning_days",
    value: [30, 14, 7],
    isPublic: true,
    description:
      "Days before a ticket or visa expires when we warn the worker.",
  },
  {
    key: "bridging_visa_recheck_months",
    value: 3,
    isPublic: false,
    description:
      "How often to re-check VEVO for a bridging visa with no expiry date.",
  },

  // Cancellations, no-shows and reliability
  {
    key: "worker_late_cancel_hours",
    value: 12,
    isPublic: true,
    description:
      "PLACEHOLDER. A worker cancelling within this many hours of the start is a late cancellation.",
  },
  {
    key: "business_late_cancel_hours",
    value: 12,
    isPublic: true,
    description:
      "PLACEHOLDER. A business cancelling within this many hours of the start is charged.",
  },
  {
    key: "business_late_cancel_charge_hours",
    value: 3,
    isPublic: true,
    description:
      "PLACEHOLDER. Hours charged per worker for a late business cancellation.",
  },
  {
    key: "pay_worker_on_late_business_cancel",
    value: false,
    isPublic: false,
    description:
      "PLACEHOLDER. Also pay the worker when a business cancels late before they arrive (they are always paid the minimum engagement if they have arrived).",
  },
  {
    key: "no_show_flag_minutes",
    value: 30,
    isPublic: false,
    description:
      "Flag a possible no-show when nobody has clocked in this many minutes after the start.",
  },
  {
    key: "no_show_suspend_count",
    value: 2,
    isPublic: true,
    description:
      "No-shows within the window below that suspend a worker pending review.",
  },
  {
    key: "no_show_window_days",
    value: 30,
    isPublic: true,
    description: "Window for counting no-shows, in days.",
  },
  {
    key: "late_arrival_grace_minutes",
    value: 5,
    isPublic: false,
    description:
      "PLACEHOLDER. Minutes after the start before a clock-in counts as late.",
  },
  {
    key: "reliability_window_shifts",
    value: 20,
    isPublic: false,
    description: "Reliability is worked out over this many recent shifts.",
  },

  // On the day and timesheets
  {
    key: "geofence_radius_m",
    value: 200,
    isPublic: true,
    description:
      "PLACEHOLDER. Clock-ins further than this from the site are flagged.",
  },
  {
    key: "auto_approve_hours",
    value: 48,
    isPublic: true,
    description:
      "Hours a business has to approve or dispute a timesheet before it auto-approves.",
  },
  {
    key: "quiet_hours",
    value: { start: "21:00", end: "06:00" },
    isPublic: true,
    description: "No non-urgent messages between these Sydney times.",
  },

  // Pay and billing (commercial: admin-only)
  {
    key: "weekly_run_day",
    value: "monday",
    isPublic: false,
    description: "Day the weekly pay and billing run covers the previous week.",
  },
  {
    key: "gst_pct",
    value: 10,
    isPublic: true,
    description: "GST rate, percent.",
  },
  {
    key: "margin_pct",
    value: 18,
    isPublic: false,
    description:
      "PLACEHOLDER. Default margin on top of pay plus on-costs, percent.",
  },
  {
    key: "on_costs_pct",
    value: { super: 12, workers_comp: 5, payroll_tax: 5.45, insurance: 1 },
    isPublic: false,
    description:
      "PLACEHOLDER (to be checked by a payroll professional). On-costs as a percent of pay.",
  },
  {
    key: "daily_overtime_after_hours",
    value: 7.6,
    isPublic: false,
    description:
      "PLACEHOLDER. Hours in a day after which overtime rates apply (weekly overtime is left to payroll).",
  },
  {
    key: "night_hours",
    value: { start: "19:00", end: "06:00" },
    isPublic: false,
    description: "PLACEHOLDER. Hours that count as night work.",
  },
  {
    key: "urgent_loading_pct",
    value: { pay: 10, bill: 20 },
    isPublic: false,
    description:
      "PLACEHOLDER. Extra percent on pay and on the bill rate for urgent call-outs.",
  },
  {
    key: "invoice_payment_terms_days",
    value: 14,
    isPublic: false,
    description: "PLACEHOLDER. Days until an invoice is due.",
  },
];
