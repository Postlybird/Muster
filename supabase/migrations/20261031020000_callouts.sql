-- Call-outs (owner's go-ahead, 31/10/2026): for someone off sick or an
-- extra pair of hands. Every available, qualified worker who opted in hears
-- straight away (a text and an app notification, at any hour), and the
-- first to accept is booked. The owner set call-out pay at 20% more per
-- hour. If nobody has accepted after 20 minutes (a setting), the business
-- and our team are told. Open work starting soon can also become a
-- call-out, say after a worker cancels.

-- 20% more for the worker; the charge stays 20% more. Only where an admin
-- hasn't already changed it.
update public.settings
set value = '{"pay": 20, "bill": 20}'::jsonb
where key = 'urgent_loading_pct' and value = '{"pay": 10, "bill": 20}'::jsonb;

alter table public.jobs
  -- When posted work became a call-out (make_callout()); work posted as a
  -- call-out counts from posted_at.
  add column callout_started_at timestamptz,
  -- When we told the business and our team nobody had taken it.
  add column callout_alerted_at timestamptz;

-- Call-outs already posted don't set off the new alert.
update public.jobs set callout_alerted_at = now() where type = 'urgent' and status = 'posted';

-- How many workers were told about a call-out.
create function public.job_callout_reach(p_job_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.can_see_job(p_job_id) then (
    select count(distinct m.worker_id)::integer
    from public.shift_matches m
    join public.shifts s on s.id = m.shift_id
    where s.job_id = p_job_id and m.notified_at is not null
  ) end;
$$;

-- Turns posted work into a call-out: work starting within 48 hours that
-- still needs people, with no applicants waiting to be picked. The caller
-- then re-matches the job, which prices the open shifts with the call-out
-- loading and tells the workers. People already booked keep their terms.
create function public.make_callout(p_job_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_open integer;
begin
  select * into v_job from public.jobs j where j.id = p_job_id for update;
  if not found or not public.is_business_manager(v_job.business_id) then
    raise exception 'Only owners and managers make call-outs' using errcode = '42501';
  end if;
  if v_job.status <> 'posted' then
    raise exception 'Only posted work can become a call-out' using errcode = 'check_violation';
  end if;
  if v_job.type = 'urgent' then
    raise exception 'It''s already a call-out' using errcode = 'check_violation';
  end if;
  select count(*) into v_open
  from public.shifts s
  where s.job_id = p_job_id and s.status = 'open' and s.starts_at > now();
  if v_open = 0 then
    raise exception 'Every shift is filled or has started' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.shifts s
    where s.job_id = p_job_id and s.status = 'open' and s.starts_at > now() + interval '48 hours'
  ) then
    raise exception 'Call-outs are for work in the next 48 hours' using errcode = 'check_violation';
  end if;
  if exists (
    select 1
    from public.applications a
    join public.shifts s on s.id = a.shift_id
    where s.job_id = p_job_id and a.status = 'applied' and s.status = 'open'
  ) then
    raise exception 'Pick from your applicants first' using errcode = 'check_violation';
  end if;
  update public.jobs
  set type = 'urgent', fill_mode = 'auto', favourites_first_minutes = null,
      callout_started_at = now(), callout_alerted_at = null
  where id = p_job_id;
  return v_open;
end;
$$;

-- Call-outs nobody has taken after the wait: marked so each is told once.
create function public.flag_unfilled_callouts()
returns table (job_id uuid, waited_minutes integer, reach integer)
language sql
volatile
security definer
set search_path = ''
as $$
  with due as (
    select j.id, coalesce(j.callout_started_at, j.posted_at) as started
    from public.jobs j
    where j.type = 'urgent' and j.status = 'posted' and j.callout_alerted_at is null
      and coalesce(j.callout_started_at, j.posted_at) <= now()
        - make_interval(mins => public.setting_numeric('callout_alert_minutes', 20)::integer)
      and exists (
        select 1 from public.shifts s
        where s.job_id = j.id and s.status = 'open' and s.starts_at > now()
      )
    for update of j skip locked
  )
  update public.jobs j
  set callout_alerted_at = now()
  from due
  where j.id = due.id
  returning j.id,
    floor(extract(epoch from now() - due.started) / 60)::integer,
    (
      select count(distinct m.worker_id)::integer
      from public.shift_matches m
      join public.shifts s on s.id = m.shift_id
      where s.job_id = j.id and m.notified_at is not null
    );
$$;

grant execute on function public.job_callout_reach(uuid), public.make_callout(uuid) to authenticated;
grant execute on function public.flag_unfilled_callouts() to service_role;

-- Checked every five minutes.
select cron.schedule('callouts', '1-59/5 * * * *', $$select public.call_scheduled_job('callouts')$$);
