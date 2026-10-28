-- Cancellations and no-shows: workers cancel only their own bookings (late
-- ones are marked); only owners and managers cancel work (late ones are
-- charged); no-shows are reported once a shift starts, and enough of them
-- suspends the worker.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');
insert into public.settings (key, value) values
  ('worker_late_cancel_hours', '12'), ('business_late_cancel_hours', '12'),
  ('business_late_cancel_charge_hours', '3'), ('pay_worker_on_late_business_cancel', 'false'),
  ('no_show_suspend_count', '2'), ('no_show_window_days', '30')
on conflict (key) do update set value = excluded.value;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('63333333-3333-3333-3333-333333333333', 'supervisor@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', now(), '{"signup_role": "business_user"}');

select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset
update public.workers set status = 'active' where id in (:'worker_a', :'worker_b');

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'One', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111'),
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP TWO PTY LTD', null, 'active', now(),
   'approved', true, '65555555-5555-5555-5555-555555555555');
insert into public.business_users (id, business_id, profile_id, role, accepted_at) values
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('c3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001', '63333333-3333-3333-3333-333333333333', 'supervisor', now()),
  ('c5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.business_user_sites (business_user_id, site_id)
values ('c3333333-0000-0000-0000-000000000003', 'd1111111-0000-0000-0000-000000000001');

-- Job 1: two shifts worker A is booked on (in two days, and in six hours).
-- Job 2: one shift worker B is booked on, in five hours.
-- Job 3: shifts worker A was booked on that have started (one three days ago).
-- Job 4: a shift worker B worked that has just finished.
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true),
  ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true),
  ('f3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true),
  ('f4444444-0000-0000-0000-000000000004', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '2 days', now() + interval '2 days 4 hours', 1, 'filled'),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '6 hours', now() + interval '10 hours', 1, 'filled'),
  ('a3333333-0000-0000-0000-000000000003', 'f2222222-0000-0000-0000-000000000002',
   now() + interval '5 hours', now() + interval '9 hours', 1, 'filled'),
  ('a4444444-0000-0000-0000-000000000004', 'f3333333-0000-0000-0000-000000000003',
   now() - interval '1 hour', now() + interval '3 hours', 1, 'filled'),
  ('a5555555-0000-0000-0000-000000000005', 'f3333333-0000-0000-0000-000000000003',
   now() - interval '3 days', now() - interval '3 days' + interval '4 hours', 1, 'filled'),
  ('a6666666-0000-0000-0000-000000000006', 'f4444444-0000-0000-0000-000000000004',
   now() - interval '5 hours', now() - interval '1 minute', 1, 'filled');
insert into public.assignments (id, shift_id, worker_id) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a'),
  ('92222222-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000002', :'worker_a'),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_b'),
  ('94444444-0000-0000-0000-000000000004', 'a4444444-0000-0000-0000-000000000004', :'worker_a'),
  ('95555555-0000-0000-0000-000000000005', 'a5555555-0000-0000-0000-000000000005', :'worker_a'),
  ('96666666-0000-0000-0000-000000000006', 'a6666666-0000-0000-0000-000000000006', :'worker_b');

set local role authenticated;

-- Worker B can't cancel worker A's booking
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is_empty(
  $$ select * from public.cancel_my_bookings(array['91111111-0000-0000-0000-000000000001']::uuid[], 'Sick') $$,
  'workers can only cancel their own bookings'
);

-- Worker A cancels both shifts of job 1
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select late from public.cancel_my_bookings(array['91111111-0000-0000-0000-000000000001',
       '92222222-0000-0000-0000-000000000002']::uuid[], 'Sick') order by late $$,
  array[false, true],
  'cancelling inside the window counts as late; two days ahead doesn''t'
);
select is_empty(
  $$ select * from public.cancel_my_bookings(array['94444444-0000-0000-0000-000000000004']::uuid[], 'Sick') $$,
  'a shift that has started can''t be cancelled'
);
select is_empty($$ select * from public.admin_flags $$, 'workers can''t see admin flags');

-- The supervisor
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.cancel_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[], 'Rain') $$,
  '42501',
  null,
  'supervisors don''t cancel work'
);
select throws_ok(
  $$ select * from public.report_no_show('93333333-0000-0000-0000-000000000003') $$,
  '23514',
  'The shift hasn''t started yet',
  'a no-show can''t be reported before the start'
);
select is(
  (select row(worker_id, suspended)::text from public.report_no_show('94444444-0000-0000-0000-000000000004')),
  row(:'worker_a'::uuid, false)::text,
  'a supervisor reports a no-show at their site'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.cancel_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[], 'Rain') $$,
  '42501',
  null,
  'other businesses can''t cancel it'
);
select throws_ok(
  $$ select * from public.report_no_show('95555555-0000-0000-0000-000000000005') $$,
  '42501',
  null,
  'or report no-shows'
);

-- The owner
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.cancel_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[], ' ') $$,
  '23514',
  null,
  'cancelling needs a reason'
);
select is(
  (select row(worker_id, late)::text from public.cancel_shifts(
     array['a3333333-0000-0000-0000-000000000003']::uuid[], 'Job fell through')),
  row(:'worker_b'::uuid, true)::text,
  'an owner cancels a shift, releasing whoever was booked'
);
select is(
  (select row(status, late_cancellation, cancellation_charge_hours, cancellation_pay_hours)::text
   from public.assignments where id = '93333333-0000-0000-0000-000000000003'),
  row('cancelled_by_business'::public.assignment_status, true, 3.00::numeric(4, 2), null::numeric)::text,
  'a late cancellation is charged per the settings'
);
select is(
  (select status::text from public.jobs where id = 'f2222222-0000-0000-0000-000000000002'),
  'cancelled',
  'a job with nothing left is cancelled too'
);
select is(
  (select row(worker_id, suspended)::text from public.report_no_show('95555555-0000-0000-0000-000000000005')),
  row(:'worker_a'::uuid, true)::text,
  'a second no-show within the window suspends the worker'
);

reset role;
select is(
  (select array_agg(status::text order by starts_at) from public.shifts
   where job_id = 'f1111111-0000-0000-0000-000000000001'),
  array['open', 'open'],
  'the shifts reopen for other workers'
);
select is(
  (select status::text from public.workers where id = :'worker_a'),
  'suspended',
  'their account is on hold'
);
select is(
  (select array_agg(kind order by kind) from public.admin_flags where worker_id = :'worker_a'),
  array['no_show', 'no_show', 'suspension'],
  'admins are flagged about each no-show and the suspension'
);
select is(
  (select row(status, cancelled_at is not null)::text from public.assignments
   where id = '92222222-0000-0000-0000-000000000002'),
  row('cancelled_by_worker'::public.assignment_status, true)::text,
  'the worker''s cancellation is recorded'
);
select results_eq(
  $$ select worker_id from public.finish_shifts() $$,
  array[:'worker_b'::uuid],
  'finished shifts are closed off, naming who worked them'
);
select is(
  (select row(s.status, j.status)::text from public.shifts s join public.jobs j on j.id = s.job_id
   where s.id = 'a6666666-0000-0000-0000-000000000006'),
  row('completed'::public.shift_status, 'completed'::public.job_status)::text,
  'and so is a job with nothing left to do'
);

select finish();
rollback;
