-- Timesheets (brief §4.6): made when a worker clocks out (or, with no
-- clock-out, an hour after the shift), then approved, changed or queried by
-- the business within a window (a setting), otherwise approved
-- automatically. Queries go to our team with both sides' notes. Approved
-- hours are costed by the server from the rates kept on the booking
-- (brief §4.8), and kept for seven years like all employment records.

create type public.timesheet_status as enum (
  -- Waiting for the business.
  'submitted',
  'approved',
  -- Nobody at the business approved or queried it in time.
  'auto_approved',
  -- Approved with hours the business changed or entered.
  'adjusted',
  -- With our team.
  'disputed',
  -- Not paid or billed: our team found the hours weren't worked.
  'rejected'
);

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments (id),
  worker_id uuid not null references public.workers (id),
  job_id uuid not null references public.jobs (id),
  -- What was recorded: the clock-in (or the arrival the business
  -- confirmed) and the clock-out. Missing when there's no clock-out yet, or
  -- the business entered the hours.
  recorded_start timestamptz,
  recorded_finish timestamptz,
  -- What's paid and billed.
  start_at timestamptz not null,
  finish_at timestamptz not null,
  break_minutes smallint not null default 0,
  status public.timesheet_status not null default 'submitted',
  -- Approve, change or query it by then, or it approves itself.
  approve_by timestamptz not null,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  -- The business changed the hours, or entered them.
  adjusted_by uuid references public.profiles (id),
  adjusted_at timestamptz,
  business_note text check (char_length(business_note) <= 1000),
  worker_note text check (char_length(worker_note) <= 1000),
  disputed_by uuid references public.profiles (id),
  disputed_at timestamptz,
  -- Our team's answer to a query.
  resolution text check (char_length(resolution) <= 1000),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  -- Whoever posted the job has been told the hours are ready to approve.
  business_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finish_at >= start_at and finish_at - start_at <= interval '36 hours'),
  check (
    break_minutes between 0 and 240
    and (break_minutes = 0 or make_interval(mins => break_minutes) < finish_at - start_at)
  )
);

create index timesheets_waiting_idx on public.timesheets (approve_by) where status = 'submitted';
create index timesheets_job_idx on public.timesheets (job_id);
create index timesheets_worker_idx on public.timesheets (worker_id, start_at);

create trigger timesheets_set_updated_at before update on public.timesheets
  for each row execute function public.set_updated_at();
create trigger timesheets_audit after insert or update on public.timesheets
  for each row execute function public.audit_row_change('worker_id');

-- What approved hours cost (brief §4.8), worked out by the server with the
-- pay engine (splitShift() and costShift()) from the booking's rates.
-- Admin only: workers see their pay, and businesses their charge, through
-- functions.
create table public.timesheet_costs (
  timesheet_id uuid primary key references public.timesheets (id),
  -- The hours that were costed. When a timesheet's hours change, it's
  -- costed again.
  start_at timestamptz not null,
  finish_at timestamptz not null,
  break_minutes smallint not null,
  minutes_by_type jsonb not null,
  -- The whole calculation (src/domain/pay.ts ShiftCost): a line per rate
  -- type, any minimum engagement top-up and urgent loading.
  cost jsonb not null,
  paid_minutes integer not null,
  -- Including allowances.
  pay_cents integer not null,
  on_cost_cents integer not null,
  -- Excluding GST.
  bill_cents integer not null,
  margin_cents integer not null,
  costed_at timestamptz not null default now()
);

-- Queries are listed for admins with the other matters to look at.
alter table public.admin_flags drop constraint admin_flags_kind_check;
alter table public.admin_flags add constraint admin_flags_kind_check check (
  kind in (
    'no_show', 'suspension', 'possible_no_show', 'outside_site', 'safety', 'work_limit',
    'timesheet_dispute'
  )
);

-- ---------------------------------------------------------------------------
-- Recording the hours
-- ---------------------------------------------------------------------------

