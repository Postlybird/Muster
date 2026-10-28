-- Workers: own records only; statuses, levels and verification are admin-only;
-- files must be in the worker's own folder; submitting checks the basics.
begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

insert into auth.users (id, email, phone, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', '61499990001', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', null, '{}'),
  ('33333333-3333-3333-3333-333333333333', 'owner@pgtap.test', null, '{"signup_role": "business_user"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', null, '{}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.categories (id, code, name)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'pgtap_category', 'pgTAP category');
insert into public.credential_types (id, code, name)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'pgtap_ticket', 'pgTAP ticket');

select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset

select ok(:'worker_a' is not null, 'a worker record is created when a worker signs up');

select is_empty(
  $$ select id from public.workers where profile_id = '33333333-3333-3333-3333-333333333333' $$,
  'business users do not get a worker record'
);

select ok(
  (select archived_at is not null from public.workers
    where profile_id = '44444444-4444-4444-4444-444444444444'),
  'the worker record is archived when someone becomes an admin'
);

-- Files already uploaded by worker A (storage rows written by the storage service).
insert into storage.objects (bucket_id, name) values
  ('identity', :'worker_a' || '/id-document-1.jpg'),
  ('worker-photos', :'worker_a' || '/photo-1.jpg');

-- ---------------------------------------------------------------------------
-- Worker A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select count(*) from public.workers),
  1::bigint,
  'a worker sees only their own worker record'
);

select lives_ok(
  $$ update public.workers
     set legal_first_name = 'Ann', legal_last_name = 'Example', preferred_name = 'Annie',
         date_of_birth = '1990-01-01', home_suburb = 'Parramatta', travel_radius_km = 25
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  'a worker can update their own details'
);

select throws_ok(
  $$ update public.workers set status = 'active' where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'a worker cannot activate themselves'
);

select throws_ok(
  $$ update public.workers set payroll_employee_id = 'EH-1' where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'a worker cannot set their own payroll details'
);

update public.workers set photo_path = public.my_worker_id() || '/photo-1.jpg'
where profile_id = '11111111-1111-1111-1111-111111111111';

select is(
  (select photo_status::text from public.workers),
  'pending',
  'a new photo goes back for checking'
);

select throws_ok(
  format(
    'update public.workers set photo_path = %L where profile_id = %L',
    :'worker_b' || '/photo-1.jpg', '11111111-1111-1111-1111-111111111111'
  ),
  '23514', null,
  'a worker cannot use a file from another worker''s folder'
);

select is_empty(
  $$ update public.workers set bio = 'Changed' where profile_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'a worker cannot change another worker''s record'
);

insert into public.work_rights (worker_id, basis, citizenship_evidence, evidence_path, status, vevo_reference)
values (public.my_worker_id(), 'citizen', 'australian_passport', public.my_worker_id() || '/citizenship-1.jpg', 'verified', 'FAKE');

select is(
  (select status::text || ' ' || coalesce(vevo_reference, 'none') from public.work_rights),
  'pending none',
  'a worker cannot mark their own right to work as checked'
);

select throws_ok(
  format(
    'insert into public.work_rights (worker_id, basis, citizenship_evidence) values (%L, %L, %L)',
    :'worker_b', 'citizen', 'birth_certificate'
  ),
  '42501', null,
  'a worker cannot add right to work details for someone else'
);

select throws_ok(
  $$ update public.work_rights set basis = 'visa', citizenship_evidence = null, vevo_consent_at = null $$,
  '23514', null,
  'a visa holder must consent to a VEVO check'
);

insert into public.identity_checks (worker_id, document_type, document_path, selfie_path, status)
values (public.my_worker_id(), 'driver_licence', public.my_worker_id() || '/id-document-1.jpg',
        public.my_worker_id() || '/selfie-1.jpg', 'verified');

select is(
  (select status::text from public.identity_checks),
  'pending',
  'a worker cannot mark their own ID as checked'
);

insert into public.worker_categories (worker_id, category_id, years_experience, level)
values (public.my_worker_id(), 'aaaaaaaa-0000-0000-0000-000000000001', 3, 5);

select is(
  (select level from public.worker_categories),
  1::smallint,
  'a worker cannot choose their own level'
);

select throws_ok(
  $$ update public.worker_categories set level = 3 $$,
  '42501', null,
  'a worker cannot raise their own level'
);

insert into public.worker_credentials (worker_id, credential_type_id, number, expires_on, status)
values (public.my_worker_id(), 'aaaaaaaa-0000-0000-0000-000000000002', 'T-100', '2030-01-01', 'verified');

select is(
  (select status::text from public.worker_credentials),
  'pending',
  'a new ticket is always checked first'
);

