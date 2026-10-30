-- Industries: public to read (active ones), and only admins change them.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('20111111-1111-1111-1111-111111111111', 'industry.worker@pgtap.test'),
  ('20444444-4444-4444-4444-444444444444', 'industry.admin@pgtap.test');
update public.profiles set role = 'admin' where id = '20444444-4444-4444-4444-444444444444';

insert into public.industries (id, code, name, active) values
  ('20aaaaaa-0000-0000-0000-000000000001', 'pgtap_live', 'pgTAP live industry', true),
  ('20aaaaaa-0000-0000-0000-000000000002', 'pgtap_hidden', 'pgTAP hidden industry', false);
insert into public.categories (code, name, industry_id)
values ('pgtap_industry_work', 'pgTAP work', '20aaaaaa-0000-0000-0000-000000000001');

-- Visitors
set local role anon;

select is(
  (select array_agg(code order by code) from public.industries where code like 'pgtap_%'),
  array['pgtap_live'],
  'visitors see active industries only'
);

select is(
  (select i.name from public.categories c join public.industries i on i.id = c.industry_id
    where c.code = 'pgtap_industry_work'),
  'pgTAP live industry',
  'visitors can see which industry a work type is in'
);

select throws_ok(
  $$ insert into public.industries (code, name) values ('pgtap_anon', 'Anon') $$,
  '42501',
  null,
  'visitors cannot add an industry'
);

-- Worker
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.industries (code, name) values ('pgtap_worker', 'Worker') $$,
  '42501',
  null,
  'a worker cannot add an industry'
);

update public.industries set name = 'Renamed' where code = 'pgtap_live';
select is(
  (select name from public.industries where code = 'pgtap_live'),
  'pgTAP live industry',
  'a worker cannot rename an industry'
);

-- Admin
select set_config('request.jwt.claims', '{"sub": "20444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select lives_ok(
  $$ insert into public.industries (code, name, icon) values ('pgtap_admin', 'Admin industry', 'utensils') $$,
  'an admin can add an industry'
);

select lives_ok(
  $$ update public.categories set industry_id = '20aaaaaa-0000-0000-0000-000000000002'
     where code = 'pgtap_industry_work' $$,
  'an admin can move a work type to another industry'
);

select throws_ok(
  $$ insert into public.industries (code, name, icon) values ('pgtap_bad_icon', 'Bad', 'Not An Icon') $$,
  '23514',
  null,
  'icon names are lower-case words'
);

select * from finish();
rollback;
