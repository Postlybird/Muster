import { z } from "zod";

/**
 * Every admin-managed policy value (brief §12: "make these settings or
 * placeholders"). This registry is the one source of truth: the seed loads
 * the defaults, the admin settings page renders and validates from it, and
 * server code reads typed values through it.
 *
 * `placeholder: true` marks values we guessed for the demo. The owner (and a
 * payroll professional, for money) must confirm them before launch.
 */

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, like 21:00");
const percent = z.number().min(0).max(100);

export type SettingInput =
  | { kind: "number"; unit?: string; step?: number; min?: number; max?: number }
  | { kind: "boolean" }
  | { kind: "time_range" }
  | { kind: "weekday" }
  | { kind: "number_list"; unit?: string }
  | { kind: "percent_fields"; fields: { key: string; label: string }[] }
  | { kind: "text"; maxLength: number }
  | {
      kind: "text_fields";
      fields: {
        key: string;
        label: string;
        type?: "text" | "email" | "tel";
        maxLength: number;
      }[];
    };

export type SettingGroup = "workers" | "cancellations" | "on_the_day" | "money";

export const settingGroups: Record<SettingGroup, string> = {
  workers: "Workers",
  cancellations: "Cancellations, no-shows and reliability",
  on_the_day: "On the day and timesheets",
  money: "Pay and billing",
};

type Definition<S extends z.ZodType> = {
  label: string;
  help: string;
  group: SettingGroup;
  schema: S;
  defaultValue: z.infer<S>;
  input: SettingInput;
  /** Readable by any signed-in user. Commercial values must stay false. */
  isPublic: boolean;
  placeholder?: boolean;
};

