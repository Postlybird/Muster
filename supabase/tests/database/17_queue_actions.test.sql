-- Acting on the admin queues: taking a worker off a booking, and settling
-- matters with what was decided (possible no-shows, no-shows, holds,
-- bookings at risk, safety reports). Possible no-shows settle themselves
-- once the worker turns up or a no-show is reported.
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1711111-0000-0000-0000-000000000001', 'pgtap_queue_cleaner', 'PGTAP queue cleaner');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('17111111-1111-1111-1111-111111111111', 'queue.a@pgtap.test', now(), '{}'),
  ('17222222-2222-2222-2222-222222222222', 'queue.b@pgtap.test', now(), '{}'),
  ('17333333-3333-3333-3333-333333333333', 'queue.c@pgtap.test', now(), '{}'),
  ('17444444-4444-4444-4444-444444444444', 'queue.admin@pgtap.test', now(), '{}'),
  ('17555555-5555-5555-5555-555555555555', 'queue.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = '17444444-4444-4444-4444-444444444444';
select id as worker_a from public.workers where profile_id = '17111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '17222222-2222-2222-2222-222222222222' \gset
select id as worker_c from public.workers where profile_id = '17333333-3333-3333-3333-333333333333' \gset
update public.workers set status = 'active' where id in (:'worker_a', :'worker_b');
update public.workers set status = 'suspended', status_reason = 'Two no-shows' where id = :'worker_c';

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1711111-0000-0000-0000-000000000001', '17111111111', 'PGTAP QUEUE PTY LTD', 'Queue Co', 'active', now(),
   'approved', true, '17555555-5555-5555-5555-555555555555');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b1711111-0000-0000-0000-000000000001', '17555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1711111-0000-0000-0000-000000000001', 'b1711111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1711111-0000-0000-0000-000000000001', 'b1711111-0000-0000-0000-000000000001',
   'd1711111-0000-0000-0000-000000000001', 'e1711111-0000-0000-0000-000000000001', 'posted', now(), true);

-- S1: tomorrow, A booked (at risk). S2: started an hour ago, B booked, no
-- clock-in. S3: started, C booked. S4: started, A booked (reported a
-- no-show). S5: started, B booked (will clock in).
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1711111-0000-0000-0000-000000000001', 'f1711111-0000-0000-0000-000000000001',
   now() + interval '1 day', now() + interval '1 day 4 hours', 1, 'filled'),
  ('a1722222-0000-0000-0000-000000000002', 'f1711111-0000-0000-0000-000000000001',
   now() - interval '1 hour', now() + interval '3 hours', 1, 'filled'),
  ('a1733333-0000-0000-0000-000000000003', 'f1711111-0000-0000-0000-000000000001',
   now() - interval '2 hours', now() + interval '2 hours', 1, 'filled'),
  ('a1744444-0000-0000-0000-000000000004', 'f1711111-0000-0000-0000-000000000001',
   now() - interval '3 hours', now() + interval '1 hour', 1, 'filled'),
  ('a1755555-0000-0000-0000-000000000005', 'f1711111-0000-0000-0000-000000000001',
   now() - interval '40 minutes', now() + interval '3 hours', 1, 'filled');
insert into public.assignments (id, shift_id, worker_id, status) values
  ('91711111-0000-0000-0000-000000000001', 'a1711111-0000-0000-0000-000000000001', :'worker_a', 'confirmed'),
  ('91722222-0000-0000-0000-000000000002', 'a1722222-0000-0000-0000-000000000002', :'worker_b', 'confirmed'),
  ('91733333-0000-0000-0000-000000000003', 'a1733333-0000-0000-0000-000000000003', :'worker_c', 'confirmed'),
  ('91744444-0000-0000-0000-000000000004', 'a1744444-0000-0000-0000-000000000004', :'worker_a', 'no_show'),
  ('91755555-0000-0000-0000-000000000005', 'a1755555-0000-0000-0000-000000000005', :'worker_b', 'confirmed');
