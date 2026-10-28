-- The weekly run: what's owed, saved in one go with invoice numbers, only
-- for weeks that are over, once each and in order; paid hours can't
-- change; businesses see their invoices and lines' charges (never pay);
-- admins mark invoices paid.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Start with no runs, whatever the demo data holds (undone at the end).
delete from public.pay_run_lines;
delete from public.invoices;
delete from public.pay_runs;

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', now(), '{}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'One', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111'),
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP TWO PTY LTD', null, 'active', now(),
   'approved', true, '65555555-5555-5555-5555-555555555555');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'completed', now(), true);

-- Last week (Monday to Sunday in Sydney), and the week before.
select (date_trunc('week', now() at time zone 'Australia/Sydney')::date - 7) as last_monday \gset
select (:'last_monday'::date - 7) as earlier_monday \gset

-- S1: worker A worked last Tuesday (approved). S2: worker B, last Wednesday
-- (still waiting). S3: worker B, cancelled late by the business last
-- Thursday. S4: worker B, the week before (waiting). S5: worker A had
-- arrived when the business cancelled last Friday.
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   (:'last_monday'::date + 1 + time '09:00') at time zone 'Australia/Sydney',
   (:'last_monday'::date + 1 + time '13:00') at time zone 'Australia/Sydney', 1, 'completed'),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   (:'last_monday'::date + 2 + time '09:00') at time zone 'Australia/Sydney',
   (:'last_monday'::date + 2 + time '13:00') at time zone 'Australia/Sydney', 1, 'completed'),
  ('a3333333-0000-0000-0000-000000000003', 'f1111111-0000-0000-0000-000000000001',
   (:'last_monday'::date + 3 + time '09:00') at time zone 'Australia/Sydney',
   (:'last_monday'::date + 3 + time '13:00') at time zone 'Australia/Sydney', 1, 'cancelled'),
  ('a4444444-0000-0000-0000-000000000004', 'f1111111-0000-0000-0000-000000000001',
   (:'earlier_monday'::date + 2 + time '09:00') at time zone 'Australia/Sydney',
   (:'earlier_monday'::date + 2 + time '13:00') at time zone 'Australia/Sydney', 1, 'completed'),
  ('a5555555-0000-0000-0000-000000000005', 'f1111111-0000-0000-0000-000000000001',
   (:'last_monday'::date + 4 + time '09:00') at time zone 'Australia/Sydney',
   (:'last_monday'::date + 4 + time '13:00') at time zone 'Australia/Sydney', 1, 'cancelled');
insert into public.assignments (id, shift_id, worker_id, status, cancellation_charge_hours) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a', 'confirmed', null),
  ('92222222-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000002', :'worker_b', 'confirmed', null),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_b', 'cancelled_by_business', 3),
  ('94444444-0000-0000-0000-000000000004', 'a4444444-0000-0000-0000-000000000004', :'worker_b', 'confirmed', null),
  ('95555555-0000-0000-0000-000000000005', 'a5555555-0000-0000-0000-000000000005', :'worker_a', 'cancelled_by_business', null);
insert into public.attendance_events (assignment_id, kind, occurred_at, inside_geofence)
select '95555555-0000-0000-0000-000000000005', 'clock_in', starts_at - interval '10 minutes', true
from public.shifts where id = 'a5555555-0000-0000-0000-000000000005';
insert into public.timesheets (id, assignment_id, worker_id, job_id, start_at, finish_at, status, approve_by)
select t.id, t.assignment_id, t.worker_id, 'f1111111-0000-0000-0000-000000000001', s.starts_at, s.ends_at, t.status, now()
from (values
  ('71111111-0000-0000-0000-000000000001'::uuid, '91111111-0000-0000-0000-000000000001'::uuid, :'worker_a'::uuid, 'approved'::public.timesheet_status, 'a1111111-0000-0000-0000-000000000001'::uuid),
  ('72222222-0000-0000-0000-000000000002', '92222222-0000-0000-0000-000000000002', :'worker_b', 'submitted', 'a2222222-0000-0000-0000-000000000002'),
  ('74444444-0000-0000-0000-000000000004', '94444444-0000-0000-0000-000000000004', :'worker_b', 'submitted', 'a4444444-0000-0000-0000-000000000004')
) as t (id, assignment_id, worker_id, status, shift_id)
join public.shifts s on s.id = t.shift_id;
insert into public.timesheet_costs (timesheet_id, start_at, finish_at, break_minutes, minutes_by_type,
  cost, paid_minutes, pay_cents, on_cost_cents, bill_cents, margin_cents)
