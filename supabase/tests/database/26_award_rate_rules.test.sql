-- Award rules on rate cards (owner, 01/11/2026): optional overtime tiers,
-- Saturday's later hours, ordinary hours and whole-shift loadings, each
-- complete or not set at all; and fixed bill rates for the same rate types.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.categories (id, code, name) values
  ('a1111111-0000-0000-0000-000000000001', 'pgtap_award_cleaner', 'PGTAP award cleaner');

select has_column('public', 'rate_cards', 'overtime_after_multiplier', 'Cards have a later overtime rate');
select has_column('public', 'bill_rate_rules', 'fixed_overtime_after_cents', 'Bill rules have a fixed later overtime rate');

insert into public.rate_cards (category_id, level, base_rate_cents, effective_from) values
  ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-01-01');
select is(
  (select tier_hours from public.rate_cards
   where category_id = 'a1111111-0000-0000-0000-000000000001' and effective_from = '2026-01-01'),
  2.00::numeric(4, 2),
  'The first 2 hours of overtime are at the first rate unless a card says otherwise'
);

select lives_ok($$
  insert into public.rate_cards (
    category_id, level, base_rate_cents, effective_from,
    overtime_multiplier, overtime_after_multiplier, overtime_after_hours, night_multiplier,
    early_late_multiplier, early_late_starts_before, early_late_finishes_after,
    night_shift_multiplier, night_shift_finishes_by
  ) values (
    'a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-11-01',
    1.75, 2.25, 7.6, 1.25,
    1.4, '06:00', '18:00',
    1.55, '08:00'
  )
$$, 'A cleaning award card with tiers and shift loadings saves');

select throws_ok($$
  insert into public.rate_cards (category_id, level, base_rate_cents, effective_from, ordinary_from)
  values ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-02-01', '07:00')
$$, '23514', null, 'Ordinary hours need a start and a finish');

select throws_ok($$
  insert into public.rate_cards (category_id, level, base_rate_cents, effective_from, early_late_multiplier)
  values ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-03-01', 1.4)
$$, '23514', null, 'An early or late shift rate needs the times it applies');

select throws_ok($$
  insert into public.rate_cards (category_id, level, base_rate_cents, effective_from, early_late_starts_before)
  values ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-04-01', '06:00')
$$, '23514', null, 'Early or late shift times need a rate');

select throws_ok($$
  insert into public.rate_cards (category_id, level, base_rate_cents, effective_from, night_shift_multiplier)
  values ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-05-01', 1.55)
$$, '23514', null, 'A night shift rate needs the time it finishes by');

select throws_ok($$
  insert into public.rate_cards (category_id, level, base_rate_cents, effective_from, overtime_after_multiplier)
  values ('a1111111-0000-0000-0000-000000000001', 1, 2748, '2026-06-01', 0)
$$, '23514', null, 'Rates must be above zero');

select throws_ok($$
  insert into public.bill_rate_rules (category_id, method, margin_pct, fixed_night_shift_cents, effective_from)
  values ('a1111111-0000-0000-0000-000000000001', 'markup', 30, -1, '2026-11-01')
$$, '23514', null, 'Fixed bill rates must be above zero');

select * from finish();
rollback;
