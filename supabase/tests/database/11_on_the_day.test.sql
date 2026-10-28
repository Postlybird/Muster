-- On the day: workers clock in and out of their own shifts, with a location
-- check (outside the radius needs a reason and flags admins); the business
-- sees attendance and confirms arrivals; possible no-shows are flagged once;
-- safety reports reach admins and stay private to the reporter.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');
insert into public.settings (key, value) values ('geofence_radius_m', '200'), ('no_show_flag_minutes', '30')
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
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true);
-- S1: worker A, started ten minutes ago. S2: worker B, started an hour ago
-- (they're there, but couldn't clock in). S3: worker A, later today.
-- S4: worker B, started 45 minutes ago, nothing heard.
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '10 minutes', now() + interval '4 hours', 1, 'filled'),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 hour', now() + interval '3 hours', 1, 'filled'),
  ('a3333333-0000-0000-0000-000000000003', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '5 hours', now() + interval '9 hours', 1, 'filled'),
  ('a4444444-0000-0000-0000-000000000004', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '45 minutes', now() + interval '3 hours', 1, 'filled');
insert into public.assignments (id, shift_id, worker_id) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a'),
  ('92222222-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000002', :'worker_b'),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_a'),
  ('94444444-0000-0000-0000-000000000004', 'a4444444-0000-0000-0000-000000000004', :'worker_b');

select is(public.distance_m(-33.81, 151.00, -33.81, 151.054), 4989, 'distances are in metres');

set local role authenticated;

-- Worker A
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select row(inside, distance_m)::text from public.clock(
     '91111111-0000-0000-0000-000000000001', 'clock_in', now(), -33.81, 151.00, 15, null, false)),
  row(true, 0)::text,
  'a worker clocks in at the site'
);
select throws_ok(
  $$ select * from public.clock('91111111-0000-0000-0000-000000000001', 'clock_in', now(),
       -33.81, 151.00, 15, null, false) $$,
  '23514', 'You''ve already clocked in', 'once'
);
select throws_ok(
  $$ select * from public.clock('93333333-0000-0000-0000-000000000003', 'clock_in', now(),
       -33.81, 151.00, 15, null, false) $$,
  '23514', 'It''s too early to clock in', 'not hours before the start'
);
select throws_ok(
  $$ select * from public.clock('91111111-0000-0000-0000-000000000001', 'clock_out', now(),
       -33.81, 151.054, 15, ' ', false) $$,
  '23514', 'Say why you''re not at the site', 'away from the site needs a reason'
);
select is(
  (select row(inside, distance_m)::text from public.clock(
     '91111111-0000-0000-0000-000000000001', 'clock_out', now(), -33.81, 151.054, 15,
     'Finished at the tip', false)),
  row(false, 4989)::text,
  'with one, it''s recorded'
);
select throws_ok(
  $$ select * from public.clock('92222222-0000-0000-0000-000000000002', 'clock_in', now(),
       -33.81, 151.00, 15, null, false) $$,
  '42501', null, 'workers only clock in to their own shifts'
);
select lives_ok(
  $$ select public.report_safety_issue('91111111-0000-0000-0000-000000000001',
       'Exposed wiring in the hallway', array[]::text[]) $$,
  'a worker reports a safety issue'
);
select throws_ok(
  $$ select public.report_safety_issue('91111111-0000-0000-0000-000000000001',
       'Another', array['someone-else/photo.jpg']) $$,
  '23514', null, 'with photos only from their own folder'
);
select is(
  (select count(*)::integer from public.safety_reports), 1, 'and sees their report'
);

-- Worker B sees none of it
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is_empty($$ select * from public.safety_reports $$, 'other workers don''t see it');
select is_empty(
  $$ select * from public.attendance_events
     where assignment_id = '91111111-0000-0000-0000-000000000001' $$,
  'or anyone else''s clock-ins'
);

-- The supervisor
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select is(
  (select count(*)::integer from public.attendance_events), 2, 'the business sees clock-ins and outs'
);
select lives_ok(
  $$ select public.confirm_arrival('92222222-0000-0000-0000-000000000002', now() - interval '55 minutes') $$,
  'a supervisor confirms an arrival'
);
select is_empty($$ select * from public.safety_reports $$, 'businesses don''t see safety reports');

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.confirm_arrival('94444444-0000-0000-0000-000000000004', now()) $$,
  '42501', null, 'other businesses can''t confirm arrivals'
);

reset role;
select results_eq(
  $$ select assignment_id from public.flag_possible_no_shows() $$,
  array['94444444-0000-0000-0000-000000000004'::uuid],
  'a booking with no clock-in 30 minutes in is flagged'
);
select is_empty($$ select * from public.flag_possible_no_shows() $$, 'only once');

select finish();
rollback;
