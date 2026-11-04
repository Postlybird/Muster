-- Invoice lines with a row per rate, the job and PO numbers, and the award
-- and level (owner, 04/11/2026): jobs are numbered and nobody changes the
-- number; owners and managers set the PO at any time; a run keeps each
-- line's job, PO, award and rows, which must add up to its charge; the
-- business reads them through invoice_lines().
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- Start with no runs, whatever the demo data holds (undone at the end).
delete from public.pay_run_lines;
delete from public.invoices;
delete from public.pay_runs;

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e7111111-0000-0000-0000-000000000001', 'pgtap_layout_cleaner', 'PGTAP cleaner');
insert into public.rate_cards (id, category_id, level, base_rate_cents, effective_from, award) values
  ('c7111111-0000-0000-0000-000000000001', 'e7111111-0000-0000-0000-000000000001', 1, 2748,
   '2026-01-01', 'Cleaning Services Award 2020, level 1');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('17111111-1111-1111-1111-111111111111', 'worker@layout.pgtap.test', now(), '{}'),
  ('67111111-1111-1111-1111-111111111111', 'owner@layout.pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('67555555-5555-5555-5555-555555555555', 'other@layout.pgtap.test', now(), '{"signup_role": "business_user"}');
select id as worker from public.workers where profile_id = '17111111-1111-1111-1111-111111111111' \gset

insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b7111111-0000-0000-0000-000000000001', '71111111111', 'PGTAP LAYOUT PTY LTD', 'active', now(),
   'approved', true, '67111111-1111-1111-1111-111111111111'),
  ('b7222222-0000-0000-0000-000000000002', '72222222222', 'PGTAP OTHER PTY LTD', 'active', now(),
   'approved', true, '67555555-5555-5555-5555-555555555555');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b7111111-0000-0000-0000-000000000001', '67111111-1111-1111-1111-111111111111', 'owner', now()),
  ('b7222222-0000-0000-0000-000000000002', '67555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d7111111-0000-0000-0000-000000000001', 'b7111111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f7111111-0000-0000-0000-000000000001', 'b7111111-0000-0000-0000-000000000001',
   'd7111111-0000-0000-0000-000000000001', 'e7111111-0000-0000-0000-000000000001', 'completed', now(), true),
  ('f7222222-0000-0000-0000-000000000002', 'b7111111-0000-0000-0000-000000000001',
   'd7111111-0000-0000-0000-000000000001', 'e7111111-0000-0000-0000-000000000001', 'completed', now(), true);

-- Job numbers.
select ok(
  (select number from public.jobs where id = 'f7222222-0000-0000-0000-000000000002')
    > (select number from public.jobs where id = 'f7111111-0000-0000-0000-000000000001'),
  'jobs are numbered in order'
);
select throws_ok(
  $$ insert into public.jobs (business_id, number) values ('b7111111-0000-0000-0000-000000000001', 5) $$,
  '428C9', null, 'nobody chooses a job number'
);
select throws_ok(
  $$ update public.jobs set number = 5 where id = 'f7111111-0000-0000-0000-000000000001' $$,
  '428C9', null, 'or changes one'
);

-- PO numbers, set by the business's owners and managers, even after posting.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "67111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.set_job_po_number('f7111111-0000-0000-0000-000000000001', '  PO-4471/B ') $$,
  'an owner sets a posted job''s PO number'
);
select is(
  (select po_number from public.jobs where id = 'f7111111-0000-0000-0000-000000000001'),
  'PO-4471/B', 'trimmed'
);
select throws_ok(
  $$ select public.set_job_po_number('f7111111-0000-0000-0000-000000000001', repeat('9', 51)) $$,
  '23514', 'Keep the PO or reference number to 50 characters', 'kept short'
);
select lives_ok(
  $$ select public.set_job_po_number('f7222222-0000-0000-0000-000000000002', '') $$,
  'a blank one clears it'
);
select is(
  (select po_number from public.jobs where id = 'f7222222-0000-0000-0000-000000000002'),
  null, 'cleared'
);
select is(
  (select po_number from public.jobs where id = public.duplicate_job('f7111111-0000-0000-0000-000000000001')),
  null, '"Post again" leaves the PO number for the new job'
);

select set_config('request.jwt.claims', '{"sub": "67555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.set_job_po_number('f7111111-0000-0000-0000-000000000001', 'MINE') $$,
  'P0002', 'Job not found', 'another business can''t'
);
select set_config('request.jwt.claims', '{"sub": "17111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.set_job_po_number('f7111111-0000-0000-0000-000000000001', 'MINE') $$,
  'P0002', 'Job not found', 'nor can a worker'
);
reset role;

