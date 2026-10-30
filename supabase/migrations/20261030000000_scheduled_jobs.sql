-- Scheduled jobs. Supabase's scheduler (pg_cron) calls the app's
-- /api/cron/<job> routes over HTTPS (pg_net), sending the CRON_SECRET.
--
-- Where to call and the secret live in Vault, put there by the database
-- deploy workflow with set_scheduled_job_target(). Without them (on a
-- laptop or in CI) the jobs still run on time but do nothing.
--
-- Times are UTC. Sydney is 10 or 11 hours ahead.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Saves where the jobs call and the secret they send, replacing any earlier
-- values. Only the deploy workflow runs this (as postgres); API roles can't.
create function public.set_scheduled_job_target(p_site_url text, p_cron_secret text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(p_site_url, '') !~ '^https?://[^/]+$' then
    raise exception 'The site address should look like https://example.com (no path)';
  end if;
  if length(coalesce(p_cron_secret, '')) < 16 then
    raise exception 'The CRON_SECRET should be a long random string';
  end if;

  perform vault.update_secret(id, p_site_url)
    from vault.secrets where name = 'scheduled_jobs_site_url';
  if not found then
    perform vault.create_secret(p_site_url, 'scheduled_jobs_site_url',
      'Where the scheduled jobs call: the live site');
  end if;

  perform vault.update_secret(id, p_cron_secret)
    from vault.secrets where name = 'scheduled_jobs_cron_secret';
  if not found then
    perform vault.create_secret(p_cron_secret, 'scheduled_jobs_cron_secret',
      'The CRON_SECRET the scheduled jobs send');
  end if;
end;
$$;

-- Asks the site to run one job. Returns pg_net's request id (the reply
-- lands in net._http_response), or null where no site is set.
create function public.call_scheduled_job(p_job text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_site text;
  v_secret text;
begin
  select decrypted_secret into v_site
    from vault.decrypted_secrets where name = 'scheduled_jobs_site_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'scheduled_jobs_cron_secret';
  if v_site is null or v_secret is null then
    return null;
  end if;

  return net.http_post(
    url := v_site || '/api/cron/' || p_job,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    -- Some jobs take a while; pg_net's default is 5 seconds.
    timeout_milliseconds := 60000
  );
end;
$$;

-- Every 10 minutes, spread out so they don't all start at once.
select cron.schedule('reminders', '*/10 * * * *',
  $$select public.call_scheduled_job('reminders')$$);
select cron.schedule('finish-shifts', '2-59/10 * * * *',
  $$select public.call_scheduled_job('finish-shifts')$$);
select cron.schedule('attendance', '4-59/10 * * * *',
  $$select public.call_scheduled_job('attendance')$$);
select cron.schedule('timesheets', '6-59/10 * * * *',
  $$select public.call_scheduled_job('timesheets')$$);
select cron.schedule('notifications', '8-59/10 * * * *',
  $$select public.call_scheduled_job('notifications')$$);

-- Hourly.
select cron.schedule('compliance', '15 * * * *',
  $$select public.call_scheduled_job('compliance')$$);

-- Early each morning in Sydney (05:05 to 08:05, depending on daylight
-- saving). The pay run only runs on the run day, once; the later calls
-- retry any invoice emails that didn't go.
select cron.schedule('pay-run', '5 19,20,21 * * *',
  $$select public.call_scheduled_job('pay-run')$$);

-- Keep a week of the scheduler's own run log.
select cron.schedule('tidy-scheduler-log', '30 17 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
