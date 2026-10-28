-- Timesheets: made at clock-out (or from the roster when there's no
-- clock-out), approved, changed, entered or queried by the business, queried
-- by the worker once approved, settled by admins, and approved automatically
-- when nobody acts in time. Each side sees only its own.
begin;
create extension if not exists pgtap with schema extensions;

select plan(42);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');
insert into public.settings (key, value) values ('auto_approve_hours', '48')
on conflict (key) do update set value = excluded.value;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', now(), '{}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('63333333-3333-3333-3333-333333333333', 'supervisor@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

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
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true);
-- S1 (A) and S2 (B): six to two hours ago. S3 (A): five hours ago to an hour
-- and a half ago. S4 (B): on now, finishing in an hour. S5 (A): started an
-- hour ago.
insert into public.shifts (id, job_id, starts_at, ends_at, break_minutes, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '6 hours', now() - interval '2 hours', 30, 1, 'filled'),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '6 hours', now() - interval '2 hours', 30, 1, 'filled'),
  ('a3333333-0000-0000-0000-000000000003', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '5 hours', now() - interval '90 minutes', 0, 1, 'filled'),
  ('a4444444-0000-0000-0000-000000000004', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '3 hours', now() + interval '1 hour', 0, 1, 'filled'),
  ('a5555555-0000-0000-0000-000000000005', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 hour', now() + interval '3 hours', 0, 1, 'filled');
insert into public.assignments (id, shift_id, worker_id) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a'),
  ('92222222-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000002', :'worker_b'),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_a'),
  ('94444444-0000-0000-0000-000000000004', 'a4444444-0000-0000-0000-000000000004', :'worker_b'),
  ('95555555-0000-0000-0000-000000000005', 'a5555555-0000-0000-0000-000000000005', :'worker_a');

-- A clocked in ten minutes late and out five minutes early; B clocked in
-- fifteen minutes early and never out; nobody clocked in for S3; B
-- finished S4 early; A clocked in to S5 from somewhere else.
insert into public.attendance_events (assignment_id, kind, occurred_at, inside_geofence, reason) values
  ('91111111-0000-0000-0000-000000000001', 'clock_in', now() - interval '5 hours 50 minutes', true, null),
  ('91111111-0000-0000-0000-000000000001', 'clock_out', now() - interval '2 hours 5 minutes', true, null),
  ('92222222-0000-0000-0000-000000000002', 'clock_in', now() - interval '6 hours 15 minutes', true, null),
  ('94444444-0000-0000-0000-000000000004', 'clock_in', now() - interval '3 hours', true, null),
  ('94444444-0000-0000-0000-000000000004', 'clock_out', now() - interval '10 minutes', true, null),
  ('95555555-0000-0000-0000-000000000005', 'clock_in', now() - interval '1 hour', false, 'At the other site');

select results_eq(
  $$ select status::text, recorded_start, start_at, recorded_finish, finish_at, break_minutes::integer
     from public.timesheets where assignment_id = '91111111-0000-0000-0000-000000000001' $$,
  $$ values ('submitted', now() - interval '5 hours 50 minutes', now() - interval '5 hours 50 minutes',
       now() - interval '2 hours 5 minutes', now() - interval '2 hours 5 minutes', 30) $$,
  'clocking out makes a timesheet from the clock-in to the clock-out, with the rostered break'
);
select is(
  (select approve_by from public.timesheets where assignment_id = '91111111-0000-0000-0000-000000000001'),
  now() + interval '48 hours',
  'for the business to approve within the window'
);
select is(
  (select count(*)::integer from public.record_missing_timesheets()), 1,
  'an hour after the shift, a clock-in with no clock-out gets a timesheet; no clock-in gets none'
);
select results_eq(
  $$ select recorded_start, start_at, recorded_finish, finish_at
     from public.timesheets where assignment_id = '92222222-0000-0000-0000-000000000002' $$,
  $$ values (now() - interval '6 hours 15 minutes', now() - interval '6 hours',
       null::timestamptz, now() - interval '2 hours') $$,
  'paid from the rostered start despite clocking in early, to the rostered finish'
);
insert into public.attendance_events (assignment_id, kind, occurred_at, inside_geofence)
values ('92222222-0000-0000-0000-000000000002', 'clock_out', now() - interval '1 hour 40 minutes', true);
select results_eq(
  $$ select recorded_finish, finish_at
     from public.timesheets where assignment_id = '92222222-0000-0000-0000-000000000002' $$,
  $$ values (now() - interval '1 hour 40 minutes', now() - interval '1 hour 40 minutes') $$,
  'a clock-out arriving later fills it in'
);
select throws_ok(
  $$ insert into public.attendance_events (assignment_id, kind, occurred_at)
     values ('92222222-0000-0000-0000-000000000002', 'clock_out', now()) $$,
  '23514', 'The timesheet for this shift is already in', 'but only once'
);
select throws_ok(
  $$ insert into public.attendance_events (assignment_id, kind, occurred_at)
     values ('91111111-0000-0000-0000-000000000001', 'arrival_confirmed', now()) $$,
  '23514', 'The timesheet for this shift is already in', 'attendance closes once the hours are in'
);

select id as t1 from public.timesheets where assignment_id = '91111111-0000-0000-0000-000000000001' \gset
select id as t2 from public.timesheets where assignment_id = '92222222-0000-0000-0000-000000000002' \gset
select id as t4 from public.timesheets where assignment_id = '94444444-0000-0000-0000-000000000004' \gset
insert into public.timesheet_costs (timesheet_id, start_at, finish_at, break_minutes, minutes_by_type,
  cost, paid_minutes, pay_cents, on_cost_cents, bill_cents, margin_cents)
select id, start_at, finish_at, break_minutes, '{}', '{}', 170, 12345, 2000, 20000, 5655
from public.timesheets where id = :'t4';

set local role authenticated;

-- Worker A
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select timesheet_id, status::text from public.my_timesheets() $$,
  format($$ values (%L::uuid, 'submitted') $$, :'t1'),
  'a worker sees their own timesheets'
);
select is((select count(*)::integer from public.timesheets), 1, 'and no one else''s');
select is_empty($$ select * from public.timesheet_costs $$, 'costs are for admins');
select lives_ok(
  format($$ select public.note_timesheet(%L, 'Stayed back to finish level 3') $$, :'t1'),
  'a worker adds a note for the business'
);
select throws_ok(
  format($$ select public.dispute_timesheet(%L, 'Wrong') $$, :'t1'),
  '23514', 'The business hasn''t looked at these hours yet. Add a note for them instead',
  'but can''t query hours the business hasn''t seen'
);
select is_empty(
  format($$ select * from public.approve_timesheets(array[%L::uuid]) $$, :'t1'),
  'or approve their own'
);

