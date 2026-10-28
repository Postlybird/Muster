-- Profiles: created on sign-up, private to their owner, role can't be self-assigned.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, phone, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', null, '{"full_name": "Worker A"}'),
  ('22222222-2222-2222-2222-222222222222', null, '61499999002', '{"signup_role": "admin"}'),
  ('33333333-3333-3333-3333-333333333333', 'owner@pgtap.test', null, '{"signup_role": "business_user"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', null, '{}');

update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'worker',
  'sign-up without a role creates a worker'
);

select is(
  (select role::text from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'worker',
  'sign-up asking to be an admin still creates a worker'
);

select is(
  (select phone from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  '+61499999002',
  'phone numbers are stored in E.164 with a plus sign'
);

select is(
  (select role::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'business_user',
  'sign-up from the business path creates a business user'
);

-- Every profile in the database, including any demo data already loaded.
select count(*) as total_profiles from public.profiles \gset

-- Act as worker A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  'select id from public.profiles',
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'a worker sees only their own profile'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Worker Alpha' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a worker can change their own name'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a worker cannot change their own role'
);

select is_empty(
  $$ update public.profiles set full_name = 'Hacked' where id = '33333333-3333-3333-3333-333333333333' returning id $$,
  'a worker cannot change someone else''s profile'
);

-- Act as the admin.
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select is(
  (select count(*)::int from public.profiles),
  :total_profiles,
  'an admin sees every profile'
);

reset role;

select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Worker Alpha',
  'the worker''s own change was saved'
);

select * from finish();
rollback;