select throws_ok(
  $$ update public.worker_credentials set status = 'verified' $$,
  '42501', null,
  'a worker cannot verify their own ticket'
);

select throws_ok(
  $$ insert into public.worker_credentials (worker_id, credential_type_id, number)
     values (public.my_worker_id(), 'aaaaaaaa-0000-0000-0000-000000000002', 'T-101') $$,
  '23505', null,
  'only one unchecked copy of each ticket at a time'
);

select lives_ok(
  $$ insert into public.availability_weekly (worker_id, weekday, start_time, end_time)
     values (public.my_worker_id(), 1, '07:00', '17:00') $$,
  'a worker can set their availability'
);

-- Storage: own folder only, and ID images can't be read back.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('worker-docs', public.my_worker_id() || '/ticket-1.pdf') $$,
  'a worker can upload into their own folder'
);

select throws_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'worker-docs', :'worker_b' || '/ticket-1.pdf'
  ),
  '42501', null,
  'a worker cannot upload into another worker''s folder'
);

select ok(
  exists (select 1 from storage.objects where bucket_id = 'worker-photos'),
  'a worker can see their own photo'
);

select is_empty(
  $$ select name from storage.objects where bucket_id = 'identity' $$,
  'a worker cannot read back their ID images'
);

reset role;

-- ---------------------------------------------------------------------------
-- Submitting (worker A). Employment documents loaded by the demo data, if
-- any, are accepted first.
-- ---------------------------------------------------------------------------
insert into public.agreement_acceptances (agreement_id, profile_id)
select id, '11111111-1111-1111-1111-111111111111' from public.agreements
where is_current and kind in (
  'casual_employment_contract', 'fair_work_information_statement', 'casual_employment_information_statement'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

update public.workers set date_of_birth = (current_date - interval '17 years')::date;

select throws_ok(
  $$ select public.submit_worker_onboarding() $$,
  '23514', null,
  'a worker under the minimum age cannot submit'
);

update public.workers set date_of_birth = '1990-01-01';

select lives_ok(
  $$ select public.submit_worker_onboarding() $$,
  'a worker with every step done can submit'
);

select is(
  (select status::text from public.workers),
  'pending',
  'submitting sends the worker for checking'
);

select throws_ok(
  $$ select public.submit_worker_onboarding() $$,
  '23514', null,
  'a worker can only submit once'
);

-- ---------------------------------------------------------------------------
-- Worker B: nothing done yet, then checked by an admin.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.submit_worker_onboarding() $$,
  '23514', null,
  'submitting with steps missing is refused'
);

update public.workers set legal_first_name = 'Ben', legal_last_name = 'Example';
insert into public.identity_checks (worker_id, document_type) values (public.my_worker_id(), 'passport');
insert into public.worker_credentials (worker_id, credential_type_id, number)
values (public.my_worker_id(), 'aaaaaaaa-0000-0000-0000-000000000002', 'B-1');

-- Admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}', true);

select lives_ok(
  format(
    'update public.identity_checks set status = %L, reviewed_at = now() where worker_id = %L',
    'verified', :'worker_b'
  ),
  'an admin can verify ID'
);

select lives_ok(
  format(
    'update public.worker_credentials set status = %L, verified_at = now() where worker_id = %L',
    'verified', :'worker_b'
  ),
  'an admin can verify a ticket'
);

-- Worker B again
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select throws_ok(
  $$ update public.workers set legal_last_name = 'Changed' $$,
  '42501', null,
  'legal names are locked once ID has been checked'
);

select throws_ok(
  $$ update public.worker_credentials set number = 'B-2' $$,
  '42501', null,
  'a verified ticket cannot be edited'
);

select lives_ok(
  $$ insert into public.worker_credentials (worker_id, credential_type_id, number)
     values (public.my_worker_id(), 'aaaaaaaa-0000-0000-0000-000000000002', 'B-2') $$,
  'a renewed ticket can be added while the current one counts'
);

reset role;

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
insert into public.work_rights (worker_id, basis, passport_number, passport_country, vevo_consent_at)
values (:'worker_b', 'visa', 'PA1234567', 'New Zealand', now());

select is(
  (select after ->> 'passport_number' from public.audit_log
    where table_name = 'work_rights' and record_id = (select id::text from public.work_rights where worker_id = :'worker_b')),
  '[redacted]',
  'passport numbers are kept out of the audit log'
);

select ok(
  exists (select 1 from public.audit_log
    where table_name = 'worker_credentials' and action = 'insert'
      and subject_profile_id = '22222222-2222-2222-2222-222222222222'),
  'ticket changes are logged against the worker'
);

select * from finish();
rollback;