function define<S extends z.ZodType>(definition: Definition<S>): Definition<S> {
  return definition;
}

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const SETTINGS = {
  // Workers
  min_worker_age: define({
    label: "Minimum worker age",
    help: "Workers must be at least this old to sign up (brief: 18+ in v1).",
    group: "workers",
    schema: z.number().int().min(15).max(99),
    defaultValue: 18,
    input: { kind: "number", unit: "years", min: 15, max: 99 },
    isPublic: true,
  }),
  default_travel_radius_km: define({
    label: "Starting travel radius",
    help: "How far new workers are willing to travel. Each worker can change their own.",
    group: "workers",
    schema: z.number().int().min(1).max(300),
    defaultValue: 30,
    input: { kind: "number", unit: "km", min: 1, max: 300 },
    isPublic: true,
  }),
  police_check_max_age_months: define({
    label: "Oldest accepted police check",
    help: "We accept a National Police Check for this many months from its issue date.",
    group: "workers",
    schema: z.number().int().min(1).max(60),
    defaultValue: 12,
    input: { kind: "number", unit: "months", min: 1, max: 60 },
    isPublic: true,
    placeholder: true,
  }),
  expiry_warning_days: define({
    label: "Expiry warnings",
    help: "Days before a ticket or visa expires when we warn the worker.",
    group: "workers",
    schema: z.array(z.number().int().min(1).max(365)).min(1).max(6),
    defaultValue: [30, 14, 7],
    input: { kind: "number_list", unit: "days before" },
    isPublic: true,
  }),
  bridging_visa_recheck_months: define({
    label: "Bridging visa re-check",
    help: "How often to re-check VEVO for a bridging visa with no expiry date.",
    group: "workers",
    schema: z.number().int().min(1).max(12),
    defaultValue: 3,
    input: { kind: "number", unit: "months", min: 1, max: 12 },
    isPublic: false,
  }),

  // Cancellations, no-shows and reliability
  worker_late_cancel_hours: define({
    label: "Worker late cancellation window",
    help: "A worker cancelling within this many hours of the start counts as a late cancellation.",
    group: "cancellations",
    schema: z.number().int().min(0).max(168),
    defaultValue: 12,
    input: { kind: "number", unit: "hours", min: 0, max: 168 },
    isPublic: true,
    placeholder: true,
  }),
  business_late_cancel_hours: define({
    label: "Business late cancellation window",
    help: "A business cancelling within this many hours of the start is charged.",
    group: "cancellations",
    schema: z.number().int().min(0).max(168),
    defaultValue: 12,
    input: { kind: "number", unit: "hours", min: 0, max: 168 },
    isPublic: true,
    placeholder: true,
  }),
  business_late_cancel_charge_hours: define({
    label: "Late cancellation charge",
    help: "Hours charged per booked worker when a business cancels late.",
    group: "cancellations",
    schema: z.number().min(0).max(12),
    defaultValue: 3,
    input: { kind: "number", unit: "hours", step: 0.5, min: 0, max: 12 },
    isPublic: true,
    placeholder: true,
  }),
  pay_worker_on_late_business_cancel: define({
    label: "Pay workers for late business cancellations",
    help: "Also pay the worker when a business cancels late before they arrive. Workers who have arrived are always paid the minimum engagement.",
    group: "cancellations",
    schema: z.boolean(),
    defaultValue: false,
    input: { kind: "boolean" },
    isPublic: false,
    placeholder: true,
  }),
  no_show_flag_minutes: define({
    label: "Possible no-show after",
    help: "Flag a possible no-show when nobody has clocked in this many minutes after the start.",
    group: "cancellations",
    schema: z.number().int().min(5).max(240),
    defaultValue: 30,
    input: { kind: "number", unit: "minutes", min: 5, max: 240 },
    isPublic: false,
  }),
  no_show_suspend_count: define({
    label: "No-shows before suspension",
    help: "This many no-shows within the window below suspends a worker pending review.",
    group: "cancellations",
    schema: z.number().int().min(1).max(10),
    defaultValue: 2,
    input: { kind: "number", unit: "no-shows", min: 1, max: 10 },
    isPublic: true,
  }),
  no_show_window_days: define({
    label: "No-show window",
    help: "Period for counting no-shows.",
    group: "cancellations",
    schema: z.number().int().min(1).max(365),
    defaultValue: 30,
    input: { kind: "number", unit: "days", min: 1, max: 365 },
    isPublic: true,
  }),
  late_arrival_grace_minutes: define({
    label: "Late arrival grace period",
    help: "Minutes after the start before a clock-in counts as late.",
    group: "cancellations",
    schema: z.number().int().min(0).max(60),
    defaultValue: 5,
    input: { kind: "number", unit: "minutes", min: 0, max: 60 },
    isPublic: false,
    placeholder: true,
  }),
  reliability_window_shifts: define({
    label: "Reliability period",
    help: "Reliability is worked out over this many of the worker's most recent shifts.",
    group: "cancellations",
    schema: z.number().int().min(5).max(100),
    defaultValue: 20,
    input: { kind: "number", unit: "shifts", min: 5, max: 100 },
    isPublic: false,
  }),
  reliability_late_cancel_credit: define({
    label: "A late cancellation counts as",
    help: "In reliability, a worked shift counts as 100% and a no-show as 0%. A late cancellation counts as this much of a worked shift.",
    group: "cancellations",
    schema: percent,
    defaultValue: 50,
    input: { kind: "number", unit: "%", min: 0, max: 100 },
    isPublic: false,
    placeholder: true,
  }),
  reliability_late_arrival_credit: define({
    label: "A late arrival counts as",
    help: "In reliability, a shift started after the late arrival grace period counts as this much of a worked shift.",
    group: "cancellations",
    schema: percent,
    defaultValue: 75,
    input: { kind: "number", unit: "%", min: 0, max: 100 },
    isPublic: false,
    placeholder: true,
  }),

  // On the day and timesheets
  geofence_radius_m: define({
    label: "Clock-in distance",
    help: "Clock-ins further than this from the site are allowed with a reason, and flagged.",
    group: "on_the_day",
    schema: z.number().int().min(25).max(5000),
    defaultValue: 200,
    input: { kind: "number", unit: "metres", min: 25, max: 5000 },
    isPublic: true,
    placeholder: true,
  }),
  auto_approve_hours: define({
    label: "Timesheet approval window",
    help: "Hours a business has to approve or dispute a timesheet before it approves itself.",
    group: "on_the_day",
    schema: z.number().int().min(1).max(336),
    defaultValue: 48,
    input: { kind: "number", unit: "hours", min: 1, max: 336 },
    isPublic: true,
  }),
  callout_alert_minutes: define({
    label: "Call-out not taken after",
    help: "If nobody has accepted a call-out after this many minutes, we tell the business and our team.",
    group: "on_the_day",
    schema: z.number().int().min(5).max(240),
    defaultValue: 20,
    input: { kind: "number", unit: "minutes", min: 5, max: 240 },
    isPublic: false,
  }),
  quiet_hours: define({
    label: "Quiet hours",
    help: "Non-urgent messages wait until these hours end (Sydney time). Set both to the same time for no quiet hours.",
    group: "on_the_day",
    schema: z.object({ start: time, end: time }),
    defaultValue: { start: "21:00", end: "06:00" },
    input: { kind: "time_range" },
    isPublic: true,
  }),

  // Pay and billing (commercial values are admin-only)
  weekly_run_day: define({
    label: "Weekly pay and billing run",
    help: "The run on this day covers the previous Monday to Sunday.",
    group: "money",
    schema: z.enum(weekdays),
    defaultValue: "monday",
    input: { kind: "weekday" },
    isPublic: false,
  }),
  gst_pct: define({
    label: "GST",
    help: "GST rate added to invoices.",
    group: "money",
    schema: percent,
    defaultValue: 10,
    input: { kind: "number", unit: "%", step: 0.01, min: 0, max: 100 },
    isPublic: true,
  }),
  margin_pct: define({
    label: "Default margin",
    help: "Our margin on top of pay plus on-costs, unless a bill rule says otherwise.",
    group: "money",
    schema: percent,
    defaultValue: 18,
    input: { kind: "number", unit: "%", step: 0.01, min: 0, max: 100 },
    isPublic: false,
    placeholder: true,
  }),
  on_costs_pct: define({
    label: "On-costs",
    help: "Employer costs as a percent of pay. Workers' comp can be overridden per category. To be checked by a payroll professional.",
    group: "money",
    schema: z.object({
      super: percent,
      workers_comp: percent,
      payroll_tax: percent,
      insurance: percent,
    }),
    defaultValue: {
      super: 12,
      workers_comp: 5,
      payroll_tax: 5.45,
      insurance: 1,
    },
    input: {
      kind: "percent_fields",
      fields: [
        { key: "super", label: "Super" },
        { key: "workers_comp", label: "Workers' comp" },
        { key: "payroll_tax", label: "Payroll tax" },
        { key: "insurance", label: "Insurance" },
      ],
    },
    isPublic: false,
    placeholder: true,
  }),
  daily_overtime_after_hours: define({
    label: "Daily overtime after",
    help: "Hours worked in a day after which the overtime rate applies. Weekly overtime is left to payroll.",
    group: "money",
    schema: z.number().min(1).max(24),
    defaultValue: 7.6,
    input: { kind: "number", unit: "hours", step: 0.1, min: 1, max: 24 },
    isPublic: false,
    placeholder: true,
  }),
  night_hours: define({
    label: "Night hours",
    help: "Hours worked between these times are paid at the night rate (unless a weekend or public holiday rate is higher).",
    group: "money",
    schema: z.object({ start: time, end: time }),
    defaultValue: { start: "19:00", end: "06:00" },
    input: { kind: "time_range" },
    isPublic: false,
    placeholder: true,
  }),
  urgent_loading_pct: define({
    label: "Urgent call-out loading",
    help: "Extra percent on pay (paid as an allowance) and on the bill rate for urgent call-outs.",
    group: "money",
    schema: z.object({ pay: percent, bill: percent }),
    // The owner set call-out pay at 20% more (31/10/2026).
    defaultValue: { pay: 20, bill: 20 },
    input: {
      kind: "percent_fields",
      fields: [
        { key: "pay", label: "On pay" },
        { key: "bill", label: "On the bill" },
      ],
    },
    isPublic: false,
    placeholder: true,
  }),
  invoice_prefix: define({
    label: "Invoice number prefix",
    help: "Goes before each invoice's number, like INV-1001.",
    group: "money",
    schema: z
      .string()
      .trim()
      .regex(
        /^[A-Z0-9-]{1,10}$/,
        "Use up to 10 capital letters, numbers or dashes",
      ),
    defaultValue: "INV-",
    input: { kind: "text", maxLength: 10 },
    isPublic: false,
    placeholder: true,
  }),
  company_details: define({
    label: "Our details on invoices",
    help: "The legal name, ABN and address on every tax invoice, and who businesses contact about invoices.",
    group: "money",
    schema: z.object({
      legal_name: z.string().trim().max(120),
      abn: z
        .string()
        .trim()
        .regex(/^(\d{11})?$/, "An ABN is 11 digits, with no spaces"),
      address: z.string().trim().max(200),
      email: z.union([z.literal(""), z.email("Enter an email address")]),
      phone: z.string().trim().max(20),
    }),
    defaultValue: {
      legal_name: "",
      abn: "",
      address: "",
      email: "",
      phone: "",
    },
    input: {
      kind: "text_fields",
      fields: [
        { key: "legal_name", label: "Legal name", maxLength: 120 },
        { key: "abn", label: "ABN", maxLength: 11 },
        { key: "address", label: "Address", maxLength: 200 },
        {
          key: "email",
          label: "Accounts email",
          type: "email",
          maxLength: 200,
        },
        { key: "phone", label: "Phone", type: "tel", maxLength: 20 },
      ],
    },
    isPublic: false,
    placeholder: true,
  }),
  bank_details: define({
    label: "Bank account for payments",
    help: "Printed on invoices so businesses can pay by bank transfer.",
    group: "money",
    schema: z.object({
      account_name: z.string().trim().max(100),
      bsb: z
        .string()
        .trim()
        .regex(/^(\d{3}-?\d{3})?$/, "A BSB is 6 digits"),
      account_number: z
        .string()
        .trim()
        .regex(/^(\d{5,10})?$/, "An account number is 5 to 10 digits"),
    }),
    defaultValue: { account_name: "", bsb: "", account_number: "" },
    input: {
      kind: "text_fields",
      fields: [
        { key: "account_name", label: "Account name", maxLength: 100 },
        { key: "bsb", label: "BSB", maxLength: 7 },
        { key: "account_number", label: "Account number", maxLength: 10 },
      ],
    },
    isPublic: false,
    placeholder: true,
  }),
  invoice_payment_terms_days: define({
    label: "Invoice payment terms",
    help: "Days after the invoice date that payment is due.",
    group: "money",
    schema: z.number().int().min(0).max(90),
    defaultValue: 14,
    input: { kind: "number", unit: "days", min: 0, max: 90 },
    isPublic: false,
    placeholder: true,
  }),
};

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<
  (typeof SETTINGS)[K]["schema"]
>;
export type SettingsValues = { [K in SettingKey]: SettingValue<K> };

export const settingKeys = Object.keys(SETTINGS) as SettingKey[];

/** A stored value if it's valid, otherwise the default (and the reason). */
export function parseSetting<K extends SettingKey>(
  key: K,
  stored: unknown,
): { value: SettingValue<K>; valid: boolean } {
  const definition = SETTINGS[key];
  const parsed = definition.schema.safeParse(stored);
  return parsed.success
    ? { value: parsed.data as SettingValue<K>, valid: true }
    : { value: definition.defaultValue as SettingValue<K>, valid: false };
}
