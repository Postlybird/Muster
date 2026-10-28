-- The admin console (brief §6): the workers list and its filters, for
-- admins only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into public.categories (id, code, name) values
  ('e1611111-0000-0000-0000-000000000001', 'pgtap_list_cleaner', 'PGTAP list cleaner');
insert into public.credential_types (id, code, name, kind, has_expiry) values
  ('c1611111-0000-0000-0000-000000000001', 'pgtap_list_ticket', 'PGTAP list ticket', 'ticket', true),
  ('c1622222-0000-0000-0000-000000000002', 'pgtap_list_police', 'PGTAP police check', 'police_check', false);

insert into auth.users (id, email, phone, email_confirmed_at, raw_user_meta_data) values
  ('16111111-1111-1111-1111-111111111111', 'list.a@pgtap.test', '61400000001', now(), '{}'),
  ('16222222-2222-2222-2222-222222222222', 'list.b@pgtap.test', null, now(), '{}'),
  ('16333333-3333-3333-3333-333333333333', 'list.c@pgtap.test', null, now(), '{}'),
  ('16444444-4444-4444-4444-444444444444', 'list.admin@pgtap.test', null, now(), '{}');
update public.profiles set role = 'admin' where id = '16444444-4444-4444-4444-444444444444';

select id as worker_a from public.workers where profile_id = '16111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '16222222-2222-2222-2222-222222222222' \gset
select id as worker_c from public.workers where profile_id = '16333333-3333-3333-3333-333333333333' \gset
select (now() at time zone 'Australia/Sydney')::date as today \gset

-- A: active cleaner in Parramatta, whose ticket runs out in 10 days. B:
-- being checked, in Penrith, on a visa that ends in 20 days. C: suspended,
-- with a police check that's too old in 5 days.
update public.workers set legal_first_name = 'Pgtapa', legal_last_name = 'Listone',
  preferred_name = 'Ace', status = 'active', home_suburb = 'Parramatta', home_postcode = '2150'
where id = :'worker_a';
update public.workers set legal_first_name = 'Pgtapb', legal_last_name = 'Listtwo',
  status = 'pending', home_suburb = 'Penrith', home_postcode = '2750'
where id = :'worker_b';
update public.workers set legal_first_name = 'Pgtapc', legal_last_name = 'Listthree',
  status = 'suspended', home_suburb = 'Liverpool', home_postcode = '2170'
where id = :'worker_c';
insert into public.worker_categories (worker_id, category_id, level, years_experience) values
  (:'worker_a', 'e1611111-0000-0000-0000-000000000001', 1, 2);
insert into public.worker_credentials (worker_id, credential_type_id, issued_on, expires_on, status) values
  (:'worker_a', 'c1611111-0000-0000-0000-000000000001', :'today'::date - 300, :'today'::date + 10, 'verified'),
  (:'worker_c', 'c1622222-0000-0000-0000-000000000002',
   (:'today'::date + 5 + 1 - interval '12 months')::date, null, 'verified');
insert into public.work_rights (worker_id, basis, status, vevo_consent_at, visa_expiry) values
  (:'worker_b', 'visa', 'verified', now(), :'today'::date + 20);
update public.settings set value = '12' where key = 'police_check_max_age_months';

set local role authenticated;

-- Workers and businesses see nobody.
select set_config('request.jwt.claims', '{"sub": "16111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is((select count(*) from public.admin_worker_list()), 0::bigint, 'workers can''t list workers');

select set_config('request.jwt.claims', '{"sub": "16444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_category_id => 'e1611111-0000-0000-0000-000000000001') $$,
  $$ values ('Listone') $$,
  'by work type'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_credential_type_id => 'c1611111-0000-0000-0000-000000000001') $$,
  $$ values ('Listone') $$,
  'by verified ticket'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => 'pgtap.test', p_status => 'pending') $$,
  $$ values ('Listtwo') $$,
  'by status'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => '0400 000 001') $$,
  $$ values ('Listone') $$,
  'by mobile, however it''s typed'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => 'Ace LISTONE') $$,
  $$ values ('Listone') $$,
  'by the name they go by'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => 'pgtap.test', p_suburb => '2750') $$,
  $$ values ('Listtwo') $$,
  'by suburb or postcode'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => 'pgtap.test', p_expiring_within_days => 7) $$,
  $$ values ('Listthree') $$,
  'expiring soon counts a police check from its issue date'
);
select results_eq(
  $$ select legal_last_name from public.admin_worker_list(p_search => 'pgtap.test', p_expiring_within_days => 30) $$,
  $$ values ('Listone'), ('Listtwo'), ('Listthree') $$,
  'expiring soon includes tickets and visas'
);
select results_eq(
  $$ select next_expiry, next_expiry_what from public.admin_worker_list(p_search => 'pgtap.test') $$,
  format($$ values (%L::date, 'PGTAP list ticket'), (%L::date, 'Visa'), (%L::date, 'PGTAP police check') $$,
    :'today'::date + 10, :'today'::date + 20, :'today'::date + 5),
  'the next thing to expire for each'
);
select results_eq(
  $$ select legal_last_name, total_count from public.admin_worker_list(p_search => 'pgtap.test', p_limit => 1, p_offset => 1) $$,
  $$ values ('Listtwo', 3::bigint) $$,
  'a page at a time, with the total'
);

-- Archived workers are left out.
reset role;
update public.workers set archived_at = now() where id = :'worker_c';
set local role authenticated;
select is(
  (select count(*) from public.admin_worker_list(p_search => 'pgtap.test')),
  2::bigint,
  'archived workers are left out'
);

select * from finish();
rollback;
