-- Delete my account (owner, 14/11/2026): a worker or business user closes
-- their own account, but not while shifts are booked. What the law doesn't
-- need goes (photo, phones, availability, "about me"); bookings, hours and
-- the business's records stay, archived. The last owner closing their
-- account closes the business for its whole team.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e3511111-0000-0000-0000-000000000001', 'pgtap_close_cleaner', 'PGTAP close cleaner');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('35111111-1111-1111-1111-111111111111', 'booked@close.pgtap.test', now(), '{}'),
  ('35222222-2222-2222-2222-222222222222', 'leaving@close.pgtap.test', now(), '{}'),
  ('35333333-3333-3333-3333-333333333333', 'owner.one@close.pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('35444444-4444-4444-4444-444444444444', 'supervisor.one@close.pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('35555555-5555-5555-5555-555555555555', 'owner.two@close.pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('35666666-6666-6666-6666-666666666666', 'manager.two@close.pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('35777777-7777-7777-7777-777777777777', 'admin@close.pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '35777777-7777-7777-7777-777777777777';

select id as booked from public.workers where profile_id = '35111111-1111-1111-1111-111111111111' \gset
select id as leaving from public.workers where profile_id = '35222222-2222-2222-2222-222222222222' \gset
update public.workers set status = 'active' where id in (:'booked', :'leaving');
update public.workers
set photo_path = :'leaving' || '/face.jpg', photo_status = 'verified', bio = 'Hard worker',
    urgent_opt_in = true, available_now_until = now() + interval '2 hours'
where id = :'leaving';
insert into public.availability_weekly (worker_id, weekday, start_time, end_time)
values (:'leaving', 1, '07:00', '17:00');
insert into public.availability_blocks (worker_id, date) values (:'leaving', current_date + 3);
insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
values ('35222222-2222-2222-2222-222222222222', 'https://push.example.test/leaving', 'key', 'auth');

insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b3511111-0000-0000-0000-000000000001', '35111111111', 'PGTAP CLOSE ONE PTY LTD', 'active', now(),
   'approved', true, '35333333-3333-3333-3333-333333333333'),
  ('b3522222-0000-0000-0000-000000000002', '35222222222', 'PGTAP CLOSE TWO PTY LTD', 'active', now(),
   'approved', true, '35555555-5555-5555-5555-555555555555');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b3511111-0000-0000-0000-000000000001', '35333333-3333-3333-3333-333333333333', 'owner', now()),
  ('b3511111-0000-0000-0000-000000000001', '35444444-4444-4444-4444-444444444444', 'supervisor', now()),
  ('b3522222-0000-0000-0000-000000000002', '35555555-5555-5555-5555-555555555555', 'owner', now()),
  ('b3522222-0000-0000-0000-000000000002', '35666666-6666-6666-6666-666666666666', 'manager', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d3511111-0000-0000-0000-000000000001', 'b3511111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00),
  ('d3522222-0000-0000-0000-000000000002', 'b3522222-0000-0000-0000-000000000002', 'Yard',
   '2 Test St', 'Granville', 'NSW', '2142', -33.83, 151.01);

-- Business one has work coming up: a shift the first worker is booked on,
-- and an open shift the second worker applied for. Business two's only
-- shift was worked last week, by the second worker.
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f3511111-0000-0000-0000-000000000001', 'b3511111-0000-0000-0000-000000000001',
   'd3511111-0000-0000-0000-000000000001', 'e3511111-0000-0000-0000-000000000001', 'posted', now(), true),
  ('f3522222-0000-0000-0000-000000000002', 'b3522222-0000-0000-0000-000000000002',
   'd3522222-0000-0000-0000-000000000002', 'e3511111-0000-0000-0000-000000000001', 'posted', now(), true);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a3511111-0000-0000-0000-000000000001', 'f3511111-0000-0000-0000-000000000001',
   now() + interval '2 days', now() + interval '2 days 4 hours', 1, 'filled'),
  ('a3522222-0000-0000-0000-000000000002', 'f3511111-0000-0000-0000-000000000001',
   now() + interval '3 days', now() + interval '3 days 4 hours', 1, 'open'),
  ('a3533333-0000-0000-0000-000000000003', 'f3522222-0000-0000-0000-000000000002',
   now() - interval '7 days', now() - interval '7 days' + interval '4 hours', 1, 'filled');