select id, start_at, finish_at, break_minutes, '{}', '{}', 240, 15000, 3000, 22000, 4000
from public.timesheets where id = '71111111-0000-0000-0000-000000000001';

select results_eq(
  format($$ select kind::text, assignment_id from public.pay_run_candidates(%L)
     where assignment_id in ('91111111-0000-0000-0000-000000000001', '92222222-0000-0000-0000-000000000002',
       '93333333-0000-0000-0000-000000000003', '94444444-0000-0000-0000-000000000004',
       '95555555-0000-0000-0000-000000000005')
     order by assignment_id $$, (:'last_monday'::date + 7)::timestamp at time zone 'Australia/Sydney'),
  $$ values ('hours', '91111111-0000-0000-0000-000000000001'::uuid),
       ('cancellation', '93333333-0000-0000-0000-000000000003'::uuid),
       ('cancellation', '95555555-0000-0000-0000-000000000005'::uuid) $$,
  'a run pays approved hours and late cancellations, not hours still waiting'
);

-- What the server sends: A's hours, B's cancellation charge, A's minimum
-- engagement after arriving, and one invoice.
select format(
  $$[{"kind": "hours", "assignment_id": "91111111-0000-0000-0000-000000000001",
      "timesheet_id": "71111111-0000-0000-0000-000000000001", "worker_id": "%1$s",
      "business_id": "b1111111-0000-0000-0000-000000000001", "work_date": "%2$s",
      "hours": 4, "work_type": "PGTAP cleaner", "site_name": "Depot", "pay_cents": 15000,
      "bill_cents": 22000, "description": "A, Tuesday"},
     {"kind": "cancellation", "assignment_id": "93333333-0000-0000-0000-000000000003",
      "worker_id": "%3$s", "business_id": "b1111111-0000-0000-0000-000000000001",
      "work_date": "%4$s", "hours": 3, "work_type": "PGTAP cleaner", "site_name": "Depot",
      "pay_cents": 0, "bill_cents": 13500, "description": "Late cancellation"},
     {"kind": "cancellation", "assignment_id": "95555555-0000-0000-0000-000000000005",
      "worker_id": "%1$s", "business_id": "b1111111-0000-0000-0000-000000000001",
      "work_date": "%5$s", "hours": 3, "work_type": "PGTAP cleaner", "site_name": "Depot",
      "pay_cents": 9000, "bill_cents": 13500, "description": "Sent home"}]$$,
  :'worker_a', :'last_monday'::date + 1, :'worker_b', :'last_monday'::date + 3,
  :'last_monday'::date + 4
) as lines \gset
select '[{"business_id": "b1111111-0000-0000-0000-000000000001", "issued_on": "2026-11-02",
  "due_on": "2026-11-16", "subtotal_cents": 49000, "gst_cents": 4900, "total_cents": 53900}]' as invoices \gset

