-- Open states: work is taken only where we've opened, and where a licence
-- is needed, only while we hold a current one. Visitors can see which
-- states are open.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.jurisdictions (code, name, licence_required) values
  ('NSW', 'New South Wales', false),
  ('WA', 'Western Australia', false),
  ('VIC', 'Victoria', true)
on conflict (code) do nothing;
update public.jurisdictions set open_for_work = (code = 'NSW'), licence_required = (code = 'VIC')
where code in ('NSW', 'WA', 'VIC');
update public.licences set archived_at = now() where jurisdiction = 'VIC';

select ok(not public.state_blocked('NSW'), 'an open state without a licence scheme takes work');
select ok(public.state_blocked('WA'), 'a state we haven''t opened is blocked');

update public.jurisdictions set open_for_work = true where code = 'VIC';
select ok(public.state_blocked('VIC'), 'an open state still needs its labour hire licence');

insert into public.licences (jurisdiction, licence_number, holder_name, status)
values ('VIC', 'PGTAP-VIC-1', 'pgTAP Pty Ltd', 'active');
select ok(not public.state_blocked('VIC'), 'with a current licence, an open state takes work');

-- Visitors
set local role anon;

select is(
  (select open_for_work from public.jurisdictions where code = 'NSW'),
  true,
  'visitors can see which states are open'
);

select throws_ok(
  $$ select notes from public.jurisdictions where code = 'NSW' $$,
  '42501',
  null,
  'visitors cannot read our notes on a state'
);

select throws_ok(
  $$ update public.jurisdictions set open_for_work = true where code = 'WA' $$,
  '42501',
  null,
  'visitors cannot open a state'
);

select * from finish();
rollback;
