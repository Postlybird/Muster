-- A work type's long service levy (owner, 14/11/2026): a percent of
-- ordinary wages, priced in like super. None unless an admin sets it, and
-- never more than 10%.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into public.categories (id, code, name) values
  ('e8111111-0000-0000-0000-000000000001', 'pgtap_levy_labourer', 'PGTAP labourer');

select is(
  (select long_service_levy_pct from public.categories
   where id = 'e8111111-0000-0000-0000-000000000001'),
  0::numeric,
  'a work type has no levy unless one is set'
);

update public.categories set long_service_levy_pct = 1
where id = 'e8111111-0000-0000-0000-000000000001';
select is(
  (select long_service_levy_pct from public.categories
   where id = 'e8111111-0000-0000-0000-000000000001'),
  1::numeric,
  'an admin sets one, like the 1% for contract cleaning'
);

select throws_ok(
  $$ update public.categories set long_service_levy_pct = 10.5
     where id = 'e8111111-0000-0000-0000-000000000001' $$,
  '23514', null, 'a levy over 10% is refused'
);
select throws_ok(
  $$ update public.categories set long_service_levy_pct = -1
     where id = 'e8111111-0000-0000-0000-000000000001' $$,
  '23514', null, 'and so is a negative one'
);

select * from finish();
rollback;
