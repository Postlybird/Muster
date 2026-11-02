-- Overtime across a worker's shifts (owner, 02/11/2026). We employ every
-- worker for every shift, so their hours with us add up: past the daily
-- limit (the shift's rate card, or the daily_overtime_after_hours setting)
-- or the weekly one (weekly_overtime_after_hours, 38, Monday to Sunday),
-- hours are overtime. They're added up in the order the shifts were booked,
-- so the business whose booking takes a worker past a limit pays the
-- overtime, and is told beforehand: it sees it on each applicant when it
-- picks, and for shifts workers take themselves (first in, call-outs) it
-- decides when posting whether workers on overtime may take them.
-- The pay engine does the sums (src/domain/overtime.ts, splitShift());
-- book_worker() makes the same check when a worker takes a shift.

alter table public.jobs
  add column allow_overtime boolean not null default false;

comment on column public.jobs.allow_overtime is
  'Whether workers whose other shifts with us would put a shift into overtime may take it themselves (first in, call-outs). The business pays that overtime.';

-- A state's time zone, as STATE_TIME_ZONES in src/domain/pay.ts.
create function public.state_time_zone(p_state text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_state
    when 'VIC' then 'Australia/Melbourne'
    when 'QLD' then 'Australia/Brisbane'
    when 'SA' then 'Australia/Adelaide'
    when 'WA' then 'Australia/Perth'
    when 'TAS' then 'Australia/Hobart'
    when 'NT' then 'Australia/Darwin'
    else 'Australia/Sydney'
  end;
$$;

-- Workers' bookings that start between two times: when each was booked, the
-- site's local date, and the minutes worked (the timesheet's once there is
-- one, else the roster). Cancelled bookings and no-shows don't count.
create function public.worker_booked_minutes(
  p_worker_ids uuid[],
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  worker_id uuid,
  assignment_id uuid,
  shift_id uuid,
  booked_at timestamptz,
  day date,
  minutes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    x.worker_id, x.id, x.shift_id, x.created_at,
    (sh.starts_at at time zone public.state_time_zone(si.state))::date,
    greatest(0, coalesce(
      round(extract(epoch from (t.finish_at - t.start_at)) / 60)::integer - t.break_minutes,
      round(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes
    ))
  from public.assignments x
  join public.shifts sh on sh.id = x.shift_id
  join public.jobs j on j.id = sh.job_id
  join public.sites si on si.id = j.site_id
  left join public.timesheets t on t.assignment_id = x.id
  where x.worker_id = any (p_worker_ids)
    and x.status in ('confirmed', 'completed')
    and sh.starts_at >= p_from
    and sh.starts_at < p_to;
$$;

-- Whether a worker's other shifts that day or week would put some of this
-- shift into overtime that it wouldn't have on its own (each day counts
-- towards the week up to the daily limit). overtimeFromOtherShifts() in
-- src/domain/overtime.ts is the same check.
create function public.overtime_from_other_shifts(p_worker_id uuid, p_shift_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t record;
  v_week date;
  v_day_minutes integer;
  v_week_ordinary integer;
  v_week_after integer;
begin
  select
    sh.id,
    (sh.starts_at at time zone public.state_time_zone(si.state))::date as day,
    greatest(0, round(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer
      - sh.break_minutes) as minutes,
    coalesce(
      (p.cost_rules #>> '{card,award,overtimeAfterMinutes}')::integer,
      round(public.setting_numeric('daily_overtime_after_hours', 7.6) * 60)::integer
    ) as daily_limit
    into t
  from public.shifts sh
  join public.jobs j on j.id = sh.job_id
  join public.sites si on si.id = j.site_id
  left join public.shift_pay p on p.shift_id = sh.id
  where sh.id = p_shift_id;
  if not found then
    return false;
  end if;

  v_week := date_trunc('week', t.day)::date;
  select
    coalesce(sum(d.minutes) filter (where d.day = t.day), 0),
    coalesce(sum(least(d.minutes, t.daily_limit)), 0)
    into v_day_minutes, v_week_ordinary
  from (
    select b.day, sum(b.minutes)::integer as minutes
    from public.worker_booked_minutes(
      array[p_worker_id], (v_week - 1)::timestamptz, (v_week + 8)::timestamptz
    ) b
    where b.shift_id <> t.id and date_trunc('week', b.day)::date = v_week
    group by b.day
  ) d;

  v_week_after := v_week_ordinary - least(v_day_minutes, t.daily_limit)
    + least(v_day_minutes + t.minutes, t.daily_limit);
  return (v_day_minutes > 0 and v_day_minutes + t.minutes > t.daily_limit)
    or v_week_after > round(public.setting_numeric('weekly_overtime_after_hours', 38) * 60);
end;
$$;

-- Booking, as before, and a worker taking a shift themselves can't go into
-- overtime because of their other shifts unless the business allowed it.
create or replace function public.book_worker(
  p_shift_id uuid,
  p_worker_id uuid,
  -- Workers can only take shifts they can see; the business can pick an
  -- applicant at any time.
  p_check_visible boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_assignment uuid;
  v_booked integer;
begin
  select sh.id, sh.starts_at, sh.ends_at, sh.headcount, sh.status, j.business_id,
    j.status as job_status, j.allow_overtime, b.status as business_status
    into s
  from public.shifts sh
  join public.jobs j on j.id = sh.job_id
  join public.businesses b on b.id = j.business_id
  where sh.id = p_shift_id
  for update of sh;

  if not found or s.job_status <> 'posted' or s.business_status <> 'approved'
    or s.starts_at <= now() or s.status not in ('open', 'filled') then
    return 'closed';
  end if;
  if exists (
    select 1 from public.assignments x
    where x.shift_id = p_shift_id and x.worker_id = p_worker_id and x.status = 'confirmed'
  ) then
    return 'already_booked';
  end if;
  if s.status = 'filled' then
    return 'full';
  end if;
  if not exists (
    select 1
    from public.shift_matches m
    join public.workers w on w.id = m.worker_id
    where m.shift_id = p_shift_id and m.worker_id = p_worker_id and m.eligible
      and w.status = 'active' and w.archived_at is null
      and (not p_check_visible or m.visible_from <= now())
  ) or exists (
    select 1 from public.blocks bl
    where bl.business_id = s.business_id and bl.worker_id = p_worker_id
      and bl.archived_at is null
  ) then
    return 'not_eligible';
  end if;
  if exists (
    select 1
    from public.assignments x
    join public.shifts o on o.id = x.shift_id
    where x.worker_id = p_worker_id and x.status = 'confirmed'
      and o.starts_at < s.ends_at and o.ends_at > s.starts_at
  ) then
    return 'clash';
  end if;
  if not exists (
    select 1 from public.shift_pay p where p.shift_id = p_shift_id and p.cost_rules is not null
  ) then
    return 'not_ready';
  end if;
  if p_check_visible and not s.allow_overtime
    and public.overtime_from_other_shifts(p_worker_id, p_shift_id) then
    return 'overtime';
  end if;

  -- A reminder that would go out straight away is redundant: they've just
  -- booked.
  insert into public.assignments (
    shift_id, worker_id, confirmed_by, reminded_day_before_at, reminded_soon_at
  )
  values (
    p_shift_id, p_worker_id, (select auth.uid()),
    case when s.starts_at <= now() + interval '24 hours' then now() end,
    case when s.starts_at <= now() + interval '2 hours' then now() end
  )
  returning id into v_assignment;

  insert into public.assignment_rates (
    assignment_id, rate_card_id, bill_rate_rule_id, cost_rules, pay_hourly_cents,
    bill_hourly_cents, estimate_pay_cents, estimate_bill_cents, estimate_margin_cents
  )
  select v_assignment, p.rate_card_id, p.bill_rate_rule_id, p.cost_rules, p.hourly_cents,
    p.bill_hourly_cents, p.estimate_cents, p.estimate_bill_cents, p.estimate_margin_cents
  from public.shift_pay p
  where p.shift_id = p_shift_id;

  insert into public.applications (shift_id, worker_id, status, decided_at)
  values (p_shift_id, p_worker_id, 'booked', now())
  on conflict (shift_id, worker_id) do update set status = 'booked', decided_at = now();

  select count(*) into v_booked
  from public.assignments x
  where x.shift_id = p_shift_id and x.status = 'confirmed';
  if v_booked >= s.headcount then
    update public.shifts set status = 'filled' where id = p_shift_id;
    -- Everyone else waiting on it hears it's gone.
    update public.applications set status = 'declined', decided_at = now()
    where shift_id = p_shift_id and status = 'applied';
  end if;
  return 'booked';
end;
$$;

-- "Post again" and templates keep the choice.
create or replace function public.duplicate_job(p_job_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_new uuid;
begin
  insert into public.jobs (
    business_id, site_id, category_id, type, headcount, fill_mode, favourites_first_minutes,
    police_check_required, instructions, report_to_name, report_to_phone, no_known_hazards,
    hazard_notes, hazard_controls, induction, ppe_supplied_by, ppe_notes, copied_from, steps,
    allow_overtime
  )
  select
    j.business_id,
    case when exists (
      select 1 from public.sites s where s.id = j.site_id and s.archived_at is null
    ) then j.site_id end,
    case when exists (
      select 1 from public.categories c
      where c.id = j.category_id and c.active and c.archived_at is null
    ) then j.category_id end,
    j.type, j.headcount, j.fill_mode, j.favourites_first_minutes, j.police_check_required,
    j.instructions, j.report_to_name, j.report_to_phone, j.no_known_hazards, j.hazard_notes,
    j.hazard_controls, j.induction, j.ppe_supplied_by, j.ppe_notes, j.id,
    array['what', 'needs', 'safety'], j.allow_overtime
  from public.jobs j
  where j.id = p_job_id
  returning id into v_new;

  if v_new is null then
    raise exception 'That job no longer exists' using errcode = 'no_data_found';
  end if;

  insert into public.job_credentials (job_id, credential_type_id)
  select v_new, credential_type_id from public.job_credentials where job_id = p_job_id;
  insert into public.job_hazards (job_id, hazard_id)
  select v_new, hazard_id from public.job_hazards where job_id = p_job_id;
  insert into public.job_ppe (job_id, ppe_item_id)
  select v_new, ppe_item_id from public.job_ppe where job_id = p_job_id;
  return v_new;
end;
$$;

revoke execute on function public.state_time_zone(text),
  public.worker_booked_minutes(uuid[], timestamptz, timestamptz),
  public.overtime_from_other_shifts(uuid, uuid) from public, anon;
grant execute on function public.state_time_zone(text) to authenticated, service_role;
-- The pay engine reads hours through the server; nobody signed in calls these.
grant execute on function public.worker_booked_minutes(uuid[], timestamptz, timestamptz),
  public.overtime_from_other_shifts(uuid, uuid) to service_role;
