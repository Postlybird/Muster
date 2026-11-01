-- Award rules on rate cards (owner, 01/11/2026), so overtime and shift
-- penalties follow each work type's award:
--   * overtime in two parts: the first hours (tier_hours, usually 2) at the
--     overtime rate, then the later overtime rate;
--   * when daily overtime starts (overtime_after_hours; blank means the
--     daily_overtime_after_hours setting);
--   * Saturday in two parts the same way, and from a time of day
--     (saturday_later_from, 12:00 under the building award) every hour at
--     the later rate;
--   * Monday to Friday ordinary hours (ordinary_from to ordinary_to): time
--     outside them is overtime;
--   * whole-shift loadings, Monday to Friday: an early or late shift (starts
--     before or finishes after a time) and a night shift (finishes after
--     midnight and at or before a time).
-- Every one is optional: a card without them works as before. Rates are set
-- by admin and checked by a payroll professional (brief §4.8); the pay
-- engine in src/domain/pay.ts pays each minute at the highest rate that
-- applies. Existing grants and row-level security cover the new columns.

alter table public.rate_cards
  add column saturday_after_multiplier numeric(5, 3)
    check (saturday_after_multiplier > 0),
  add column overtime_after_multiplier numeric(5, 3)
    check (overtime_after_multiplier > 0),
  add column early_late_multiplier numeric(5, 3)
    check (early_late_multiplier > 0),
  add column night_shift_multiplier numeric(5, 3)
    check (night_shift_multiplier > 0),
  add column tier_hours numeric(4, 2) not null default 2
    check (tier_hours > 0 and tier_hours <= 12),
  add column overtime_after_hours numeric(4, 2)
    check (overtime_after_hours > 0 and overtime_after_hours <= 24),
  add column saturday_later_from time,
  add column ordinary_from time,
  add column ordinary_to time,
  add column early_late_starts_before time,
  add column early_late_finishes_after time,
  add column night_shift_finishes_by time,
  add constraint rate_cards_ordinary_hours_check
    check ((ordinary_from is null) = (ordinary_to is null)),
  add constraint rate_cards_early_late_check
    check (
      (early_late_multiplier is null)
      = (early_late_starts_before is null and early_late_finishes_after is null)
    ),
  add constraint rate_cards_night_shift_check
    check ((night_shift_multiplier is null) = (night_shift_finishes_by is null));

comment on column public.rate_cards.tier_hours is
  'Hours of overtime, and of Saturday work, at the first rate before the later rate.';
comment on column public.rate_cards.overtime_after_hours is
  'Ordinary hours in a day before overtime. Null: the daily_overtime_after_hours setting.';
comment on column public.rate_cards.saturday_later_from is
  'From this time on a Saturday, every hour is at the later Saturday rate.';
comment on column public.rate_cards.ordinary_from is
  'Monday to Friday ordinary hours start; time outside ordinary_from to ordinary_to is overtime.';
comment on column public.rate_cards.early_late_multiplier is
  'Monday to Friday, for the whole of a shift starting before early_late_starts_before or finishing after early_late_finishes_after.';
comment on column public.rate_cards.night_shift_multiplier is
  'Monday to Friday, for the whole of a shift finishing after midnight and at or before night_shift_finishes_by.';

-- Fixed bill rates for the same rate types. Blank: the closest fixed rate
-- (Saturday, overtime, or night for the shift loadings).
alter table public.bill_rate_rules
  add column fixed_saturday_after_cents integer
    check (fixed_saturday_after_cents > 0),
  add column fixed_overtime_after_cents integer
    check (fixed_overtime_after_cents > 0),
  add column fixed_early_late_cents integer
    check (fixed_early_late_cents > 0),
  add column fixed_night_shift_cents integer
    check (fixed_night_shift_cents > 0);
