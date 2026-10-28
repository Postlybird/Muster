-- Notifications: people read only their own messages and mark them read;
-- admins can see any; nobody writes them but the server. Each device's
-- push subscription belongs to whoever saved it last. Only admins change
-- message templates.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', now(), '{}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.notifications (id, profile_id, template, title, body, message, channels, dedupe_key) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'booked',
   'You''re booked', 'You''re booked: PGTAP', 'You''re booked: PGTAP', '{sms}', 'pgtap:a:1'),
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'activated',
   'You''re ready to work', 'You''re verified', 'You''re verified', '{sms}', null),
  ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'booked',
   'You''re booked', 'You''re booked: PGTAP', 'You''re booked: PGTAP', '{push}', null);

select throws_ok(
  $$ insert into public.notifications (profile_id, template, title, body, message, dedupe_key)
     values ('11111111-1111-1111-1111-111111111111', 'booked', 't', 'b', 'm', 'pgtap:a:1') $$,
  '23505', null, 'each event is sent once'
);
select throws_ok(
  $$ insert into public.notifications (profile_id, template, title, body, message, channels)
     values ('11111111-1111-1111-1111-111111111111', 'booked', 't', 'b', 'm', '{fax}') $$,
  '23514', null, 'only push, texts and email'
);

set local role authenticated;

-- Worker A
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select id from public.notifications order by id $$,
  $$ values ('a1111111-0000-0000-0000-000000000001'::uuid), ('a1111111-0000-0000-0000-000000000002'::uuid) $$,
  'people see their own messages'
);
select throws_ok(
  $$ insert into public.notifications (profile_id, template, title, body, message)
     values ('11111111-1111-1111-1111-111111111111', 'booked', 't', 'b', 'm') $$,
  '42501', null, 'but can''t write them'
);
select lives_ok(
  $$ select public.mark_notifications_read(array['a1111111-0000-0000-0000-000000000001'::uuid,
       'a2222222-0000-0000-0000-000000000001'::uuid]) $$,
  'they mark messages read'
);
select results_eq(
  $$ select id from public.notifications where read_at is not null $$,
  $$ values ('a1111111-0000-0000-0000-000000000001'::uuid) $$,
  'only their own'
);
select lives_ok(
  $$ select public.save_push_subscription('https://push.example/device-1', 'p256dh-key', 'auth-key', 'Test phone') $$,
  'they turn on push for a device'
);
select results_eq(
  $$ select endpoint, profile_id from public.push_subscriptions $$,
  $$ values ('https://push.example/device-1', '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'which is theirs'
);
select throws_ok(
  $$ insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
     values ('11111111-1111-1111-1111-111111111111', 'https://push.example/x', 'k', 'a') $$,
  '42501', null, 'only through the function'
);
select is_empty($$ select * from public.notification_templates $$, 'workers don''t see templates');
select throws_ok(
  $$ insert into public.notification_templates (key, title, body) values ('booked', 'Hi', 'Hi') $$,
  '42501', null, 'or change them'
);

-- Worker B uses the same phone.
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_push_subscription('https://push.example/device-1', 'p256dh-key-2', 'auth-key-2') $$,
  'a device someone else used'
);
select results_eq(
  $$ select profile_id from public.push_subscriptions where endpoint = 'https://push.example/device-1' $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'moves to whoever turned push on last'
);

-- The admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select ok(
  (select count(*) from public.notifications where id::text like 'a%-0000-0000-0000-00000000000%') = 3,
  'admins see anyone''s messages'
);
select lives_ok(
  $$ insert into public.notification_templates (key, title, body)
     values ('booked', 'Booked!', 'You''re booked: {{work}} {{link}}') $$,
  'admins change a template'
);
select lives_ok(
  $$ delete from public.notification_templates where key = 'booked' $$,
  'and put it back as it was'
);

select finish();
rollback;
