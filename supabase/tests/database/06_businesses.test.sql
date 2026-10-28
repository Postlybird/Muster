-- Businesses: members see their own business; owners manage details, team
-- and sites; supervisors see only their sites; approval is admin-only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('62222222-2222-2222-2222-222222222222', 'manager@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('63333333-3333-3333-3333-333333333333', 'supervisor@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('64444444-4444-4444-4444-444444444444', 'invited@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

-- Sites need their state (demo data loads the rest; CI tests run before it).
insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;

-- Written by the server after an ABN lookup.
insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'active', now(),
   '61111111-1111-1111-1111-111111111111'),
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP TWO PTY LTD', 'active', now(),
   '65555555-5555-5555-5555-555555555555');
insert into public.business_users (id, business_id, profile_id, role, accepted_at) values
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('c2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001', '62222222-2222-2222-2222-222222222222', 'manager', now()),
  ('c3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001', '63333333-3333-3333-3333-333333333333', 'supervisor', now()),
  ('c5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot', '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00),
  ('d2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001', 'Job site', '2 Test St', 'Penrith', 'NSW', '2750', -33.75, 150.69);
insert into public.business_user_sites (business_user_id, site_id)
values ('c3333333-0000-0000-0000-000000000003', 'd2222222-0000-0000-0000-000000000002');

set local role authenticated;

-- Owner
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select array_agg(legal_name) from public.businesses),
  array['PGTAP ONE PTY LTD'],
  'an owner sees only their own business'
);

select lives_ok(
  $$ update public.businesses set trading_name = 'One', billing_contact_name = 'Pat',
       accounts_email = 'accounts@pgtap.test' where id = 'b1111111-0000-0000-0000-000000000001' $$,
  'an owner can update their contact details'
);

select throws_ok(
  $$ update public.businesses set status = 'approved' where id = 'b1111111-0000-0000-0000-000000000001' $$,
  '42501', null,
  'an owner cannot approve their own business'
);

select throws_ok(
  $$ update public.businesses set gst_registered = true where id = 'b1111111-0000-0000-0000-000000000001' $$,
  '42501', null,
  'an owner cannot change details that come from the ABN register'
);

select lives_ok(
  $$ insert into public.business_users (business_id, role, invite_email)
     values ('b1111111-0000-0000-0000-000000000001', 'manager', 'invited@pgtap.test') $$,
  'an owner can invite someone by email'
);

select is(
  (select invited_by from public.business_users where invite_email = 'invited@pgtap.test'),
  '61111111-1111-1111-1111-111111111111'::uuid,
  'the invite records who sent it'
);

select throws_ok(
  $$ insert into public.business_users (business_id, profile_id, role)
     values ('b1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner') $$,
  '42501', null,
  'an owner cannot add an existing account directly'
);

select throws_ok(
  $$ update public.business_users set role = 'manager' where id = 'c1111111-0000-0000-0000-000000000001' $$,
  '42501', null,
  'an owner cannot demote themselves'
);

select ok(
  exists (select 1 from public.profiles where id = '63333333-3333-3333-3333-333333333333'),
  'teammates can see each other''s names'
);

select ok(
  not exists (select 1 from public.profiles where id = '65555555-5555-5555-5555-555555555555'),
  'people in other businesses are hidden'
);

-- Manager
select set_config('request.jwt.claims', '{"sub": "62222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is((select count(*) from public.sites), 2::bigint, 'a manager sees every site');

select lives_ok(
  $$ insert into public.sites (business_id, name, address_line1, suburb, state, postcode, lat, lng)
     values ('b1111111-0000-0000-0000-000000000001', 'New', '3 Test St', 'Blacktown', 'NSW', '2148', -33.77, 150.90) $$,
  'a manager can add a site'
);

select throws_ok(
  $$ insert into public.business_users (business_id, role, invite_email)
     values ('b1111111-0000-0000-0000-000000000001', 'supervisor', 'someone@pgtap.test') $$,
  '42501', null,
  'only owners invite people'
);

-- Supervisor
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select is(
  (select array_agg(name) from public.sites),
  array['Job site'],
  'a supervisor sees only the sites they are given'
);

select throws_ok(
  $$ insert into public.sites (business_id, name, address_line1, suburb, state, postcode, lat, lng)
     values ('b1111111-0000-0000-0000-000000000001', 'Mine', '4 Test St', 'Ryde', 'NSW', '2112', -33.81, 151.10) $$,
  '42501', null,
  'a supervisor cannot add sites'
);

-- The invited person signs in
select set_config('request.jwt.claims', '{"sub": "64444444-4444-4444-4444-444444444444", "role": "authenticated"}', true);

select is(
  public.accept_business_invites(),
  'b1111111-0000-0000-0000-000000000001'::uuid,
  'an invite is matched to the account with that email'
);

select is(
  (select role::text from public.business_users where profile_id = '64444444-4444-4444-4444-444444444444'),
  'manager',
  'they join with the role they were invited as'
);

-- A worker
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is_empty($$ select id from public.businesses $$, 'workers cannot see businesses');

-- Owner submits
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

reset role;
insert into public.agreement_acceptances (agreement_id, profile_id, business_id)
select id, '61111111-1111-1111-1111-111111111111', 'b1111111-0000-0000-0000-000000000001'
from public.agreements where kind = 'labour_hire_services' and is_current and jurisdiction is null;
set local role authenticated;

select lives_ok($$ select public.submit_business() $$, 'a complete business can be submitted');

reset role;
select throws_ok(
  $$ update public.businesses set abn_status = 'cancelled', status = 'approved'
     where id = 'b2222222-0000-0000-0000-000000000002' $$,
  '23514', null,
  'a business with a cancelled ABN cannot be approved'
);

-- An admin (signed in with their authenticator app) approves it.
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
set local role authenticated;

select is(
  (select count(*) from public.businesses
   where id in ('b1111111-0000-0000-0000-000000000001', 'b2222222-0000-0000-0000-000000000002')),
  2::bigint,
  'an admin sees every business'
);

select lives_ok(
  $$ update public.businesses set status = 'approved', approved_at = now(),
       approved_by = '44444444-4444-4444-4444-444444444444', account_terms_approved = true,
       payment_terms_days = 14
     where id = 'b1111111-0000-0000-0000-000000000001' $$,
  'an admin can approve a business with account terms'
);

select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ select id from public.businesses $$,
  'an admin who has not used their authenticator app sees no businesses'
);

reset role;
insert into public.bill_rate_rules (business_id, method, margin_pct, effective_from)
values ('b1111111-0000-0000-0000-000000000001', 'markup', 15, '2026-07-01');
select throws_ok(
  $$ insert into public.bill_rate_rules (business_id, method, margin_pct, effective_from)
     values ('b1111111-0000-0000-0000-000000000001', 'markup', 12, '2026-07-01') $$,
  '23505', null,
  'a business has one bill rule per category from a given date'
);

select * from finish();
rollback;