insert into public.safety_reports (assignment_id, worker_id, description) values
  ('91722222-0000-0000-0000-000000000002', :'worker_b', 'Live wires near the sink');
insert into public.admin_flags (id, kind, worker_id, business_id, assignment_id, summary) values
  ('c1711111-0000-0000-0000-000000000001', 'booking_at_risk', :'worker_a', 'b1711111-0000-0000-0000-000000000001',
   '91711111-0000-0000-0000-000000000001', 'At risk'),
  ('c1722222-0000-0000-0000-000000000002', 'possible_no_show', :'worker_b', 'b1711111-0000-0000-0000-000000000001',
   '91722222-0000-0000-0000-000000000002', 'No clock-in yet'),
  ('c1733333-0000-0000-0000-000000000003', 'possible_no_show', :'worker_c', 'b1711111-0000-0000-0000-000000000001',
   '91733333-0000-0000-0000-000000000003', 'No clock-in yet'),
  ('c1744444-0000-0000-0000-000000000004', 'no_show', :'worker_a', 'b1711111-0000-0000-0000-000000000001',
   '91744444-0000-0000-0000-000000000004', 'No-show reported'),
  ('c1755555-0000-0000-0000-000000000005', 'suspension', :'worker_c', null, null, 'Suspended'),
  ('c1766666-0000-0000-0000-000000000006', 'suspension', :'worker_c', null, null, 'Suspended again'),
  ('c1777777-0000-0000-0000-000000000007', 'safety', :'worker_b', 'b1711111-0000-0000-0000-000000000001',
   '91722222-0000-0000-0000-000000000002', 'Safety issue'),
  ('c1788888-0000-0000-0000-000000000008', 'possible_no_show', :'worker_b', 'b1711111-0000-0000-0000-000000000001',
   '91755555-0000-0000-0000-000000000005', 'No clock-in yet'),
  ('c1799999-0000-0000-0000-000000000009', 'timesheet_dispute', :'worker_b', 'b1711111-0000-0000-0000-000000000001',
   '91722222-0000-0000-0000-000000000002', 'Hours queried');

-- Possible no-shows settle themselves: a clock-in, and a no-show report.
insert into public.attendance_events (assignment_id, kind, occurred_at, inside_geofence) values
  ('91755555-0000-0000-0000-000000000005', 'clock_in', now() - interval '30 minutes', true);
select alike(
  (select resolution from public.admin_flags where id = 'c1788888-0000-0000-0000-000000000008'),
  'Clocked in at %',
  'a clock-in settles a possible no-show'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "17111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.admin_cancel_booking('91711111-0000-0000-0000-000000000001', 'Ticket expired') $$,
  '42501', null, 'only admins take workers off bookings'
);
select throws_ok(
  $$ select * from public.settle_admin_flag('c1744444-0000-0000-0000-000000000004', 'keep', 'Fine') $$,
  '42501', null, 'only admins settle matters'
);

