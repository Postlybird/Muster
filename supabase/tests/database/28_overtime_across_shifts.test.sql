-- Overtime across a worker's shifts (owner, 02/11/2026): their hours with
-- us that day and week add up. A worker can't take a first-in shift their
-- other shifts would put into overtime unless the business allowed it; the
-- business picking someone decides for itself. The hours behind it are for
-- the server only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_ot_cleaner', 'PGTAP overtime cleaner');
insert into public.rate_cards (id, category_id, base_rate_cents, effective_from) values
  ('e9999999-0000-0000-0000-000000000009', 'e1111111-0000-0000-0000-000000000001', 2748, '2026-01-01');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}');
select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
update public.workers set status = 'active' where id = :'worker_a';

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'One', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111');
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);

-- A day three days from now (Sydney): the worker is booked 8 am to 2 pm
-- (6 hours). Then: Y, 3 pm to 7 pm the same day, closed to workers on
-- overtime; Z, 7:30 pm to 11 pm the same day, open to them; W, 8 am to
-- noon the next day, closed.
select ((now() at time zone 'Australia/Sydney')::date + 3) as d \gset
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards,
  fill_mode, allow_overtime) values
  ('f0000000-0000-0000-0000-000000000000', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto', false),
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto', false),
  ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto', true),
  ('f3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto', false);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount) values
  ('a0000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000000',
   (:'d'::date + time '08:00') at time zone 'Australia/Sydney',
   (:'d'::date + time '14:00') at time zone 'Australia/Sydney', 1),
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   (:'d'::date + time '15:00') at time zone 'Australia/Sydney',
   (:'d'::date + time '19:00') at time zone 'Australia/Sydney', 1),
  ('a2222222-0000-0000-0000-000000000002', 'f2222222-0000-0000-0000-000000000002',
   (:'d'::date + time '19:30') at time zone 'Australia/Sydney',
   (:'d'::date + time '23:00') at time zone 'Australia/Sydney', 1),
  ('a3333333-0000-0000-0000-000000000003', 'f3333333-0000-0000-0000-000000000003',
   (:'d'::date + 1 + time '08:00') at time zone 'Australia/Sydney',
   (:'d'::date + 1 + time '12:00') at time zone 'Australia/Sydney', 1);
insert into public.shift_pay (shift_id, hourly_cents, estimate_cents, rate_card_id, cost_rules,
  bill_hourly_cents, estimate_bill_cents, estimate_margin_cents)
select s.id, 3435, 13740, 'e9999999-0000-0000-0000-000000000009',
  '{"card": {"award": {"overtimeAfterMinutes": 456}}}', 5301, 21204, 4242
from public.shifts s where s.job_id in ('f0000000-0000-0000-0000-000000000000',
  'f1111111-0000-0000-0000-000000000001', 'f2222222-0000-0000-0000-000000000002',
  'f3333333-0000-0000-0000-000000000003');
insert into public.shift_matches (shift_id, worker_id, eligible, visible_from)
select s.id, :'worker_a', true, now() - interval '1 minute'
from public.shifts s where s.job_id in ('f1111111-0000-0000-0000-000000000001',
  'f2222222-0000-0000-0000-000000000002', 'f3333333-0000-0000-0000-000000000003');
insert into public.assignments (shift_id, worker_id)
values ('a0000000-0000-0000-0000-000000000000', :'worker_a');

select has_column('public', 'jobs', 'allow_overtime', 'Jobs say whether workers on overtime may take them');
select col_default_is('public', 'jobs', 'allow_overtime', 'false', 'Closed to them unless the business ticks it');
select is(public.state_time_zone('WA'), 'Australia/Perth', 'A site''s day is in its own time zone');
select results_eq(
  format($$ select day, minutes from public.worker_booked_minutes(array[%L]::uuid[], now(), now() + interval '30 days') $$, :'worker_a'),
  format($$ values (%L::date, 360) $$, :'d'),
  'A worker''s booked hours, by the site''s day'
);
select ok(
  public.overtime_from_other_shifts(:'worker_a', 'a1111111-0000-0000-0000-000000000001'),
  'Six hours that day and four more go past 7.6'
);
select ok(
  not public.overtime_from_other_shifts(:'worker_a', 'a3333333-0000-0000-0000-000000000003'),
  'The next day starts afresh, well short of the week''s 38 hours'
);
select ok(
  not has_function_privilege('authenticated', 'public.worker_booked_minutes(uuid[], timestamptz, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'public.overtime_from_other_shifts(uuid, uuid)', 'execute'),
  'Nobody signed in reads other people''s hours'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select result from public.accept_shifts(array['a1111111-0000-0000-0000-000000000001']::uuid[]) $$,
  array['overtime'],
  'A worker can''t take a first-in shift their other shifts would put into overtime'
);
select results_eq(
  $$ select result from public.accept_shifts(array['a2222222-0000-0000-0000-000000000002']::uuid[]) $$,
  array['booked'],
  'unless the business opened it to them'
);
select results_eq(
  $$ select result from public.accept_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[]) $$,
  array['booked'],
  'and a shift their other hours don''t affect is booked as usual'
);
reset role;

select public.duplicate_job('f2222222-0000-0000-0000-000000000002') as copy \gset
select is(
  (select allow_overtime from public.jobs where id = :'copy'),
  true,
  'Posting again keeps the choice'
);
select is(
  (select count(*)::integer from public.assignments
   where worker_id = :'worker_a' and status = 'confirmed'),
  3,
  'The refused shift wasn''t booked'
);

select * from finish();
rollback;