insert into public.assignments (shift_id, worker_id) values
  ('a3511111-0000-0000-0000-000000000001', :'booked');
insert into public.assignments (shift_id, worker_id, status) values
  ('a3533333-0000-0000-0000-000000000003', :'leaving', 'completed');
insert into public.applications (shift_id, worker_id) values
  ('a3522222-0000-0000-0000-000000000002', :'leaving');

-- A worker with a shift booked cancels it first.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "35111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.close_my_account() $$,
  'P0001', 'shifts_booked', 'a worker with a shift booked can''t close their account yet'
);

-- A worker with nothing booked closes theirs.
select set_config('request.jwt.claims', '{"sub": "35222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  public.close_my_account() ->> 'worker_id',
  :'leaving',
  'a worker with nothing booked closes their account'
);
select throws_ok(
  $$ select public.close_my_account() $$,
  '42501', null, 'and it can''t be closed twice'
);
reset role;

select is(
  (select status::text from public.applications where worker_id = :'leaving'),
  'withdrawn',
  'their applications are withdrawn'
);
select is(
  (select count(*)::int from public.availability_weekly where worker_id = :'leaving')
    + (select count(*)::int from public.availability_blocks where worker_id = :'leaving'),
  0,
  'their availability is gone'
);
select is(
  (select count(*)::int from public.push_subscriptions
   where profile_id = '35222222-2222-2222-2222-222222222222'),
  0,
  'and their phones'
);
select results_eq(
  $$ select photo_path, bio, urgent_opt_in, available_now_until, status::text, archived_at is not null
     from public.workers where profile_id = '35222222-2222-2222-2222-222222222222' $$,
  $$ values (null::text, null::text, false, null::timestamptz, 'offboarded', true) $$,
  'their photo and "about me" are removed, and they''re offboarded and archived'
);
select ok(
  (select closed_at is not null and archived_at is not null from public.profiles
   where id = '35222222-2222-2222-2222-222222222222'),
  'their profile records when they closed it'
);
select is(
  (select status::text from public.assignments where worker_id = :'leaving'),
  'completed',
  'the shift they worked is kept'
);

-- Business one has work coming up, so its only owner cancels it first; its
-- supervisor can still leave.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "35333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.close_my_account() $$,
  'P0001', 'shifts_booked', 'the only owner of a business with work coming up cancels it first'
);
select set_config('request.jwt.claims', '{"sub": "35444444-4444-4444-4444-444444444444", "role": "authenticated"}', true);
select is(
  public.close_my_account() -> 'closed_businesses',
  '[]'::jsonb,
  'a supervisor closes their account without closing the business'
);
reset role;
select ok(
  (select archived_at is null from public.businesses where id = 'b3511111-0000-0000-0000-000000000001')
    and (select archived_at is null from public.business_users
         where profile_id = '35333333-3333-3333-3333-333333333333'),
  'the business and its owner carry on'
);

-- Business two: its manager leaves, then its only owner closes it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "35666666-6666-6666-6666-666666666666", "role": "authenticated"}', true);
select is(
  public.close_my_account() -> 'closed_businesses',
  '[]'::jsonb,
  'a manager closes their account without closing the business'
);
select set_config('request.jwt.claims', '{"sub": "35555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is(
  public.close_my_account() -> 'closed_businesses',
  '["b3522222-0000-0000-0000-000000000002"]'::jsonb,
  'the only owner closing their account closes the business'
);
reset role;
select is(
  (select count(*)::int from public.business_users
   where business_id = 'b3522222-0000-0000-0000-000000000002' and archived_at is null),
  0,
  'for its whole team'
);
select ok(
  (select archived_at is not null from public.businesses where id = 'b3522222-0000-0000-0000-000000000002')
    and exists (select 1 from public.jobs where business_id = 'b3522222-0000-0000-0000-000000000002'),
  'the business is archived, and its jobs are kept'
);

-- Our team's accounts aren't closed this way, and visitors can't call it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "35777777-7777-7777-7777-777777777777", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.close_my_account() $$,
  '42501', null, 'admins can''t close their account here'
);
reset role;
set local role anon;
select throws_ok(
  $$ select public.close_my_account() $$,
  '42501', null, 'visitors who aren''t signed in can''t call it'
);

reset role;
select * from finish();
rollback;
