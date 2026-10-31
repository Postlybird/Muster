-- Bookings: workers apply ("I'll choose") or accept ("First in"); only the
-- business's owners and managers pick; a shift never takes more workers
-- than it needs, and no one is booked on two shifts at once. The address
-- and contact details are shared only once someone is booked.
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');
insert into public.rate_cards (id, category_id, base_rate_cents, effective_from) values
  ('e9999999-0000-0000-0000-000000000009', 'e1111111-0000-0000-0000-000000000001', 2650, '2026-01-01');

insert into auth.users (id, email, phone, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', '61400000001', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', '61400000002', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', null, now(), '{"signup_role": "business_user"}'),
  ('63333333-3333-3333-3333-333333333333', 'supervisor@pgtap.test', null, now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', null, now(), '{"signup_role": "business_user"}');

select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset
update public.workers set status = 'active', legal_first_name = 'Alex', legal_last_name = 'Able'
where id = :'worker_a';
update public.workers set status = 'active', legal_first_name = 'Bree', legal_last_name = 'Baker'
where id = :'worker_b';

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
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng,
  report_to_name, report_to_phone) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Secret St', 'Parramatta', 'NSW', '2150', -33.81, 151.00, 'Sam Site', '+61400000099');
insert into public.business_user_sites (business_user_id, site_id)
values ('c3333333-0000-0000-0000-000000000003', 'd1111111-0000-0000-0000-000000000001');

-- Job 1 ("I'll choose"): two days, one worker each. Job 2 ("First in"): one
-- shift. Job 3 ("First in"): clashes with job 1's first day.
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards, fill_mode) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'pick'),
  ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto'),
  ('f3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true, 'auto');
insert into public.shifts (id, job_id, starts_at, ends_at, headcount) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '2 days', now() + interval '2 days 4 hours', 1),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '3 days', now() + interval '3 days 4 hours', 1),
  ('a3333333-0000-0000-0000-000000000003', 'f2222222-0000-0000-0000-000000000002',
   now() + interval '4 days', now() + interval '4 days 4 hours', 1),
  ('a4444444-0000-0000-0000-000000000004', 'f3333333-0000-0000-0000-000000000003',
   now() + interval '2 days 2 hours', now() + interval '2 days 6 hours', 1);
insert into public.shift_pay (shift_id, hourly_cents, estimate_cents, rate_card_id, cost_rules,
  bill_hourly_cents, estimate_bill_cents, estimate_margin_cents)
select s.id, 3313, 13252, 'e9999999-0000-0000-0000-000000000009', '{"pgtap": true}', 4703, 18812, 3400
from public.shifts s where s.job_id in ('f1111111-0000-0000-0000-000000000001',
  'f2222222-0000-0000-0000-000000000002', 'f3333333-0000-0000-0000-000000000003');
insert into public.shift_matches (shift_id, worker_id, eligible, visible_from)
select s.id, w.id, true, now() - interval '1 minute'
from public.shifts s cross join public.workers w
where s.job_id in ('f1111111-0000-0000-0000-000000000001', 'f2222222-0000-0000-0000-000000000002',
  'f3333333-0000-0000-0000-000000000003')
  and w.id in (:'worker_a', :'worker_b');

-- A face photo for each worker, and a photo of job 1.
insert into storage.objects (bucket_id, name) values
  ('worker-photos', :'worker_a' || '/face.jpg'),
  ('worker-photos', :'worker_b' || '/face.jpg'),
  ('job-photos', 'b1111111-0000-0000-0000-000000000001/job-1.jpg');
insert into public.job_photos (job_id, path) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001/job-1.jpg');

set local role authenticated;

-- Worker A applies for both days of job 1
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select result from public.apply_for_shifts(array['a1111111-0000-0000-0000-000000000001',
       'a2222222-0000-0000-0000-000000000002']::uuid[], ' Three years of flood work. ') $$,
  array['applied', 'applied'],
  'a worker applies for the days of a job the business picks for, with a note'
);

select results_eq(
  $$ select result from public.apply_for_shifts(array['a1111111-0000-0000-0000-000000000001']::uuid[]) $$,
  array['already_applied'],
  'applying twice changes nothing'
);

-- Their note: short, and no way to reach them outside the app
select throws_ok(
  $$ select public.set_application_note('f1111111-0000-0000-0000-000000000001', 'Call me on 0412 345 678') $$,
  '23514',
  null,
  'a note can''t hold a phone number'
);
select is(
  public.set_application_note('f1111111-0000-0000-0000-000000000001', 'Five years of flood work.'),
  2,
  'they can change their note on every day they applied for'
);
select throws_ok(
  $$ update public.workers set bio = 'Email me at alex@example.com'
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'nor can a bio hold an email address'
);
update public.workers set bio = 'White card, my own boots and a ute.'
where profile_id = '11111111-1111-1111-1111-111111111111';
select is(
  (select bio from public.workers where profile_id = '11111111-1111-1111-1111-111111111111'),
  'White card, my own boots and a ute.',
  'workers write their own bio'
);

select is_empty(
  $$ select * from public.accept_shifts(array['a1111111-0000-0000-0000-000000000001']::uuid[]) $$,
  'a worker can''t book themselves on a job the business picks for'
);

select is(
  (select array_agg(shift_id::text order by starts_at) from public.my_shift_offers()),
  array['a4444444-0000-0000-0000-000000000004', 'a3333333-0000-0000-0000-000000000003'],
  'shifts they''ve applied for leave their offers'
);

