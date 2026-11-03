-- Overtime priced without super (owner, 03/11/2026). Super is owed on
-- ordinary time earnings, not on overtime, so the hours a rate card's award
-- makes overtime are priced without it. Each card lists them: overtime at
-- both rates by default. A payroll professional adds weekend or holiday rates
-- where the award makes that work overtime too (for example, day workers'
-- weekends under the building award). Bookings priced before keep their terms.

alter table public.rate_cards
  add column super_free_types text[] not null default array['overtime', 'overtime_after'],
  add constraint rate_cards_super_free_types_check check (
    super_free_types <@ array[
      'overtime', 'overtime_after', 'saturday', 'saturday_after', 'sunday', 'public_holiday'
    ]
  );

comment on column public.rate_cards.super_free_types is
  'Rate types the award makes overtime, priced without super (src/domain/pay.ts onCostPctFor).';