-- The rostered unpaid break, unless they worked no longer than it.
create function public.timesheet_break(p_start timestamptz, p_finish timestamptz, p_rostered integer)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select (case when p_finish - p_start > make_interval(mins => p_rostered) then p_rostered else 0 end)::smallint;
$$;

-- Makes a booking's timesheet from its attendance: the clock-in (or else
-- the arrival the business confirmed) to the clock-out. With no clock-out
-- yet, the rostered finish is used, and a clock-out that arrives later
-- fills it in while the business hasn't looked at it. Paid time starts at
-- the rostered start even if they clocked in early. Without a clock-in or
-- arrival nothing happens: the business enters those hours.
create function public.record_timesheet(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  t record;
  v_in timestamptz;
  v_out timestamptz;
  v_start timestamptz;
  v_finish timestamptz;
  v_id uuid;
begin
  select x.id, x.worker_id, x.status, s.job_id, s.starts_at, s.ends_at, s.break_minutes
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.id = p_assignment_id
  for update of x;
  if not found or b.status <> 'confirmed' then
    return null;
  end if;
  select
    coalesce(
      min(e.occurred_at) filter (where e.kind = 'clock_in'),
      min(e.occurred_at) filter (where e.kind = 'arrival_confirmed')
    ),
    min(e.occurred_at) filter (where e.kind = 'clock_out')
    into v_in, v_out
  from public.attendance_events e
  where e.assignment_id = b.id;
  if v_in is null then
    return null;
  end if;
  v_finish := greatest(coalesce(v_out, b.ends_at), v_in);
  v_start := least(greatest(v_in, b.starts_at), v_finish);

  select tt.id, tt.status, tt.recorded_finish into t
  from public.timesheets tt
  where tt.assignment_id = b.id
  for update;
  if not found then
    insert into public.timesheets (
      assignment_id, worker_id, job_id, recorded_start, recorded_finish, start_at, finish_at,
      break_minutes, approve_by
    ) values (
      b.id, b.worker_id, b.job_id, v_in, v_out, v_start, v_finish,
      public.timesheet_break(v_start, v_finish, b.break_minutes),
      now() + make_interval(hours => public.setting_numeric('auto_approve_hours', 48)::integer)
    )
    returning id into v_id;
    return v_id;
  end if;
  if v_out is not null and t.recorded_finish is null and t.status = 'submitted' then
    update public.timesheets
    set recorded_finish = v_out, start_at = v_start, finish_at = v_finish,
      break_minutes = public.timesheet_break(v_start, v_finish, b.break_minutes)
    where id = t.id;
  end if;
  return t.id;
end;
$$;

-- Once the hours are in, attendance can't be added, except a clock-out
-- completing a timesheet made from the roster.
create function public.check_attendance_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.timesheets t
    where t.assignment_id = new.assignment_id
      and not (new.kind = 'clock_out' and t.status = 'submitted' and t.recorded_finish is null)
  ) then
    raise exception 'The timesheet for this shift is already in' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create function public.timesheet_on_clock_out()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_timesheet(new.assignment_id);
  return null;
end;
$$;

create trigger attendance_events_open before insert on public.attendance_events
  for each row execute function public.check_attendance_open();
create trigger attendance_events_timesheet after insert on public.attendance_events
  for each row when (new.kind = 'clock_out') execute function public.timesheet_on_clock_out();

