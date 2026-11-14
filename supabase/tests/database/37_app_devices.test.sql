-- Notifications on the phone apps (owner, 14/11/2026): each person saves and
-- removes only their own phones, a phone used by someone new moves to them,
-- and deleting an account removes its phones.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('37111111-1111-1111-1111-111111111111', 'one@devices.pgtap.test', now(), '{}'),
  ('37222222-2222-2222-2222-222222222222', 'two@devices.pgtap.test', now(), '{}'),
  ('37333333-3333-3333-3333-333333333333', 'leaving@devices.pgtap.test', now(), '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "37111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_app_device('token-one-aaaaaaaaaaaaaaaaaaaaaaaa', 'android') $$,
  'a worker turns notifications on for their phone'
);
select is(
  (select count(*)::int from public.app_devices),
  1,
  'and sees it'
);
select throws_ok(
  $$ select public.save_app_device('token-two-aaaaaaaaaaaaaaaaaaaaaaaa', 'web') $$,
  '23514', null, 'only Android and iPhone phones'
);
select throws_ok(
  $$ insert into public.app_devices (profile_id, platform, token)
     values ('37111111-1111-1111-1111-111111111111', 'ios', 'token-three-aaaaaaaaaaaaaaaaaaaaaa') $$,
  '42501', null, 'only through the function'
);

-- Someone else signs in on the same phone: it moves to them.
select set_config('request.jwt.claims', '{"sub": "37222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select public.save_app_device('token-one-aaaaaaaaaaaaaaaaaaaaaaaa', 'android');
select is(
  (select count(*)::int from public.app_devices),
  1,
  'a phone someone else used moves to the person now signed in'
);
select set_config('request.jwt.claims', '{"sub": "37111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*)::int from public.app_devices),
  0,
  'and the first person no longer has it'
);
select public.remove_app_device('token-one-aaaaaaaaaaaaaaaaaaaaaaaa');
reset role;
select is(
  (select count(*)::int from public.app_devices where token = 'token-one-aaaaaaaaaaaaaaaaaaaaaaaa'),
  1,
  'nobody can take another person''s phone off'
);

-- Deleting an account removes its phones.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "37333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select public.save_app_device('token-leaving-aaaaaaaaaaaaaaaaaaaaa', 'ios');
select public.close_my_account();
reset role;
select is(
  (select count(*)::int from public.app_devices
   where profile_id = '37333333-3333-3333-3333-333333333333'),
  0,
  'deleting an account removes its phones'
);

set local role anon;
select throws_ok(
  $$ select public.save_app_device('token-anon-aaaaaaaaaaaaaaaaaaaaaaa', 'ios') $$,
  '42501', null, 'visitors who aren''t signed in can''t save one'
);

reset role;
select * from finish();
rollback;
