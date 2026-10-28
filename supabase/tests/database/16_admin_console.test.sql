-- The admin console (brief §6): the workers list and its filters, the
-- shift board, and the audit log viewer, for admins only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

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

-- The shift board: a posted job with a shift tomorrow (one of two booked,
-- one more applying), one under way (clocked in) and one cancelled; and a
-- draft job's shift.
insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('16555555-5555-5555-5555-555555555555', 'board.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1611111-0000-0000-0000-000000000001', '16111111111', 'PGTAP BOARD PTY LTD', 'Board Co', 'active', now(),
   'approved', true, '16555555-5555-5555-5555-555555555555');
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1611111-0000-0000-0000-000000000001', 'b1611111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards, headcount) values
  ('f1611111-0000-0000-0000-000000000001', 'b1611111-0000-0000-0000-000000000001',
   'd1611111-0000-0000-0000-000000000001', 'e1611111-0000-0000-0000-000000000001', 'posted', now(), true, 2),
  ('f1622222-0000-0000-0000-000000000002', 'b1611111-0000-0000-0000-000000000001',
   'd1611111-0000-0000-0000-000000000001', 'e1611111-0000-0000-0000-000000000001', 'draft', null, true, 1);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1611111-0000-0000-0000-000000000001', 'f1611111-0000-0000-0000-000000000001',
   now() + interval '20 hours', now() + interval '24 hours', 2, 'open'),
  ('a1622222-0000-0000-0000-000000000002', 'f1611111-0000-0000-0000-000000000001',
   now() - interval '1 hour', now() + interval '3 hours', 1, 'filled'),
  ('a1633333-0000-0000-0000-000000000003', 'f1611111-0000-0000-0000-000000000001',
   now() + interval '30 hours', now() + interval '34 hours', 1, 'cancelled'),
  ('a1644444-0000-0000-0000-000000000004', 'f1622222-0000-0000-0000-000000000002',
   now() + interval '20 hours', now() + interval '24 hours', 1, 'open');
insert into public.assignments (id, shift_id, worker_id) values
  ('91611111-0000-0000-0000-000000000001', 'a1611111-0000-0000-0000-000000000001', :'worker_a'),
  ('91622222-0000-0000-0000-000000000002', 'a1622222-0000-0000-0000-000000000002', :'worker_b');
insert into public.applications (shift_id, worker_id) values
  ('a1611111-0000-0000-0000-000000000001', :'worker_c');
insert into public.attendance_events (assignment_id, kind, occurred_at, inside_geofence) values
  ('91622222-0000-0000-0000-000000000002', 'clock_in', now() - interval '55 minutes', true);

-- An admin looked at A's documents.
insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, subject_profile_id, context)
values ('16444444-4444-4444-4444-444444444444', 'admin', 'view_documents', 'workers', :'worker_a',
  '16111111-1111-1111-1111-111111111111', '{"documents": ["photo"]}');

set local role authenticated;

-- Workers and businesses see nobody.
select set_config('request.jwt.claims', '{"sub": "16111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is((select count(*) from public.admin_worker_list()), 0::bigint, 'workers can''t list workers');
select is(
  (select count(*) from public.admin_shift_board(now() - interval '1 day', now() + interval '7 days')),
  0::bigint,
  'workers can''t see the shift board'
);
select is((select count(*) from public.admin_audit_log()), 0::bigint, 'or the audit log');

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

select results_eq(
  $$ select shift_id, booked, applicants, arrived
     from public.admin_shift_board(now(), now() + interval '7 days')
     where business_id = 'b1611111-0000-0000-0000-000000000001' $$,
  $$ values ('a1622222-0000-0000-0000-000000000002'::uuid, 1, 0, 1),
            ('a1611111-0000-0000-0000-000000000001'::uuid, 1, 1, 0) $$,
  'the board shows posted shifts that haven''t finished, with who''s booked, applying and on site'
);
select is(
  (select count(*) from public.admin_shift_board(now() + interval '4 hours', now() + interval '7 days')
   where business_id = 'b1611111-0000-0000-0000-000000000001'),
  1::bigint,
  'finished shifts drop off the board'
);

-- The audit log: who did what to whose record.
select results_eq(
  $$ select action, actor_name, subject_name, context
     from public.admin_audit_log(p_subject => '16111111-1111-1111-1111-111111111111', p_kind => 'views') $$,
  $$ values ('view_documents', 'list.admin@pgtap.test', 'Ace Listone', '{"documents": ["photo"]}'::jsonb) $$,
  'views of a worker''s documents, with who looked'
);
select ok(
  (select bool_and(action in ('insert', 'update', 'delete') and subject_name = 'Ace Listone')
   from public.admin_audit_log(p_subject => '16111111-1111-1111-1111-111111111111', p_kind => 'changes')),
  'changes to their records'
);
select ok(
  (select count(*) > 0 and bool_and(subject_name = 'Pgtapb Listtwo' or actor_name = 'Pgtapb Listtwo')
   from public.admin_audit_log(p_person => 'LIST.B@pgtap')),
  'found by a person''s email, either way round'
);
select is(
  (select count(*) from public.admin_audit_log(p_people_only => true, p_limit => 200)
   where subject_profile_id is null),
  0::bigint,
  'just entries about people when asked'
);
select ok(
  (select count(*) > 0 and bool_and(table_name = 'jobs')
   from public.admin_audit_log(p_table => 'jobs', p_person => null, p_from => now() - interval '1 minute')),
  'or one kind of record'
);
select is(
  (select count(*) from public.admin_audit_log(p_from => now() + interval '1 day')),
  0::bigint,
  'and between dates'
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