select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    date_trunc('week', now() at time zone 'Australia/Sydney')::date, :'invoices', :'lines'),
  '23514', 'That week isn''t over yet', 'only weeks that are over'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday'::date + 1, :'invoices', :'lines'),
  '23514', 'A run starts on a Monday', 'weeks start on a Monday'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday', replace(replace(:'invoices', '49000', '48000'), '53900', '52900'), :'lines'),
  '23514', 'An invoice doesn''t add up to its lines', 'invoices add up'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday', :'invoices', replace(:'lines', '"pay_cents": 15000', '"pay_cents": 16000')),
  '23514', 'Some hours changed while the run was being worked out. Try again',
  'pay matches the approved, costed hours'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday',
    '[{"business_id": "b1111111-0000-0000-0000-000000000001", "issued_on": "2026-11-02", "due_on": "2026-11-16", "subtotal_cents": 1, "gst_cents": 0, "total_cents": 1}]',
    format($$[{"kind": "hours", "assignment_id": "92222222-0000-0000-0000-000000000002",
      "timesheet_id": "72222222-0000-0000-0000-000000000002", "worker_id": "%s",
      "business_id": "b1111111-0000-0000-0000-000000000001", "work_date": "%s", "hours": 4,
      "work_type": "PGTAP cleaner", "site_name": "Depot", "pay_cents": 1, "bill_cents": 1,
      "description": "B"}]$$, :'worker_b', :'last_monday'::date + 2)),
  '23514', 'Some hours changed while the run was being worked out. Try again',
  'hours still waiting for approval aren''t paid'
);
select lives_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday', :'invoices', :'lines'),
  'a finished week is run'
);
-- Numbers come from a sequence, so failed attempts leave gaps.
select results_eq(
  $$ select number ~ '^INV-[0-9]+$', subtotal_cents, gst_cents, total_cents, status from public.invoices $$,
  $$ values (true, 49000, 4900, 53900, 'issued') $$,
  'with a numbered invoice for each business'
);
select results_eq(
  $$ select kind::text, pay_cents, bill_cents from public.pay_run_lines order by bill_cents desc, pay_cents $$,
  $$ values ('hours', 15000, 22000), ('cancellation', 0, 13500), ('cancellation', 9000, 13500) $$,
  'and a line per booking'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, '44444444-4444-4444-4444-444444444444', %L, %L) $$,
    :'last_monday', :'invoices', :'lines'),
  '23505', 'That week has already been run', 'once'
);
select throws_ok(
  $$ update public.timesheets set break_minutes = 30
     where id = '71111111-0000-0000-0000-000000000001' $$,
  '23514', 'These hours have been paid. Contact us if something''s wrong',
  'paid hours can''t change'
);
select throws_ok(
  format($$ select public.save_pay_run(%L, null, %L, %L) $$, :'earlier_monday', :'invoices', :'lines'),
  '23505', 'That week has already been run', 'and in order'
);
select is_empty(
  format($$ select * from public.pay_run_candidates(now())
     where assignment_id in ('91111111-0000-0000-0000-000000000001',
       '93333333-0000-0000-0000-000000000003', '95555555-0000-0000-0000-000000000005') $$),
  'what''s paid isn''t owed again'
);

set local role authenticated;

-- The owner
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select business_id from public.invoices $$,
  $$ values ('b1111111-0000-0000-0000-000000000001'::uuid) $$,
  'owners see their invoices'
);
select results_eq(
  $$ select description, bill_cents from public.invoice_lines(
       (select id from public.invoices limit 1)) order by work_date $$,
  $$ values ('A, Tuesday', 22000), ('Late cancellation', 13500), ('Sent home', 13500) $$,
  'and what each line charges'
);
select is_empty($$ select * from public.pay_run_lines $$, 'but never what workers are paid');
select ok(public.can_read_invoice_folder('b1111111-0000-0000-0000-000000000001'), 'and can open their PDFs');
select throws_ok(
  $$ select public.mark_invoice_paid((select id from public.invoices limit 1), current_date) $$,
  '42501', 'Only our team marks invoices paid', 'only admins mark invoices paid'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty($$ select * from public.invoices $$, 'other businesses see none of it');
select ok(not public.can_read_invoice_folder('b1111111-0000-0000-0000-000000000001'), 'or the PDFs');

-- An admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.mark_invoice_paid(
       (select id from public.invoices where business_id = 'b1111111-0000-0000-0000-000000000001'),
       current_date, 'EFT 1234') $$,
  'an admin marks an invoice paid'
);
select throws_ok(
  $$ select public.mark_invoice_paid(
       (select id from public.invoices where business_id = 'b1111111-0000-0000-0000-000000000001'),
       current_date) $$,
  '23514', 'That invoice is already paid', 'once'
);
select lives_ok(
  $$ select public.mark_invoice_unpaid(
       (select id from public.invoices where business_id = 'b1111111-0000-0000-0000-000000000001')) $$,
  'and can take it back'
);
select results_eq(
  $$ select status, paid_on, payment_reference from public.invoices $$,
  $$ values ('issued', null::date, null::text) $$,
  'which leaves it unpaid'
);

select finish();
rollback;