-- Bookings with a clock-in or arrival but no clock-out an hour after the
-- shift: their timesheet uses the rostered finish. Run on a schedule.
create function public.record_missing_timesheets()
returns table (timesheet_id uuid, worker_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  x record;
  v_id uuid;
begin
  for x in
    select a.id, a.worker_id
    from public.assignments a
    join public.shifts s on s.id = a.shift_id
    where a.status = 'confirmed'
      and s.ends_at <= now() - interval '1 hour'
      and not exists (select 1 from public.timesheets t where t.assignment_id = a.id)
      and exists (
        select 1 from public.attendance_events e
        where e.assignment_id = a.id and e.kind in ('clock_in', 'arrival_confirmed')
      )
    order by s.ends_at
  loop
    v_id := public.record_timesheet(x.id);
    if v_id is not null then
      timesheet_id := v_id;
      worker_id := x.worker_id;
      return next;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The business approves, changes or enters the hours, or queries them.
-- Owners, managers and the site's supervisors (brief §2), and our team.
-- ---------------------------------------------------------------------------

-- Approves timesheets waiting for the business, several at once (brief §7).
create function public.approve_timesheets(p_ids uuid[])
returns table (timesheet_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.timesheets t
  set status = 'approved', approved_by = (select auth.uid()), approved_at = now()
  where t.id = any (p_ids)
    and t.status = 'submitted'
    and (public.can_see_job(t.job_id) or public.is_admin())
  returning t.id;
$$;

-- Hours entered by the business or our team: worked on the shift's day,
-- and already over.
create function public.check_timesheet_hours(
  p_shift_start timestamptz,
  p_shift_end timestamptz,
  p_start timestamptz,
  p_finish timestamptz,
  p_break_minutes integer
)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_start is null or p_finish is null or p_break_minutes is null then
    raise exception 'Enter the start, finish and break' using errcode = 'check_violation';
  end if;
  if p_finish <= p_start then
    raise exception 'The finish must be after the start' using errcode = 'check_violation';
  end if;
  if p_finish - p_start > interval '16 hours' then
    raise exception 'That''s more than 16 hours. Check the times' using errcode = 'check_violation';
  end if;
  if p_start < p_shift_start - interval '4 hours' or p_start > p_shift_end then
    raise exception 'Check the start: it''s a long way from the rostered start' using errcode = 'check_violation';
  end if;
  if p_finish > now() + interval '30 minutes' then
    raise exception 'The finish can''t be in the future' using errcode = 'check_violation';
  end if;
  if p_break_minutes < 0 or p_break_minutes > 240
    or make_interval(mins => p_break_minutes) >= p_finish - p_start then
    raise exception 'The break must be shorter than the time worked' using errcode = 'check_violation';
  end if;
end;
$$;

-- Changes the hours and approves them in one step, with a note for the
-- worker (brief §4.6: supervisors adjust times and record breaks).
create function public.adjust_timesheet(
  p_id uuid,
  p_start timestamptz,
  p_finish timestamptz,
  p_break_minutes integer,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select tt.id, tt.status, tt.job_id, s.starts_at, s.ends_at
    into t
  from public.timesheets tt
  join public.assignments x on x.id = tt.assignment_id
  join public.shifts s on s.id = x.shift_id
  where tt.id = p_id
  for update of tt;
  if not found or not (public.can_see_job(t.job_id) or public.is_admin()) then
    raise exception 'That timesheet isn''t one of yours' using errcode = '42501';
  end if;
  if t.status <> 'submitted' then
    raise exception 'This timesheet has already been dealt with' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(p_note, '')) = '' then
    raise exception 'Say what changed, for the worker' using errcode = 'check_violation';
  end if;
  perform public.check_timesheet_hours(t.starts_at, t.ends_at, p_start, p_finish, p_break_minutes);
  update public.timesheets
  set start_at = p_start, finish_at = p_finish, break_minutes = p_break_minutes,
    business_note = btrim(p_note), status = 'adjusted',
    adjusted_by = (select auth.uid()), adjusted_at = now(),
    approved_by = (select auth.uid()), approved_at = now()
  where id = t.id;
end;
$$;

-- Hours for a booking without a timesheet, usually because they didn't
-- clock in: the business (or our team) says when they worked. Approved as
-- entered; the worker can query them.
create function public.add_timesheet(
  p_assignment_id uuid,
  p_start timestamptz,
  p_finish timestamptz,
  p_break_minutes integer,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  v_in timestamptz;
  v_out timestamptz;
  v_id uuid;
begin
  select x.id, x.worker_id, x.status, s.job_id, s.starts_at, s.ends_at
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.id = p_assignment_id
  for update of x;
  if not found or not (public.can_see_job(b.job_id) or public.is_admin()) then
    raise exception 'That booking isn''t one of yours' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'This booking isn''t active any more' using errcode = 'check_violation';
  end if;
  if b.starts_at > now() then
    raise exception 'The shift hasn''t started yet' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.timesheets t where t.assignment_id = b.id) then
    raise exception 'The timesheet for this shift is already in' using errcode = 'check_violation';
  end if;
  perform public.check_timesheet_hours(b.starts_at, b.ends_at, p_start, p_finish, p_break_minutes);
  select
    coalesce(
      min(e.occurred_at) filter (where e.kind = 'clock_in'),
      min(e.occurred_at) filter (where e.kind = 'arrival_confirmed')
    ),
    min(e.occurred_at) filter (where e.kind = 'clock_out')
    into v_in, v_out
  from public.attendance_events e
  where e.assignment_id = b.id;
  insert into public.timesheets (
    assignment_id, worker_id, job_id, recorded_start, recorded_finish, start_at, finish_at,
    break_minutes, status, approve_by, business_note, adjusted_by, adjusted_at, approved_by,
    approved_at, business_notified_at
  ) values (
    b.id, b.worker_id, b.job_id, v_in, v_out, p_start, p_finish,
    p_break_minutes, 'adjusted', now(), nullif(btrim(coalesce(p_note, '')), ''),
    (select auth.uid()), now(), (select auth.uid()), now(), now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- A query for our team (brief §4.6). The business queries hours waiting
-- for them; the worker queries hours once they're approved, unless our
-- team has already settled them.
create function public.dispute_timesheet(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  v_worker boolean;
begin
  select tt.id, tt.status, tt.job_id, tt.worker_id, tt.assignment_id, tt.resolved_at,
    j.business_id, coalesce(bz.trading_name, bz.legal_name) as business, si.name as site,
    s.starts_at
    into t
  from public.timesheets tt
  join public.jobs j on j.id = tt.job_id
  join public.businesses bz on bz.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.assignments x on x.id = tt.assignment_id
  join public.shifts s on s.id = x.shift_id
  where tt.id = p_id
  for update of tt;
  v_worker := found and t.worker_id = public.my_worker_id();
  if not found or not (v_worker or public.can_see_job(t.job_id)) then
    raise exception 'That timesheet isn''t one of yours' using errcode = '42501';
  end if;
  if btrim(coalesce(p_note, '')) = '' then
    raise exception 'Say what''s wrong with the hours' using errcode = 'check_violation';
  end if;
  if v_worker then
    if t.status = 'submitted' then
      raise exception 'The business hasn''t looked at these hours yet. Add a note for them instead'
        using errcode = 'check_violation';
    end if;
    if t.status not in ('approved', 'auto_approved', 'adjusted') or t.resolved_at is not null then
      raise exception 'These hours can''t be queried again. Contact us if something''s wrong'
        using errcode = 'check_violation';
    end if;
  elsif t.status <> 'submitted' then
    raise exception 'This timesheet has already been dealt with' using errcode = 'check_violation';
  end if;

  update public.timesheets
  set status = 'disputed', disputed_by = (select auth.uid()), disputed_at = now(),
    worker_note = case when v_worker then btrim(p_note) else worker_note end,
    business_note = case when v_worker then business_note else btrim(p_note) end
  where id = t.id;
  insert into public.admin_flags (kind, worker_id, business_id, assignment_id, summary)
  values ('timesheet_dispute', t.worker_id, t.business_id, t.assignment_id,
    format('%s queried the hours at %s on %s: %s',
      case when v_worker then 'The worker' else t.business end, t.site,
      to_char(t.starts_at at time zone 'Australia/Sydney', 'DD/MM/YYYY'), btrim(p_note)));
end;
$$;

-- Each side's note: the worker's while the business is deciding or our
-- team is looking at a query, the business's during a query.
create function public.note_timesheet(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select tt.id, tt.status, tt.job_id, tt.worker_id into t
  from public.timesheets tt
  where tt.id = p_id
  for update;
  if not found then
    raise exception 'That timesheet isn''t one of yours' using errcode = '42501';
  end if;
  if btrim(coalesce(p_note, '')) = '' then
    raise exception 'Write a note' using errcode = 'check_violation';
  end if;
  if t.worker_id = public.my_worker_id() then
    if t.status not in ('submitted', 'disputed') then
      raise exception 'These hours have been approved. Query them instead' using errcode = 'check_violation';
    end if;
    update public.timesheets set worker_note = btrim(p_note) where id = t.id;
  elsif public.can_see_job(t.job_id) then
    if t.status <> 'disputed' then
      raise exception 'Notes are for hours our team is looking at' using errcode = 'check_violation';
    end if;
    update public.timesheets set business_note = btrim(p_note) where id = t.id;
  else
    raise exception 'That timesheet isn''t one of yours' using errcode = '42501';
  end if;
end;
$$;

-- Our team settles a query: the hours to pay and bill, or none.
create function public.resolve_timesheet(
  p_id uuid,
  p_worked boolean,
  p_resolution text,
  p_start timestamptz default null,
  p_finish timestamptz default null,
  p_break_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  if not public.is_admin() then
    raise exception 'Only our team settles queries' using errcode = '42501';
  end if;
  select tt.id, tt.status, tt.assignment_id, s.starts_at, s.ends_at
    into t
  from public.timesheets tt
  join public.assignments x on x.id = tt.assignment_id
  join public.shifts s on s.id = x.shift_id
  where tt.id = p_id
  for update of tt;
  if not found then
    raise exception 'No such timesheet' using errcode = 'no_data_found';
  end if;
  if t.status <> 'disputed' then
    raise exception 'This timesheet isn''t being queried' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(p_resolution, '')) = '' then
    raise exception 'Say what was decided, for both sides' using errcode = 'check_violation';
  end if;
  if p_worked then
    perform public.check_timesheet_hours(t.starts_at, t.ends_at, p_start, p_finish, p_break_minutes);
    update public.timesheets
    set start_at = p_start, finish_at = p_finish, break_minutes = p_break_minutes,
      status = 'approved', approved_by = (select auth.uid()), approved_at = now(),
      resolution = btrim(p_resolution), resolved_by = (select auth.uid()), resolved_at = now()
    where id = t.id;
  else
    update public.timesheets
    set status = 'rejected',
      resolution = btrim(p_resolution), resolved_by = (select auth.uid()), resolved_at = now()
    where id = t.id;
  end if;
  update public.admin_flags
  set status = 'resolved', resolution = btrim(p_resolution), resolved_by = (select auth.uid()),
    resolved_at = now()
  where assignment_id = t.assignment_id and kind = 'timesheet_dispute' and status = 'open';
end;
$$;

-- Timesheets nobody approved or queried in time approve themselves
-- (brief §4.6). Run on a schedule; the server tells the business.
create function public.auto_approve_timesheets()
returns table (timesheet_id uuid, job_id uuid, worker_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.timesheets t
  set status = 'auto_approved', approved_at = now()
  where t.status = 'submitted' and t.approve_by <= now()
  returning t.id, t.job_id, t.worker_id;
$$;

-- Approved hours with no cost yet, or whose hours changed after costing
-- (our team settled a query), oldest first, for the server to cost.
create function public.timesheets_to_cost(p_limit integer default 500)
returns table (timesheet_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.timesheets t
  left join public.timesheet_costs k on k.timesheet_id = t.id
  where t.status in ('approved', 'auto_approved', 'adjusted')
    and (
      k.timesheet_id is null
      or (k.start_at, k.finish_at, k.break_minutes) is distinct from (t.start_at, t.finish_at, t.break_minutes)
    )
  order by t.approved_at
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- No-shows: not for someone who was there. Once they've clocked in at the
-- site (or the business confirmed they arrived), or their hours are in, a
-- problem with the shift is a query on the timesheet. A clock-in away from
-- the site can still be reported.
-- ---------------------------------------------------------------------------
create or replace function public.report_no_show(p_assignment_id uuid)
returns table (worker_id uuid, suspended boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  b record;
  v_count integer;
  v_limit integer := public.setting_numeric('no_show_suspend_count', 2)::integer;
  v_days integer := public.setting_numeric('no_show_window_days', 30)::integer;
begin
  select x.id, x.worker_id, x.status, s.starts_at, j.id as job_id, j.business_id,
    c.name as category, coalesce(bz.trading_name, bz.legal_name) as business
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  join public.categories c on c.id = j.category_id
  join public.businesses bz on bz.id = j.business_id
  where x.id = p_assignment_id
  for update of x;
  if not found or not (public.can_see_job(b.job_id) or public.is_admin()) then
    raise exception 'That booking isn''t one of yours' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'Only a booked worker can be reported' using errcode = 'check_violation';
  end if;
  if b.starts_at > now() then
    raise exception 'The shift hasn''t started yet' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.timesheets t where t.assignment_id = b.id)
    or exists (
      select 1 from public.attendance_events e
      where e.assignment_id = b.id
        and (e.kind = 'arrival_confirmed' or (e.kind = 'clock_in' and e.inside_geofence))
    ) then
    raise exception 'They were at work. If something''s wrong, query their hours instead'
      using errcode = 'check_violation';
  end if;

  update public.assignments
  set status = 'no_show', no_show_reported_at = now(), no_show_reported_by = (select auth.uid())
  where id = b.id;
  insert into public.admin_flags (kind, worker_id, business_id, assignment_id, summary)
  values ('no_show', b.worker_id, b.business_id, b.id,
    format('No-show reported for %s at %s', b.category, b.business));

  select count(*) into v_count
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.worker_id = b.worker_id and x.status = 'no_show'
    and s.starts_at > now() - make_interval(days => v_days);

  worker_id := b.worker_id;
  suspended := false;
  if v_count >= v_limit and exists (
    select 1 from public.workers w where w.id = b.worker_id and w.status = 'active'
  ) then
    update public.workers
    set status = 'suspended',
      status_reason = format('%s no-shows in %s days. We''ll be in touch to talk it through.', v_count, v_days)
    where id = b.worker_id;
    insert into public.admin_flags (kind, worker_id, summary)
    values ('suspension', b.worker_id,
      format('Suspended after %s no-shows in %s days', v_count, v_days));
    suspended := true;
  end if;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading timesheets: the worker sees their pay, the business its charge.
-- ---------------------------------------------------------------------------

-- A worker's timesheets, newest first, with the pay once it's worked out.
create function public.my_timesheets(p_id uuid default null)
returns table (
  timesheet_id uuid,
  job_id uuid,
  category_name text,
  business_name text,
  site_name text,
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
    t.id, t.job_id, c.name, coalesce(b.trading_name, b.legal_name), si.name,
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
    c.name, si.name, s.starts_at, s.ends_at, s.break_minutes,
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

-- ---------------------------------------------------------------------------
-- Grants and row level security. Timesheets change only through the
-- functions above; costs are written by the server.
-- ---------------------------------------------------------------------------
grant execute on function public.approve_timesheets(uuid[]),
  public.adjust_timesheet(uuid, timestamptz, timestamptz, integer, text),
  public.add_timesheet(uuid, timestamptz, timestamptz, integer, text),
  public.dispute_timesheet(uuid, text), public.note_timesheet(uuid, text),
  public.resolve_timesheet(uuid, boolean, text, timestamptz, timestamptz, integer),
  public.my_timesheets(uuid), public.business_timesheets(uuid, integer)
  to authenticated;
grant execute on function public.record_missing_timesheets(), public.auto_approve_timesheets(),
  public.timesheets_to_cost(integer) to service_role;

alter table public.timesheets enable row level security;
alter table public.timesheet_costs enable row level security;
grant all on public.timesheets, public.timesheet_costs to service_role;
grant select on public.timesheets, public.timesheet_costs to authenticated;

create policy "timesheets: own" on public.timesheets
  for select to authenticated using (worker_id = (select public.my_worker_id()));
create policy "timesheets: business" on public.timesheets
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "timesheets: admins" on public.timesheets
  for select to authenticated using ((select public.is_admin()));
create policy "timesheet_costs: admins" on public.timesheet_costs
  for select to authenticated using ((select public.is_admin()));
