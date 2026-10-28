-- Rate cards and bill rules are admin-only; agreements are versioned and
-- frozen once published; acceptances can't be changed.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'worker@pgtap.test'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.categories (id, code, name)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'pgtap_category', 'pgTAP category');

insert into public.rate_cards (category_id, base_rate_cents, effective_from)
values ('aaaaaaaa-0000-0000-0000-000000000001', 2500, '2026-07-01');

insert into public.agreements (id, kind, version, title, body_md, is_current, published_at)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'labour_hire_services', 'pgtap-1', 'Published', 'Body', false, now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'labour_hire_services', 'pgtap-2', 'Draft', 'Body', false, null);

-- Worker
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is_empty(
  $$ select id from public.rate_cards where category_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'a worker cannot see rate cards'
);

select throws_ok(
  $$ insert into public.rate_cards (category_id, base_rate_cents, effective_from)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 9999, '2026-08-01') $$,
  '42501',
  null,
  'a worker cannot add a rate card'
);

select ok(
  exists (select 1 from public.agreements where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'a worker can read a published agreement'
);

select ok(
  not exists (select 1 from public.agreements where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'a worker cannot read an unpublished draft'
);

select throws_ok(
  $$ insert into public.agreement_acceptances (agreement_id, profile_id)
     values ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111') $$,
  '42501',
  null,
  'acceptances are recorded by the server, not directly by users'
);

select throws_ok(
  $$ insert into public.public_holidays (state, date, name) values ('NSW', '2030-01-02', 'Fake day') $$,
  '42501',
  null,
  'a worker cannot add a public holiday'
);

-- Admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select ok(
  exists (select 1 from public.rate_cards where category_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'an admin can see rate cards'
);

select lives_ok(
  $$ update public.rate_cards set base_rate_cents = 2600
     where category_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'an admin can change a rate card'
);

select is(
  (select actor_id from public.audit_log
    where table_name = 'rate_cards' and action = 'update'
    order by created_at desc limit 1),
  '44444444-4444-4444-4444-444444444444'::uuid,
  'rate card changes are audited'
);

select throws_ok(
  $$ update public.agreements set body_md = 'Changed wording'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'a published agreement cannot be reworded'
);

select lives_ok(
  $$ update public.agreements set body_md = 'Still drafting'
     where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  'an unpublished draft can still be edited'
);

reset role;

-- Only one current version of each agreement.
update public.agreements set is_current = false where kind = 'labour_hire_services';
update public.agreements set is_current = true where id = 'bbbbbbbb-0000-0000-0000-000000000001';

select throws_ok(
  $$ update public.agreements set published_at = now(), is_current = true
     where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  '23505',
  null,
  'there can only be one current version of an agreement'
);

-- Acceptances (as recorded by the server) can't be changed afterwards.
insert into public.agreement_acceptances (id, agreement_id, profile_id, ip)
values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', '203.0.113.7');

select throws_ok(
  $$ update public.agreement_acceptances set ip = '198.51.100.1'
     where id = 'cccccccc-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'an acceptance record cannot be changed'
);

select throws_ok(
  $$ delete from public.agreement_acceptances where id = 'cccccccc-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'an acceptance record cannot be deleted'
);

select * from finish();
rollback;
