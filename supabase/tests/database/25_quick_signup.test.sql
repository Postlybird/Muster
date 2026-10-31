-- Quicker sign-up (owner, 01/11/2026): a business can submit before adding
-- a site, and a worker we haven't checked yet sees open shifts near them in
-- the work they chose, with the pay, but not the business or address.
-- Checked workers, workers too far away and business users see none here.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_labourer', 'PGTAP labourer'),
  ('e2222222-0000-0000-0000-000000000002', 'pgtap_cook', 'PGTAP cook');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'new.worker@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'far.worker@pgtap.test', now(), '{}'),
  ('33333333-3333-3333-3333-333333333333', 'checked.worker@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('62222222-2222-2222-2222-222222222222', 'new.owner@pgtap.test', now(), '{"signup_role": "business_user"}');

select id as new_worker from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as far_worker from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset
select id as checked_worker from public.workers where profile_id = '33333333-3333-3333-3333-333333333333' \gset

-- Parramatta, 30 km; Newcastle, 30 km; and a checked worker in Parramatta.
update public.workers set home_suburb = 'Parramatta', home_lat = -33.815, home_lng = 151.003,
  travel_radius_km = 30 where id in (:'new_worker', :'checked_worker');
update public.workers set home_suburb = 'Newcastle', home_lat = -32.927, home_lng = 151.776,
  travel_radius_km = 30 where id = :'far_worker';
update public.workers set status = 'active' where id = :'checked_worker';
insert into public.worker_categories (worker_id, category_id) values
  (:'new_worker', 'e1111111-0000-0000-0000-000000000001'),
  (:'far_worker', 'e1111111-0000-0000-0000-000000000001'),
  (:'checked_worker', 'e1111111-0000-0000-0000-000000000001');

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'Secret Co', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Secret St', 'Granville', 'NSW', '2142', -33.833, 151.012);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true),
  ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e2222222-0000-0000-0000-000000000002', 'posted', now(), true);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '2 days', now() + interval '2 days 4 hours', 1),
  ('a2222222-0000-0000-0000-000000000002', 'f2222222-0000-0000-0000-000000000002',
   now() + interval '2 days', now() + interval '2 days 4 hours', 1);
insert into public.shift_pay (shift_id, hourly_cents, estimate_cents) values
  ('a1111111-0000-0000-0000-000000000001', 3313, 13252),
  ('a2222222-0000-0000-0000-000000000002', 3500, 14000);

set local role authenticated;

-- A new worker in Parramatta who chose labouring
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select array_agg(shift_id::text) from public.preview_shift_offers()),
  array['a1111111-0000-0000-0000-000000000001'],
  'a new worker sees open shifts near them in the work they chose'
);
select is(
  (select row(category_name, suburb, hourly_cents, estimate_cents)::text from public.preview_shift_offers()),
  row('PGTAP labourer', 'Granville', 3313, 13252)::text,
  'with the work, the suburb and the pay'
);
select ok(
  (select distance_km between 1 and 5 from public.preview_shift_offers()),
  'and how far away it is'
);
select is_empty(
  $$ select * from public.my_shift_offers() $$,
  'they aren''t offered it: they can''t apply until they''re checked'
);

-- Too far away
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is_empty($$ select * from public.preview_shift_offers() $$, 'a worker too far away sees nothing');

-- Already checked: they get real offers instead
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select is_empty($$ select * from public.preview_shift_offers() $$, 'a checked worker gets offers, not previews');

-- A business user
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is_empty($$ select * from public.preview_shift_offers() $$, 'business users have no previews');

-- A new business submits before it has a site
reset role;
insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  billing_contact_name, accounts_email, created_by) values
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP NEW PTY LTD', 'active', now(), 'draft',
   'Pat New', 'new.owner@pgtap.test', '62222222-2222-2222-2222-222222222222');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('b2222222-0000-0000-0000-000000000002', '62222222-2222-2222-2222-222222222222', 'owner', now());
insert into public.agreement_acceptances (agreement_id, profile_id, business_id)
select id, '62222222-2222-2222-2222-222222222222', 'b2222222-0000-0000-0000-000000000002'
from public.agreements where kind = 'labour_hire_services' and is_current and jurisdiction is null;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "62222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select lives_ok($$ select public.submit_business() $$, 'a new business can submit before adding a site');
reset role;
select is(
  (select status::text from public.businesses where id = 'b2222222-0000-0000-0000-000000000002'),
  'pending',
  'and waits for our approval'
);

select * from finish();
rollback;
