-- Ratings: once the hours are approved, the business rates the worker and
-- the worker rates the site, once each, with tags from the list. Each side
-- sees only the ratings it gave; averages land on the worker and the
-- business; admins see everything. Owners and managers see their workers.
begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');

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
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00),
  ('d2222222-0000-0000-0000-000000000002', 'b2222222-0000-0000-0000-000000000002', 'Yard',
   '2 Test St', 'Penrith', 'NSW', '2750', -33.75, 150.69);
insert into public.business_user_sites (business_user_id, site_id)
values ('c3333333-0000-0000-0000-000000000003', 'd1111111-0000-0000-0000-000000000001');
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'completed', now(), true),
  ('f2222222-0000-0000-0000-000000000002', 'b2222222-0000-0000-0000-000000000002',
   'd2222222-0000-0000-0000-000000000002', 'e1111111-0000-0000-0000-000000000001', 'completed', now(), true);
-- S1: worker A, approved. S2: worker B, waiting for the business. S3: worker
-- A for the other business, approved.
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 day', now() - interval '1 day' + interval '4 hours', 2, 'completed'),
  ('a3333333-0000-0000-0000-000000000003', 'f2222222-0000-0000-0000-000000000002',
   now() - interval '2 days', now() - interval '2 days' + interval '4 hours', 1, 'completed');
insert into public.applications (shift_id, worker_id, status) values
  ('a1111111-0000-0000-0000-000000000001', :'worker_a', 'booked'),
  ('a1111111-0000-0000-0000-000000000001', :'worker_b', 'booked'),
  ('a3333333-0000-0000-0000-000000000003', :'worker_a', 'booked');
insert into public.assignments (id, shift_id, worker_id) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a'),
  ('92222222-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', :'worker_b'),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_a');
insert into public.timesheets (assignment_id, worker_id, job_id, start_at, finish_at, status, approve_by) values
  ('91111111-0000-0000-0000-000000000001', :'worker_a', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 day', now() - interval '1 day' + interval '4 hours', 'approved', now()),
  ('92222222-0000-0000-0000-000000000002', :'worker_b', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 day', now() - interval '1 day' + interval '4 hours', 'submitted', now() + interval '1 day'),
  ('93333333-0000-0000-0000-000000000003', :'worker_a', 'f2222222-0000-0000-0000-000000000002',
   now() - interval '2 days', now() - interval '2 days' + interval '4 hours', 'auto_approved', now());

set local role authenticated;

-- Worker A rates the site
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.rate_site('91111111-0000-0000-0000-000000000001', 6) $$,
  '23514', 'Choose 1 to 5 stars', 'one to five stars'
);
select throws_ok(
  $$ select public.rate_site('91111111-0000-0000-0000-000000000001', 4, array['free_lunch']) $$,
  '23514', 'Choose from the tags shown', 'tags from the list'
);
select lives_ok(
  $$ select public.rate_site('91111111-0000-0000-0000-000000000001', 4,
       array['safe_site', 'clear_instructions'], 'The lift was out, stairs only') $$,
  'a worker rates the site once their hours are approved'
);
select throws_ok(
  $$ select public.rate_site('91111111-0000-0000-0000-000000000001', 5) $$,
  '23514', 'You''ve already rated this shift', 'once'
);
select throws_ok(
  $$ select public.rate_site('92222222-0000-0000-0000-000000000002', 5) $$,
  '42501', null, 'only their own shifts'
);
select results_eq(
  $$ select direction::text, score::integer from public.ratings $$,
  $$ values ('site', 4) $$,
  'and sees the rating they gave'
);

-- Worker B's hours aren't approved yet
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.rate_site('92222222-0000-0000-0000-000000000002', 5) $$,
  '23514', 'Rate the site once your hours are approved', 'not before the hours are approved'
);
select is_empty($$ select * from public.ratings $$, 'other workers see none of it');