-- The supervisor
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select results_eq(
  $$ select assignment_id, timesheet_id is not null from public.business_timesheets()
     order by assignment_id $$,
  $$ values ('91111111-0000-0000-0000-000000000001'::uuid, true),
            ('92222222-0000-0000-0000-000000000002'::uuid, true),
            ('93333333-0000-0000-0000-000000000003'::uuid, false),
            ('94444444-0000-0000-0000-000000000004'::uuid, true),
            ('95555555-0000-0000-0000-000000000005'::uuid, false) $$,
  'the business sees every booking that has started, with its hours if they''re in'
);
select is(
  (select bill_cents from public.business_timesheets() where timesheet_id = :'t4'), null,
  'no charge before approval'
);
select results_eq(
  format($$ select * from public.approve_timesheets(array[%L::uuid]) $$, :'t1'),
  format($$ values (%L::uuid) $$, :'t1'),
  'a supervisor approves hours'
);
select throws_ok(
  format($$ select public.adjust_timesheet(%L, now() - interval '6 hours', now() - interval '3 hours', 30, ' ') $$, :'t2'),
  '23514', 'Say what changed, for the worker', 'changing hours needs a note for the worker'
);
select throws_ok(
  format($$ select public.adjust_timesheet(%L, now() - interval '3 hours', now() - interval '4 hours', 0, 'Oops') $$, :'t2'),
  '23514', 'The finish must be after the start', 'and sensible times'
);
select lives_ok(
  format($$ select public.adjust_timesheet(%L, now() - interval '6 hours', now() - interval '2 hours 30 minutes',
    30, 'Left at half past') $$, :'t2'),
  'a supervisor changes the hours'
);
select results_eq(
  format($$ select status::text, finish_at, business_note from public.timesheets where id = %L $$, :'t2'),
  $$ values ('adjusted', now() - interval '2 hours 30 minutes', 'Left at half past') $$,
  'which approves them as changed'
);
select throws_ok(
  format($$ select public.adjust_timesheet(%L, now() - interval '6 hours', now() - interval '3 hours', 30, 'Again') $$, :'t1'),
  '23514', 'This timesheet has already been dealt with', 'approved hours stay as they are'
);
select lives_ok(
  $$ select public.add_timesheet('93333333-0000-0000-0000-000000000003', now() - interval '5 hours',
       now() - interval '90 minutes', 0, 'Forgot to clock in') $$,
  'the business enters hours for someone who didn''t clock in'
);
select throws_ok(
  $$ select public.add_timesheet('93333333-0000-0000-0000-000000000003', now() - interval '5 hours',
       now() - interval '90 minutes', 0) $$,
  '23514', 'The timesheet for this shift is already in', 'once'
);
select throws_ok(
  $$ select public.add_timesheet('95555555-0000-0000-0000-000000000005', now() - interval '1 hour',
       now() + interval '2 hours', 0) $$,
  '23514', 'The finish can''t be in the future', 'not for hours still to come'
);
select throws_ok(
  $$ select * from public.report_no_show('91111111-0000-0000-0000-000000000001') $$,
  '23514', 'They were at work. If something''s wrong, query their hours instead',
  'someone who clocked in at the site isn''t a no-show'
);
select lives_ok(
  $$ select * from public.report_no_show('95555555-0000-0000-0000-000000000005') $$,
  'but someone who clocked in from somewhere else can be'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty(
  format($$ select * from public.approve_timesheets(array[%L::uuid]) $$, :'t4'),
  'other businesses can''t approve'
);
select is_empty($$ select * from public.timesheets $$, 'or see timesheets');

-- Worker A queries the approved hours
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  format($$ select public.dispute_timesheet(%L, 'I stayed until 4 to finish level 3') $$, :'t1'),
  'a worker queries approved hours'
);
select throws_ok(
  format($$ select public.dispute_timesheet(%L, 'Again') $$, :'t1'),
  '23514', 'These hours can''t be queried again. Contact us if something''s wrong', 'once'
);