select set_config('request.jwt.claims', '{"sub": "17444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

-- Checks before anything changes.
select throws_ok(
  $$ select * from public.settle_admin_flag('c1744444-0000-0000-0000-000000000004', 'keep', '  ') $$,
  '23514', 'Say what was decided', 'a decision needs a note'
);
select throws_ok(
  $$ select * from public.settle_admin_flag('c1799999-0000-0000-0000-000000000009', 'resolve', 'Paid') $$,
  '23514', 'Settle hours queries from the timesheet', 'hours queries are settled from the timesheet'
);
select throws_ok(
  $$ select * from public.settle_admin_flag('c1744444-0000-0000-0000-000000000004', 'lift', 'Sure') $$,
  '23514', 'That can''t be done with this matter', 'outcomes must suit the matter'
);
select throws_ok(
  $$ select * from public.admin_cancel_booking('91722222-0000-0000-0000-000000000002', 'Too late') $$,
  '23514', 'The shift has already started', 'started shifts keep their bookings'
);

-- A booking at risk: taken off the shift, which reopens.
select results_eq(
  $$ select worker_id, shift_id, job_id, suspended from public.settle_admin_flag(
       'c1711111-0000-0000-0000-000000000001', 'remove', 'Their ticket expires first') $$,
  format($$ values (%L::uuid, 'a1711111-0000-0000-0000-000000000001'::uuid,
    'f1711111-0000-0000-0000-000000000001'::uuid, false) $$, :'worker_a'),
  'settling a booking at risk says whose it was'
);
select is(
  (select status::text from public.assignments where id = '91711111-0000-0000-0000-000000000001'),
  'cancelled_by_admin', 'they''re taken off the shift'
);
select is(
  (select late_cancellation from public.assignments where id = '91711111-0000-0000-0000-000000000001'),
  false, 'with no penalty'
);
select is(
  (select status::text from public.shifts where id = 'a1711111-0000-0000-0000-000000000001'),
  'open', 'and the shift reopens'
);
select is(
  (select resolution from public.admin_flags where id = 'c1711111-0000-0000-0000-000000000001'),
  'Taken off the shift: Their ticket expires first', 'the matter records what was done'
);
select throws_ok(
  $$ select * from public.settle_admin_flag('c1711111-0000-0000-0000-000000000001', 'keep', 'Again') $$,
  '23514', 'That matter is already settled', 'a matter is settled once'
);

-- A possible no-show: they were there.
select lives_ok(
  $$ select * from public.settle_admin_flag('c1722222-0000-0000-0000-000000000002', 'arrived', 'Supervisor rang') $$,
  'an admin records that they arrived'
);
select is(
  (select occurred_at from public.attendance_events
   where assignment_id = '91722222-0000-0000-0000-000000000002' and kind = 'arrival_confirmed'),
  (select starts_at from public.shifts where id = 'a1722222-0000-0000-0000-000000000002'),
  'at the start time'
);
select is(
  (select resolution from public.admin_flags where id = 'c1722222-0000-0000-0000-000000000002'),
  'They were there: Supervisor rang', 'with the admin''s note'
);

-- A possible no-show: they didn't come.
select results_eq(
  $$ select suspended from public.settle_admin_flag('c1733333-0000-0000-0000-000000000003', 'no_show', 'No answer') $$,
  $$ values (false) $$,
  'an admin records a no-show'
);
select is(
  (select status::text from public.assignments where id = '91733333-0000-0000-0000-000000000003'),
  'no_show', 'the booking is a no-show'
);
select is(
  (select status from public.admin_flags where assignment_id = '91733333-0000-0000-0000-000000000003' and kind = 'no_show'),
  'resolved', 'which needs no more review'
);

-- A reported no-show, excused.
select lives_ok(
  $$ select * from public.settle_admin_flag('c1744444-0000-0000-0000-000000000004', 'excuse', 'In hospital') $$,
  'an admin excuses a no-show'
);
select is(
  (select status::text from public.assignments where id = '91744444-0000-0000-0000-000000000004'),
  'cancelled_by_admin', 'so it no longer counts'
);

-- A hold, lifted: every hold matter for them is settled.
select lives_ok(
  $$ select * from public.settle_admin_flag('c1755555-0000-0000-0000-000000000005', 'lift', 'Talked it through') $$,
  'an admin lifts a hold'
);
select is(
  (select status::text from public.workers where id = :'worker_c'),
  'active', 'the worker is active again'
);
select is(
  (select count(*) from public.admin_flags where worker_id = :'worker_c' and kind = 'suspension' and status = 'open'),
  0::bigint, 'and no hold matters are left open'
);

-- A safety report, settled with what was done.
select lives_ok(
  $$ select * from public.settle_admin_flag('c1777777-0000-0000-0000-000000000007', 'resolve', 'Electrician called') $$,
  'an admin settles a safety report'
);
select is(
  (select resolution from public.safety_reports where assignment_id = '91722222-0000-0000-0000-000000000002'),
  'Electrician called', 'the report records what was done'
);

select * from finish();
rollback;
