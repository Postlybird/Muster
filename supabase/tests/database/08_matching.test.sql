-- Matching: workers see only shifts offered to them (and never other
-- workers' matches, pay tables or blocks); businesses see how many workers
-- were offered a job, never who or what they're paid.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');

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
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('b1111111-0000-0000-0000-000000000001', '63333333-3333-3333-3333-333333333333', 'supervisor', now()),
  ('b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Secret St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards,
  instructions) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(),
   true, 'Bring a smile');
insert into public.shifts (id, job_id, starts_at, ends_at, headcount) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '2 days', now() + interval '2 days 4 hours', 2),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '3 days', now() + interval '3 days 4 hours', 2);
insert into public.shift_pay (shift_id, hourly_cents, estimate_cents) values
  ('a1111111-0000-0000-0000-000000000001', 3313, 13252);
-- Worker A is offered the first shift now and the second later (favourites first);
-- worker B can't do it.
insert into public.shift_matches (shift_id, worker_id, eligible, visible_from, distance_km) values
  ('a1111111-0000-0000-0000-000000000001', :'worker_a', true, now() - interval '1 minute', 4.2),
  ('a2222222-0000-0000-0000-000000000002', :'worker_a', true, now() + interval '1 hour', 4.2),
  ('a1111111-0000-0000-0000-000000000001', :'worker_b', false, now(), 60);
update public.shift_matches set reasons = '{too_far}' where worker_id = :'worker_b';

set local role authenticated;

-- Worker A
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select array_agg(shift_id::text) from public.my_shift_offers()),
  array['a1111111-0000-0000-0000-000000000001'],
  'a worker sees the shifts offered to them, once visible'
);

select is(
  (select row(suburb, business_name, hourly_cents, estimate_cents)::text from public.my_shift_offers()),
  row('Parramatta', 'One', 3313, 13252)::text,
  'an offer shows the suburb, business and pay'
);

select is(
  (select instructions from public.my_job_offer('f1111111-0000-0000-0000-000000000001')),
  'Bring a smile',
  'an offer in full includes the instructions'
);

select is_empty($$ select * from public.shift_matches $$, 'workers can''t read the match table');
select is_empty($$ select * from public.shift_pay $$, 'workers can''t read the pay table');
select is_empty($$ select * from public.sites $$, 'workers can''t read site addresses');

-- Worker B
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is_empty($$ select * from public.my_shift_offers() $$, 'a worker who can''t do it isn''t offered it');
select is_empty(
  $$ select * from public.my_job_offer('f1111111-0000-0000-0000-000000000001') $$,
  'nor shown the job''s instructions'
);

-- The business
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  public.job_offer_count('f1111111-0000-0000-0000-000000000001'),
  1,
  'a business sees how many workers its job was offered to'
);

select is_empty($$ select * from public.shift_pay $$, 'businesses never see pay');

select lives_ok(
  $$ insert into public.blocks (business_id, worker_id, reason)
     values ('b1111111-0000-0000-0000-000000000001', '$$ || :'worker_a' || $$', 'Left site early twice') $$,
  'an owner can block a worker'
);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is_empty($$ select * from public.my_shift_offers() $$, 'a block hides the business''s shifts straight away');

select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ update public.blocks set archived_at = now()
     where worker_id = '$$ || :'worker_a' || $$' $$,
  'an owner can lift a block'
);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select isnt_empty($$ select * from public.my_shift_offers() $$, 'offers come back once it''s lifted');

reset role;
update public.workers set status = 'suspended', status_reason = 'pgTAP' where id = :'worker_a';
set local role authenticated;
select is_empty($$ select * from public.my_shift_offers() $$, 'a suspended worker sees no offers');

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);

select is(
  public.job_offer_count('f1111111-0000-0000-0000-000000000001'),
  null,
  'other businesses get nothing'
);

select * from finish();
rollback;
