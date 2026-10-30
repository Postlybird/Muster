-- State versions of tickets: each belongs to a state, and a state has one
-- current version of each.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into public.credential_types (code, name, state, family) values
  ('pgtap_rsa_vic', 'pgTAP RSA (Victoria)', 'VIC', 'pgTAP RSA'),
  ('pgtap_rsa_qld', 'pgTAP RSA (Queensland)', 'QLD', 'pgTAP RSA');

select is(
  (select array_agg(state order by state) from public.credential_types where family = 'pgTAP RSA'),
  array['QLD', 'VIC'],
  'each state has its own version of a ticket'
);

select throws_ok(
  $$ insert into public.credential_types (code, name, state, family)
     values ('pgtap_rsa_vic2', 'Another RSA', 'VIC', 'pgTAP RSA') $$,
  '23505',
  null,
  'a state has one current version of each ticket'
);

update public.credential_types set archived_at = now() where code = 'pgtap_rsa_vic';
select lives_ok(
  $$ insert into public.credential_types (code, name, state, family)
     values ('pgtap_rsa_vic2', 'pgTAP RSA (Victoria), new', 'VIC', 'pgTAP RSA') $$,
  'an archived version makes way for a new one'
);

select throws_ok(
  $$ insert into public.credential_types (code, name, family)
     values ('pgtap_family_only', 'No state', 'pgTAP RSA') $$,
  '23514',
  null,
  'a ticket with state versions says which state it''s from'
);

select throws_ok(
  $$ insert into public.credential_types (code, name, state)
     values ('pgtap_nowhere', 'Nowhere', 'XX') $$,
  '23514',
  null,
  'only Australian states and territories issue tickets'
);

select * from finish();
rollback;
