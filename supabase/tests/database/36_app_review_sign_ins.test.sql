-- The app reviewers' sign-in tries (owner, 14/11/2026): only the app's
-- server records them, and only our team reads them.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('36111111-1111-1111-1111-111111111111', 'worker@review.pgtap.test', now(), '{}'),
  ('36222222-2222-2222-2222-222222222222', 'admin@review.pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '36222222-2222-2222-2222-222222222222';

-- The server (service role) records a try.
insert into public.app_review_sign_ins (ok) values (false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "36111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*)::int from public.app_review_sign_ins),
  0,
  'other people can''t see them'
);
select throws_ok(
  $$ insert into public.app_review_sign_ins (ok) values (true) $$,
  '42501', null, 'or record one'
);

select set_config('request.jwt.claims', '{"sub": "36222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select ok(
  (select count(*) from public.app_review_sign_ins) >= 1,
  'our team sees them'
);
select throws_ok(
  $$ delete from public.app_review_sign_ins $$,
  '42501', null, 'but can''t remove them'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.app_review_sign_ins $$,
  '42501', null, 'visitors who aren''t signed in can''t read them'
);

reset role;
select * from finish();
rollback;