-- The supervisor rates the worker
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.rate_worker('91111111-0000-0000-0000-000000000001', 5,
       array['punctual', 'would_rehire'], 'Great with the clients') $$,
  'a supervisor rates the worker'
);
select throws_ok(
  $$ select public.rate_worker('91111111-0000-0000-0000-000000000001', 3) $$,
  '23514', 'You''ve already rated them for this shift', 'once'
);
select throws_ok(
  $$ select public.rate_worker('92222222-0000-0000-0000-000000000002', 4) $$,
  '23514', 'Rate them once their hours are approved', 'after approval'
);
select throws_ok(
  $$ select public.rate_worker('93333333-0000-0000-0000-000000000003', 4) $$,
  '42501', null, 'only for their own work'
);
select results_eq(
  $$ select direction::text, score::integer from public.ratings $$,
  $$ values ('worker', 5) $$,
  'the business sees the rating it gave, not the worker''s'
);
select is_empty($$ select * from public.business_workers() $$, 'supervisors don''t manage workers');
select isnt_empty(
  format($$ select * from public.business_worker_profile(%L) $$, :'worker_a'),
  'supervisors see the profile of a worker at their site'
);

-- The owner
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select worker_id, shifts_here, favourite from public.business_workers() $$,
  format($$ values (%L::uuid, 1, false) $$, :'worker_a'),
  'owners see the workers who''ve worked for them'
);
insert into public.favourites (business_id, worker_id)
values ('b1111111-0000-0000-0000-000000000001', :'worker_a');
select results_eq(
  $$ select favourite from public.business_workers() $$,
  $$ values (true) $$,
  'and their favourites'
);
select results_eq(
  format($$ select shifts_here, our_rating, our_rating_count, favourite, tags
            from public.business_worker_profile(%L) $$, :'worker_a'),
  $$ values (1, 5.00::numeric, 1, true,
             '[{"tag": "punctual", "count": 1}, {"tag": "would_rehire", "count": 1}]'::jsonb) $$,
  'a worker''s profile shows their history here and the tags businesses gave'
);
select throws_ok(
  $$ update public.businesses set rating_avg = 5 where id = 'b1111111-0000-0000-0000-000000000001' $$,
  '42501', 'Only an admin can change that', 'businesses can''t change their own rating'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty($$ select * from public.ratings $$, 'other businesses see no ratings');
select results_eq(
  $$ select worker_id, shifts_here, favourite from public.business_workers() $$,
  format($$ values (%L::uuid, 1, false) $$, :'worker_a'),
  'only their own history with a worker, not other businesses'' favourites'
);
select results_eq(
  format($$ select shifts_here, our_rating_count, favourite, jsonb_array_length(tags)
            from public.business_worker_profile(%L) $$, :'worker_a'),
  $$ values (1, 0, false, 2) $$,
  'another business sees the tags every business gave, but only its own history'
);
select is_empty(
  format($$ select * from public.business_worker_profile(%L) $$, :'worker_b'),
  'and nothing of a worker who hasn''t applied to or worked for them'
);

-- Worker A sees the business's average with its work
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select business_rating, business_rating_count from public.my_job('f1111111-0000-0000-0000-000000000001') $$,
  $$ values (4.00::numeric, 1) $$,
  'workers see the business''s average'
);
select is_empty(
  $$ select * from public.ratings where direction = 'worker' $$,
  'but not what the business said about them'
);
select is_empty(
  format($$ select * from public.business_worker_profile(%L) $$, :'worker_b'),
  'workers can''t read each other''s profiles'
);

-- An admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select results_eq(
  $$ select private_note from public.ratings
     where assignment_id = '91111111-0000-0000-0000-000000000001' order by direction $$,
  $$ values ('Great with the clients'), ('The lift was out, stairs only') $$,
  'admins read the private notes'
);

reset role;
select results_eq(
  format($$ select rating_avg, rating_count from public.workers where id = %L $$, :'worker_a'),
  $$ values (5.00::numeric, 1) $$,
  'the worker''s average'
);
select results_eq(
  $$ select rating_avg, rating_count from public.businesses where id = 'b1111111-0000-0000-0000-000000000001' $$,
  $$ values (4.00::numeric, 1) $$,
  'and the business''s'
);

select finish();
rollback;