-- A run's lines: approved hours on last Tuesday, booked at the card above.
select (date_trunc('week', now() at time zone 'Australia/Sydney')::date - 7) as last_monday \gset
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a7111111-0000-0000-0000-000000000001', 'f7111111-0000-0000-0000-000000000001',
   (:'last_monday'::date + 1 + time '07:00') at time zone 'Australia/Sydney',
   (:'last_monday'::date + 1 + time '15:30') at time zone 'Australia/Sydney', 1, 'completed');
insert into public.assignments (id, shift_id, worker_id, status) values
  ('97111111-0000-0000-0000-000000000001', 'a7111111-0000-0000-0000-000000000001', :'worker', 'confirmed');
insert into public.assignment_rates (assignment_id, rate_card_id, cost_rules, pay_hourly_cents,
  bill_hourly_cents, estimate_pay_cents, estimate_bill_cents, estimate_margin_cents) values
  ('97111111-0000-0000-0000-000000000001', 'c7111111-0000-0000-0000-000000000001', '{}', 3435, 4660,
   27480, 37280, 3000);
insert into public.timesheets (id, assignment_id, worker_id, job_id, start_at, finish_at, break_minutes, status, approve_by)
select '77111111-0000-0000-0000-000000000001', '97111111-0000-0000-0000-000000000001', :'worker',
  'f7111111-0000-0000-0000-000000000001', starts_at, ends_at, 30, 'approved', now()
from public.shifts where id = 'a7111111-0000-0000-0000-000000000001';
insert into public.timesheet_costs (timesheet_id, start_at, finish_at, break_minutes, minutes_by_type,
  cost, paid_minutes, pay_cents, on_cost_cents, bill_cents, margin_cents)
select id, start_at, finish_at, break_minutes, '{}', '{}', 480, 27480, 5000, 38218, 5738
from public.timesheets where id = '77111111-0000-0000-0000-000000000001';

select format(
  $$[{"kind": "hours", "assignment_id": "97111111-0000-0000-0000-000000000001",
      "timesheet_id": "77111111-0000-0000-0000-000000000001", "worker_id": "%1$s",
      "business_id": "b7111111-0000-0000-0000-000000000001", "work_date": "%2$s",
      "hours": 8, "work_type": "PGTAP cleaner, level 1", "site_name": "Depot", "pay_cents": 27480,
      "bill_cents": 38218, "description": "A · PGTAP cleaner · Depot",
      "detail": "7:00 am to 3:30 pm, 30 min break",
      "parts": [
        {"label": "Ordinary", "minutes": 456, "rate_cents": 4660, "amount_cents": 35416},
        {"label": "Overtime", "minutes": 24, "rate_cents": 5866, "amount_cents": 2346},
        {"label": "Meal allowance", "minutes": null, "rate_cents": null, "amount_cents": 456}
      ]}]$$,
  :'worker', :'last_monday'::date + 1
) as lines \gset
select '[{"business_id": "b7111111-0000-0000-0000-000000000001", "issued_on": "2026-11-09",
  "due_on": "2026-11-23", "subtotal_cents": 38218, "gst_cents": 3822, "total_cents": 42040}]' as invoices \gset

select throws_ok(
  format($$ select public.save_pay_run(%L, null, %L, %L) $$,
    :'last_monday', :'invoices', replace(:'lines', '"amount_cents": 456', '"amount_cents": 457')),
  '23514', 'A line''s rates don''t add up to its charge', 'a line''s rows add up to its charge'
);
select lives_ok(
  format($$ select public.save_pay_run(%L, null, %L, %L) $$, :'last_monday', :'invoices', :'lines'),
  'the run saves'
);
select results_eq(
  $$ select l.job_number, l.po_number, l.award, jsonb_array_length(l.parts)
     from public.pay_run_lines l
     where l.assignment_id = '97111111-0000-0000-0000-000000000001' $$,
  $$ select j.number, 'PO-4471/B'::text, 'Cleaning Services Award 2020, level 1'::text, 3
     from public.jobs j where j.id = 'f7111111-0000-0000-0000-000000000001' $$,
  'each line keeps the job and PO numbers, the award and level, and its rows'
);

select id as invoice from public.invoices where business_id = 'b7111111-0000-0000-0000-000000000001' \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "67111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  format($$ select po_number, site_name, award, parts -> 1 ->> 'label', detail
     from public.invoice_lines(%L) $$, :'invoice'),
  $$ values ('PO-4471/B'::text, 'Depot'::text, 'Cleaning Services Award 2020, level 1'::text,
       'Overtime'::text, '7:00 am to 3:30 pm, 30 min break'::text) $$,
  'the business reads them on its invoice'
);
select set_config('request.jwt.claims', '{"sub": "67555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty(
  format($$ select 1 from public.invoice_lines(%L) $$, :'invoice'),
  'another business doesn''t'
);
reset role;

select * from finish();
rollback;