-- Worker B queries the changed hours
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select lives_ok(
  format($$ select public.dispute_timesheet(%L, 'I didn''t leave early') $$, :'t2'),
  'and changed ones'
);
select is(
  (select pay_cents from public.my_timesheets() where timesheet_id = :'t4'), null,
  'pay shows once the hours are approved'
);

-- The supervisor adds their side, but can't settle it
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select lives_ok(
  format($$ select public.note_timesheet(%L, 'Our gate log says 1:30') $$, :'t1'),
  'the business adds its side to a query'
);
select throws_ok(
  format($$ select public.resolve_timesheet(%L, true, 'Fine', now() - interval '6 hours', now() - interval '2 hours', 30) $$, :'t1'),
  '42501', 'Only our team settles queries', 'only admins settle queries'
);

-- An admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  format($$ select public.resolve_timesheet(%L, true, 'Paid to 3:30, as the supervisor agreed',
    now() - interval '5 hours 50 minutes', now() - interval '2 hours 30 minutes', 30) $$, :'t1'),
  'an admin settles a query with the hours to pay'
);
select lives_ok(
  format($$ select public.resolve_timesheet(%L, false, 'The site was closed that day') $$, :'t2'),
  'or finds the hours weren''t worked'
);
select results_eq(
  $$ select assignment_id, status::text from public.timesheets
     where assignment_id in ('91111111-0000-0000-0000-000000000001', '92222222-0000-0000-0000-000000000002')
     order by assignment_id $$,
  $$ values ('91111111-0000-0000-0000-000000000001'::uuid, 'approved'),
            ('92222222-0000-0000-0000-000000000002'::uuid, 'rejected') $$,
  'paid as decided, or not at all'
);
select results_eq(
  $$ select status from public.admin_flags
     where kind = 'timesheet_dispute'
       and assignment_id in ('91111111-0000-0000-0000-000000000001', '92222222-0000-0000-0000-000000000002') $$,
  $$ values ('resolved'), ('resolved') $$,
  'and the queries are closed'
);

-- Worker A can't reopen it
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  format($$ select public.dispute_timesheet(%L, 'Still wrong') $$, :'t1'),
  '23514', 'These hours can''t be queried again. Contact us if something''s wrong',
  'settled hours can''t be queried again'
);

reset role;
update public.timesheets set approve_by = now() - interval '1 minute' where id = :'t4';
select results_eq(
  $$ select timesheet_id from public.auto_approve_timesheets() $$,
  format($$ values (%L::uuid) $$, :'t4'),
  'hours nobody approved or queried in time approve themselves'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  (select pay_cents from public.my_timesheets() where timesheet_id = :'t4'), 12345,
  'then the worker sees their pay'
);
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select is(
  (select bill_cents from public.business_timesheets() where timesheet_id = :'t4'), 20000,
  'and the business its charge'
);

select finish();
rollback;
