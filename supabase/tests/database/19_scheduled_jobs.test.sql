-- Scheduled jobs: pg_cron calls the site's /api/cron/<job> routes through
-- pg_net, with the site address and CRON_SECRET kept in Vault. Requests
-- queued here are rolled back, so nothing is sent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

select set_eq(
  $$ select jobname || ' ' || schedule from cron.job $$,
  array[
    'reminders */10 * * * *',
    'finish-shifts 2-59/10 * * * *',
    'attendance 4-59/10 * * * *',
    'timesheets 6-59/10 * * * *',
    'notifications 8-59/10 * * * *',
    'compliance 15 * * * *',
    'callouts 1-59/5 * * * *',
    'pay-run 5 19,20,21 * * *',
    'tidy-scheduler-log 30 17 * * *'
  ],
  'every job is on its schedule'
);

select is(
  (select count(*)::int from cron.job
    where jobname <> 'tidy-scheduler-log'
      and command <> format('select public.call_scheduled_job(%L)', jobname)),
  0,
  'each job calls the route of the same name'
);

-- Clear any target a developer set locally, for this test only.
delete from vault.secrets where name like 'scheduled_jobs_%';

select is(
  public.call_scheduled_job('reminders'),
  null,
  'with no site set, a job does nothing'
);

select throws_ok(
  $$ select public.set_scheduled_job_target('https://example.test/api', 'a-long-enough-secret') $$,
  'P0001',
  'The site address should look like https://example.com (no path)',
  'the site address is just the address'
);

select throws_ok(
  $$ select public.set_scheduled_job_target('https://example.test', 'short') $$,
  'P0001',
  'The CRON_SECRET should be a long random string',
  'a short secret is refused'
);

select public.set_scheduled_job_target('https://old.example.test', 'first-secret-0123456789');
select public.set_scheduled_job_target('https://example.test', 'second-secret-0123456789');

select is(
  (select array_agg(name || '=' || decrypted_secret order by name)
     from vault.decrypted_secrets where name like 'scheduled_jobs_%'),
  array[
    'scheduled_jobs_cron_secret=second-secret-0123456789',
    'scheduled_jobs_site_url=https://example.test'
  ],
  'setting the target again replaces it'
);

select ok(
  public.call_scheduled_job('reminders') is not null,
  'with a site set, a job asks the site to run it'
);

select is(
  (select url from net.http_request_queue order by id desc limit 1),
  'https://example.test/api/cron/reminders',
  'it calls the job''s route on the site'
);

select is(
  (select headers ->> 'Authorization' from net.http_request_queue order by id desc limit 1),
  'Bearer second-secret-0123456789',
  'it sends the CRON_SECRET'
);

select ok(
  not has_function_privilege('authenticated', 'public.call_scheduled_job(text)', 'execute')
    and not has_function_privilege('service_role', 'public.call_scheduled_job(text)', 'execute'),
  'API roles cannot start a job'
);

select ok(
  not has_function_privilege('authenticated', 'public.set_scheduled_job_target(text, text)', 'execute')
    and not has_function_privilege('service_role', 'public.set_scheduled_job_target(text, text)', 'execute'),
  'API roles cannot change where jobs call'
);

select * from finish();
rollback;
