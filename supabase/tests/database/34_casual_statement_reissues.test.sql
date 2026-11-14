-- The Casual Employment Information Statement, given again (owner,
-- 14/11/2026): the compliance job records each one once per worker and
-- month count; workers see their own, our team sees all, and nobody else
-- writes.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('19111111-1111-1111-1111-111111111111', 'casual-a@reissue.pgtap.test', now(), '{}'),
  ('19222222-2222-2222-2222-222222222222', 'casual-b@reissue.pgtap.test', now(), '{}'),
  ('19333333-3333-3333-3333-333333333333', 'admin@reissue.pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '19333333-3333-3333-3333-333333333333';
select id as worker_a from public.workers where profile_id = '19111111-1111-1111-1111-111111111111' \gset

-- The job (service role) records one.
insert into public.casual_statement_reissues (worker_id, months) values (:'worker_a', 6);
select throws_ok(
  format($$ insert into public.casual_statement_reissues (worker_id, months) values (%L, 6) $$, :'worker_a'),
  '23505', null, 'each one is recorded once'
);
select throws_ok(
  format($$ insert into public.casual_statement_reissues (worker_id, months) values (%L, 3) $$, :'worker_a'),
  '23514', null, 'and never before 6 months'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "19111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*)::int from public.casual_statement_reissues),
  1,
  'a worker sees their own'
);
select throws_ok(
  format($$ insert into public.casual_statement_reissues (worker_id, months) values (%L, 12) $$, :'worker_a'),
  '42501', null, 'but can''t record one'
);
select throws_ok(
  $$ delete from public.casual_statement_reissues $$,
  '42501', null, 'or remove one'
);

select set_config('request.jwt.claims', '{"sub": "19222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  (select count(*)::int from public.casual_statement_reissues),
  0,
  'another worker sees none'
);

select set_config('request.jwt.claims', '{"sub": "19333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal2"}', true);
select ok(
  (select count(*) from public.casual_statement_reissues) >= 1,
  'our team sees them'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.casual_statement_reissues $$,
  '42501', null, 'visitors who aren''t signed in can''t read them'
);

reset role;
select * from finish();
rollback;
