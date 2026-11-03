-- The record of code texts (the live site's daily limit) is the service
-- role's alone: nobody signed in can read it, add to it or clear it.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('e6111111-1111-1111-1111-111111111111', 'texts.worker@pgtap.test', now(), '{"signup_role": "worker"}');
insert into public.auth_texts (user_id) values ('e6111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::int from public.auth_texts where user_id = 'e6111111-1111-1111-1111-111111111111'),
  1, 'the service role records a code text'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "e6111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select count(*) from public.auth_texts $$,
  '42501', null, 'a worker can''t read the record, even their own'
);
select throws_ok(
  $$ delete from public.auth_texts $$,
  '42501', null, 'or clear it to get more texts'
);

set local role anon;
select throws_ok(
  $$ insert into public.auth_texts (user_id) values ('e6111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'and nobody signed out can add to it'
);

select * from finish();
rollback;
