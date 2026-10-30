-- Australia-wide: shift times show in the site's own time zone, so the
-- functions that list shifts and timesheets also return the site's state.
-- Each is dropped and created again because its columns change; the
-- bodies are otherwise as before.

drop function public.my_shifts(uuid);
drop function public.my_timesheets(uuid);
drop function public.business_timesheets(uuid, integer);
drop function public.admin_shift_board(timestamptz, timestamptz);

-- The shifts a worker has applied for or been booked on, with their pay.
create function public.my_shifts(p_job_id uuid default null)
returns table (
  shift_id uuid,
  job_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  break_minutes smallint,
  job_type public.job_type,
  category_name text,
  business_name text,
  suburb text,
  state text,
  application_status public.application_status,
  assignment_id uuid,
  assignment_status public.assignment_status,
  hourly_cents integer,
  estimate_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, j.id, s.starts_at, s.ends_at, s.break_minutes, j.type, c.name,
    coalesce(b.trading_name, b.legal_name), si.suburb, si.state, a.status, x.id, x.status,
    coalesce(r.pay_hourly_cents, p.hourly_cents), coalesce(r.estimate_pay_cents, p.estimate_cents)
  from public.applications a
  join public.shifts s on s.id = a.shift_id
  join public.jobs j on j.id = s.job_id
  join public.businesses b on b.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  left join public.shift_pay p on p.shift_id = s.id
  left join lateral (
    select x.id, x.status from public.assignments x
    where x.shift_id = s.id and x.worker_id = a.worker_id
    order by (x.status = 'confirmed') desc, x.created_at desc
    limit 1
  ) x on true
  left join public.assignment_rates r on r.assignment_id = x.id
  where a.worker_id = public.my_worker_id()
    and a.status <> 'withdrawn'
    and (p_job_id is null or j.id = p_job_id)
  order by s.starts_at;
$$;

-- A worker's timesheets, newest first, with the pay once it's worked out.
create function public.my_timesheets(p_id uuid default null)
returns table (
  timesheet_id uuid,
  job_id uuid,
  category_name text,
  business_name text,
  site_name text,
  state text,
  shift_starts_at timestamptz,
  shift_ends_at timestamptz,
  shift_break_minutes smallint,
  recorded_start timestamptz,
  recorded_finish timestamptz,
  start_at timestamptz,
  finish_at timestamptz,
  break_minutes smallint,
  status public.timesheet_status,
  approve_by timestamptz,
  adjusted_at timestamptz,
  business_note text,
  worker_note text,
  resolution text,
  resolved_at timestamptz,
  pay_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, t.job_id, c.name, coalesce(b.trading_name, b.legal_name), si.name, si.state,
    s.starts_at, s.ends_at, s.break_minutes,
    t.recorded_start, t.recorded_finish, t.start_at, t.finish_at, t.break_minutes,
    t.status, t.approve_by, t.adjusted_at, t.business_note, t.worker_note,
    t.resolution, t.resolved_at,
    case
      when t.status in ('approved', 'auto_approved', 'adjusted')
        and (k.start_at, k.finish_at, k.break_minutes) = (t.start_at, t.finish_at, t.break_minutes)
      then k.pay_cents
    end
  from public.timesheets t
  join public.assignments x on x.id = t.assignment_id
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = t.job_id
  join public.businesses b on b.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  left join public.timesheet_costs k on k.timesheet_id = t.id
  where t.worker_id = public.my_worker_id()
    and (p_id is null or t.id = p_id)
  order by s.starts_at desc;
$$;

-- The business's hours: every booking on shifts that have started in the
-- last p_days days (and anything still waiting on them or our team), with
-- what was recorded, the timesheet if there is one, and the charge
-- excluding GST once it's worked out.
create function public.business_timesheets(p_job_id uuid default null, p_days integer default 56)
returns table (
  assignment_id uuid,
  timesheet_id uuid,
  job_id uuid,
  worker_id uuid,
  worker_name text,
  category_name text,
  site_name text,
  state text,
  shift_starts_at timestamptz,
  shift_ends_at timestamptz,
  shift_break_minutes smallint,
  -- The clock-in, or else the arrival the business confirmed.
  started_at timestamptz,
  arrival_confirmed boolean,
  clocked_out_at timestamptz,
  -- Clocked in or out away from the site, with their reasons.
  away_reasons text[],
  -- Sent later, without signal.
  offline boolean,
  recorded_start timestamptz,
  recorded_finish timestamptz,
  start_at timestamptz,
  finish_at timestamptz,
  break_minutes smallint,
  status public.timesheet_status,
  approve_by timestamptz,
  adjusted_at timestamptz,
  business_note text,
  worker_note text,
  resolution text,
  bill_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    x.id, t.id, j.id, w.id,
    coalesce(w.preferred_name, w.legal_first_name) || ' ' || coalesce(w.legal_last_name, ''),
    c.name, si.name, si.state, s.starts_at, s.ends_at, s.break_minutes,
    a.started_at, a.arrival_confirmed, a.clocked_out_at, a.away_reasons, a.offline,
    t.recorded_start, t.recorded_finish, t.start_at, t.finish_at, t.break_minutes,
    t.status, t.approve_by, t.adjusted_at, t.business_note, t.worker_note, t.resolution,
    case
      when t.status in ('approved', 'auto_approved', 'adjusted')
        and (k.start_at, k.finish_at, k.break_minutes) = (t.start_at, t.finish_at, t.break_minutes)
      then k.bill_cents
    end
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  join public.workers w on w.id = x.worker_id
  left join public.timesheets t on t.assignment_id = x.id
  left join public.timesheet_costs k on k.timesheet_id = t.id
  left join lateral (
    select
      coalesce(
        min(e.occurred_at) filter (where e.kind = 'clock_in'),
        min(e.occurred_at) filter (where e.kind = 'arrival_confirmed')
      ) as started_at,
      bool_or(e.kind = 'arrival_confirmed') and not coalesce(bool_or(e.kind = 'clock_in'), false)
        as arrival_confirmed,
      min(e.occurred_at) filter (where e.kind = 'clock_out') as clocked_out_at,
      coalesce(
        array_agg(coalesce(e.reason, 'No reason given') order by e.occurred_at)
          filter (where e.inside_geofence is not true and e.kind in ('clock_in', 'clock_out')),
        '{}'
      ) as away_reasons,
      coalesce(bool_or(e.offline), false) as offline
    from public.attendance_events e
    where e.assignment_id = x.id
  ) a on true
  where x.status = 'confirmed'
    and s.starts_at <= now()
    and (
      s.starts_at > now() - make_interval(days => coalesce(p_days, 56))
      or t.status in ('submitted', 'disputed')
    )
    and (p_job_id is null or j.id = p_job_id)
    and public.can_see_job(j.id)
  order by s.starts_at desc, w.legal_last_name, w.legal_first_name;
$$;

-- The shift board (brief §6): posted shifts that haven't finished, with how
-- many workers are booked, applying and on site. Admins only.
create function public.admin_shift_board(p_from timestamptz, p_to timestamptz)
returns table (
  shift_id uuid,
  job_id uuid,
  business_id uuid,
  business_name text,
  site_name text,
  suburb text,
  state text,
  category_name text,
  job_type public.job_type,
  fill_mode public.fill_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  headcount smallint,
  booked integer,
  applicants integer,
  arrived integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, j.id, b.id, coalesce(b.trading_name, b.legal_name), si.name, si.suburb, si.state, c.name,
    j.type, j.fill_mode, s.starts_at, s.ends_at, s.headcount,
    (
      select count(*)::integer from public.assignments a
      where a.shift_id = s.id and a.status in ('confirmed', 'completed')
    ),
    (
      select count(*)::integer from public.applications ap
      where ap.shift_id = s.id and ap.status = 'applied'
    ),
    (
      select count(distinct a.id)::integer
      from public.assignments a
      join public.attendance_events e on e.assignment_id = a.id
      where a.shift_id = s.id and a.status in ('confirmed', 'completed')
        and e.kind in ('clock_in', 'arrival_confirmed')
    )
  from public.shifts s
  join public.jobs j on j.id = s.job_id
  join public.businesses b on b.id = j.business_id
  left join public.sites si on si.id = j.site_id
  left join public.categories c on c.id = j.category_id
  where (select public.is_admin())
    and j.status = 'posted'
    and s.status in ('open', 'filled')
    and s.ends_at > p_from
    and s.starts_at < p_to
  order by s.starts_at, s.id;
$$;

grant execute on function public.my_shifts(uuid), public.my_timesheets(uuid),
  public.business_timesheets(uuid, integer),
  public.admin_shift_board(timestamptz, timestamptz)
to authenticated;