select is(
  (select array_agg(application_status::text) from public.my_shifts()),
  array['applied', 'applied'],
  'and show under their shifts'
);
select is(
  (select array_agg(distinct state) from public.my_shifts()),
  array['NSW'],
  'with the state the work is in, for its time zone'
);

select is(
  (select row(booked, address_line1, report_to_name)::text
   from public.my_job('f1111111-0000-0000-0000-000000000001')),
  row(false, null::text, null::text)::text,
  'the address and contact stay hidden until they''re booked'
);

select throws_ok(
  $$ select public.book_worker('a3333333-0000-0000-0000-000000000003', '$$ || :'worker_a' || $$', false) $$,
  '42501',
  null,
  'workers can''t book directly'
);

select throws_ok(
  $$ select * from public.book_applicant('f1111111-0000-0000-0000-000000000001', '$$ || :'worker_a' || $$') $$,
  '42501',
  null,
  'or pick themselves'
);

-- Worker B applies for the first day
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select results_eq(
  $$ select result from public.apply_for_shifts(array['a1111111-0000-0000-0000-000000000001']::uuid[]) $$,
  array['applied'],
  'another worker applies'
);

-- The supervisor sees applicants but doesn't pick
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select is(
  (select count(*)::integer from public.job_applicants('f1111111-0000-0000-0000-000000000001')),
  2,
  'supervisors see the applicants at their sites'
);
select throws_ok(
  $$ select * from public.book_applicant('f1111111-0000-0000-0000-000000000001', '$$ || :'worker_a' || $$') $$,
  '42501',
  null,
  'but only owners and managers pick'
);

-- The owner picks worker A
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select row(display_name, array_length(shift_ids, 1))::text
   from public.job_applicants('f1111111-0000-0000-0000-000000000001') where worker_id = :'worker_a'),
  row('Alex A.', 2)::text,
  'applicants show a first name and initial, and the days they applied for'
);
select is(
  (select note from public.job_applicants('f1111111-0000-0000-0000-000000000001')
   where worker_id = :'worker_a'),
  'Five years of flood work.',
  'and their note'
);
select is(
  (select row(rating_count, shifts_here, favourite, level)::text
   from public.job_applicants('f1111111-0000-0000-0000-000000000001') where worker_id = :'worker_a'),
  row(0, 0, false, null::smallint)::text,
  'with how many ratings, their history with the business and their level (none set here)'
);
select results_eq(
  $$ select result from public.book_applicant('f1111111-0000-0000-0000-000000000001', '$$ || :'worker_a' || $$') $$,
  array['booked', 'booked'],
  'picking an applicant books them on every day they applied for'
);
select is(
  (select array_agg(mobile) from public.job_bookings('f1111111-0000-0000-0000-000000000001')),
  array['+61400000001', '+61400000001'],
  'the business gets the mobile number once they''re booked'
);
select is_empty($$ select * from public.assignment_rates $$, 'businesses never see the rates behind the bill');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'worker-photos'),
  2,
  'a business sees the photos of workers who applied to it'
);

-- Worker B was turned away from the full day
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  (select application_status::text from public.my_shifts()
   where shift_id = 'a1111111-0000-0000-0000-000000000001'),
  'declined',
  'other applicants hear the shift is filled'
);
select is(
  (select row(booked, address_line1)::text
   from public.my_job('f1111111-0000-0000-0000-000000000001')),
  row(false, null::text)::text,
  'and never see the address'
);
select is_empty(
  $$ select * from storage.objects where bucket_id = 'job-photos' $$,
  'or the job''s photos'
);

-- Worker A is booked
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select row(booked, address_line1, report_to_name, report_to_phone)::text
   from public.my_job('f1111111-0000-0000-0000-000000000001')),
  row(true, '1 Secret St', 'Sam Site', '+61400000099')::text,
  'a booked worker sees the address and who to report to'
);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'job-photos'),
  1,
  'and the job''s photos'
);
select is(
  (select array_agg(hourly_cents) from public.my_shifts() where assignment_status = 'confirmed'),
  array[3313, 3313],
  'with the pay they were booked at'
);
select results_eq(
  $$ select result from public.accept_shifts(array['a4444444-0000-0000-0000-000000000004']::uuid[]) $$,
  array['clash'],
  'no one is booked on two shifts at once'
);
select results_eq(
  $$ select result from public.accept_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[]) $$,
  array['booked'],
  'the first worker in is booked straight away'
);
select is_empty($$ select * from public.assignment_rates $$, 'workers never see the rates behind the bill');
select is(
  public.withdraw_applications(array['a1111111-0000-0000-0000-000000000001']::uuid[]),
  0,
  'a booking can''t be withdrawn like an application'
);

-- Worker B is too late
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select results_eq(
  $$ select result from public.accept_shifts(array['a3333333-0000-0000-0000-000000000003']::uuid[]) $$,
  array['full'],
  'a full shift takes no one else'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty(
  $$ select * from public.job_bookings('f1111111-0000-0000-0000-000000000001') $$,
  'other businesses see no one'
);
select is_empty(
  $$ select * from storage.objects where bucket_id = 'worker-photos' $$,
  'and no one''s photo'
);

reset role;
select is(
  (select count(*)::integer from public.assignment_rates r
   join public.assignments x on x.id = r.assignment_id
   where x.worker_id = :'worker_a' and r.pay_hourly_cents = 3313 and r.estimate_bill_cents = 18812
     and r.cost_rules = '{"pgtap": true}'),
  3,
  'each booking keeps the pay and bill it was made at'
);

select finish();
rollback;
