-- Settings visibility, the append-only audit log and the demo outbox.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'worker@pgtap.test'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.settings (key, value, is_public, description) values
  ('test_geofence_radius_m', '200', true, 'public test setting'),
  ('test_margin_pct', '18', false, 'private test setting');

-- Worker
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select key from public.settings where key like 'test_%' order by key $$,
  array['test_geofence_radius_m'],
  'a worker sees public settings only (not margin)'
);

select throws_ok(
  $$ insert into public.settings (key, value) values ('test_sneaky', '1') $$,
  '42501',
  null,
  'a worker cannot add settings'
);

select is_empty(
  $$ update public.settings set value = '0' where key = 'test_geofence_radius_m' returning key $$,
  'a worker cannot change settings'
);

select is_empty(
  'select id from public.audit_log',
  'a worker cannot read the audit log'
);

select throws_ok(
  'select id from public.dev_outbox',
  '42501',
  null,
  'a worker cannot read the demo outbox'
);

select lives_ok(
  $$ select public.log_access_event('view', 'profiles', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111') $$,
  'signed-in users can record an access event'
);

-- Admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select is(
  (select count(*)::int from public.settings where key like 'test_%'),
  2,
  'an admin sees every setting'
);

select lives_ok(
  $$ update public.settings set value = '250' where key = 'test_geofence_radius_m' $$,
  'an admin can change a setting'
);

select is(
  (select actor_id from public.audit_log
    where table_name = 'settings' and record_id = 'test_geofence_radius_m' and action = 'update'),
  '44444444-4444-4444-4444-444444444444'::uuid,
  'setting changes are audited with the admin as actor'
);

select is(
  (select actor_id from public.audit_log where action = 'view' and table_name = 'profiles'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'access events record the caller as actor'
);

reset role;

select throws_ok(
  $$ update public.audit_log set action = 'tampered' $$,
  '42501',
  null,
  'audit entries cannot be edited, even by the database owner'
);

select throws_ok(
  $$ delete from public.audit_log $$,
  '42501',
  null,
  'audit entries cannot be deleted, even by the database owner'
);

select * from finish();
rollback;
