-- Verification: admin powers need an authenticator app; ticket reviews and
-- activation follow the rules; ID images can be read and deleted by admins only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email, phone, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', '61499990011', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', null, '{}'),
  ('55555555-5555-5555-5555-555555555555', 'admin.demo@demo.test', null, '{}');
update public.profiles set role = 'admin'
where id in ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555');

insert into public.credential_types (id, code, name)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'pgtap_ticket', 'pgTAP ticket');

select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset

-- Worker A has finished onboarding; everything is waiting to be checked.
update public.workers
set legal_first_name = 'Ann', legal_last_name = 'Example', date_of_birth = '1990-01-01',
    photo_path = :'worker_a' || '/photo-1.jpg', photo_status = 'pending', home_suburb = 'Parramatta',
    status = 'pending', submitted_at = now()
where id = :'worker_a';
insert into public.work_rights (worker_id, basis, citizenship_evidence, evidence_path)
values (:'worker_a', 'citizen', 'australian_passport', :'worker_a' || '/citizenship-1.jpg');
insert into public.identity_checks (worker_id, document_type, document_path, selfie_path)
values (:'worker_a', 'passport', :'worker_a' || '/id-document-1.jpg', :'worker_a' || '/selfie-1.jpg');
insert into public.worker_credentials (id, worker_id, credential_type_id, number, status, verified_at)
values
  ('cccccccc-0000-0000-0000-000000000001', :'worker_a', 'aaaaaaaa-0000-0000-0000-000000000002', 'OLD', 'verified', now()),
  ('cccccccc-0000-0000-0000-000000000002', :'worker_a', 'aaaaaaaa-0000-0000-0000-000000000002', 'NEW', 'pending', null);
insert into storage.objects (bucket_id, name) values ('identity', :'worker_a' || '/id-document-1.jpg');
delete from public.settings where key = 'demo_admins_skip_mfa';

set local role authenticated;

-- Admin signed in without their authenticator app
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal1"}', true);

select ok(not public.is_admin(), 'an admin without their second factor has no admin powers');
select is_empty(
  format('select id from public.workers where id = %L', :'worker_a'),
  'an admin without their second factor cannot see workers'
);
select throws_ok(
  $$ select public.review_worker_credential('cccccccc-0000-0000-0000-000000000002', true) $$,
  '42501', null,
  'an admin without their second factor cannot check tickets'
);

-- Demo admin: exempt only when the demo data switches it on
select set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "aal": "aal1"}', true);
select ok(not public.is_admin(), 'a demo admin still needs a second factor by default');
reset role;
insert into public.settings (key, value, description) values ('demo_admins_skip_mfa', 'true', 'pgTAP');
set local role authenticated;
select ok(public.is_admin(), 'demo admins can skip the second factor when demo data allows it');

-- Admin with their second factor
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select ok(public.is_admin(), 'an admin who used their authenticator app has admin powers');

select ok(
  exists (select 1 from storage.objects where bucket_id = 'identity' and name = :'worker_a' || '/id-document-1.jpg'),
  'an admin can open ID images'
);

select throws_ok(
  $$ select public.review_worker_credential('cccccccc-0000-0000-0000-000000000002', false, '  ') $$,
  '23514', null,
  'rejecting a ticket needs a reason'
);

select lives_ok(
  $$ select public.review_worker_credential('cccccccc-0000-0000-0000-000000000002', true) $$,
  'an admin can verify a renewed ticket'
);

select is(
  (select array_agg(number || ':' || status::text || ':' || (archived_at is not null)::text order by number)
     from public.worker_credentials where worker_id = :'worker_a'),
  array['NEW:verified:false', 'OLD:verified:true'],
  'verifying a renewal archives the copy it replaces'
);

select throws_ok(
  $$ select public.review_worker_credential('cccccccc-0000-0000-0000-000000000002', true) $$,
  '23514', null,
  'a ticket can only be checked once'
);

select throws_ok(
  format('select public.activate_worker(%L)', :'worker_a'),
  '23514', 'Still to do: photo, right to work, photo ID, payroll setup',
  'activation lists what is still to do'
);

update public.workers set photo_status = 'verified', payroll_status = 'complete', payroll_employee_id = 'EH-1'
where id = :'worker_a';
update public.work_rights set status = 'verified' where worker_id = :'worker_a';
update public.identity_checks set status = 'verified', images_deleted_at = now(), document_path = null, selfie_path = null
where worker_id = :'worker_a';

select lives_ok(
  format('select public.activate_worker(%L)', :'worker_a'),
  'a worker with every core check done can be activated'
);

select is(
  (select status::text from public.workers where id = :'worker_a'),
  'active',
  'the worker is now active'
);

-- The worker
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  format('select public.activate_worker(%L)', :'worker_a'),
  '42501', null,
  'a worker cannot activate themselves'
);

reset role;

-- Storage blocks deletes outside its API, which applies these policies.
select is(
  (select array_agg(policyname::text) from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'
      and qual like '%worker-photos%'),
  array['worker files: admins delete'],
  'only admins can delete worker files'
);

select * from finish();
rollback;
