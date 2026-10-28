-- Acting on the admin queues (brief §6: disputes, no-shows, safety reports
-- and suspensions; plan: admins decide possible no-shows, and whether a
-- worker on hold keeps their bookings).

-- ---------------------------------------------------------------------------
-- Our team takes a worker off a booking that hasn't started. The shift
-- reopens for others; no penalty, no charge.
-- ---------------------------------------------------------------------------
create function public.admin_cancel_booking(p_assignment_id uuid, p_reason text)
returns table (shift_id uuid, job_id uuid, worker_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  b record;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do that' using errcode = '42501';
  end if;
  if v_reason = '' then
    raise exception 'Say why' using errcode = 'check_violation';
  end if;
  select x.id, x.shift_id, x.worker_id, x.status, s.starts_at, s.job_id
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.id = p_assignment_id
  for update of x, s;
  if not found then
    raise exception 'That booking no longer exists' using errcode = 'no_data_found';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'This booking isn''t active any more' using errcode = 'check_violation';
  end if;
  if b.starts_at <= now() then
    raise exception 'The shift has already started' using errcode = 'check_violation';
  end if;

  update public.assignments
  set status = 'cancelled_by_admin', cancelled_at = now(), cancelled_by = (select auth.uid()),
    cancellation_reason = left(v_reason, 500), late_cancellation = false
  where id = b.id;
  update public.shifts set status = 'open' where id = b.shift_id and status = 'filled';
  update public.admin_flags
  set status = 'resolved', resolution = 'Taken off the shift: ' || v_reason,
    resolved_by = (select auth.uid()), resolved_at = now()
  where assignment_id = b.id and kind = 'booking_at_risk' and status = 'open';

  shift_id := b.shift_id;
  job_id := b.job_id;
  worker_id := b.worker_id;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settling a matter in the queues, with what was decided. Some outcomes do
-- something as well:
--   possible_no_show: 'arrived' records their arrival at the start time;
--                     'no_show' records a no-show (which may put them on hold)
--   no_show:          'excuse' sets the booking aside, so it doesn't count
--   suspension:       'lift' makes the worker active again
--   booking_at_risk:  'remove' takes them off the shift
-- 'keep' (no-show, hold, booking at risk) and 'resolve' only record the
-- decision. Hours queries are settled from the timesheet instead.
-- ---------------------------------------------------------------------------
create function public.settle_admin_flag(p_flag_id uuid, p_outcome text, p_note text)
returns table (worker_id uuid, assignment_id uuid, shift_id uuid, job_id uuid, suspended boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  f public.admin_flags;
  v_note text := btrim(coalesce(p_note, ''));
  v_starts timestamptz;
  v_shift uuid;
  v_job uuid;
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do that' using errcode = '42501';
  end if;
  if v_note = '' then
    raise exception 'Say what was decided' using errcode = 'check_violation';
  end if;
  select * into f from public.admin_flags where id = p_flag_id for update;
  if not found then
    raise exception 'That matter no longer exists' using errcode = 'no_data_found';
  end if;
  if f.status <> 'open' then
    raise exception 'That matter is already settled' using errcode = 'check_violation';
  end if;
  if f.kind = 'timesheet_dispute' then
    raise exception 'Settle hours queries from the timesheet' using errcode = 'check_violation';
  end if;
  select s.starts_at, s.id, s.job_id into v_starts, v_shift, v_job
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.id = f.assignment_id;

  suspended := false;
  case
    when p_outcome = 'resolve' then
      v_label := 'Settled';
    when p_outcome = 'keep' and f.kind in ('no_show', 'suspension', 'booking_at_risk') then
      v_label := case f.kind
        when 'no_show' then 'No-show stands'
        when 'suspension' then 'Still on hold'
        else 'Going ahead'
      end;
    when p_outcome = 'arrived' and f.kind = 'possible_no_show' then
      perform public.confirm_arrival(f.assignment_id, v_starts);
      v_label := 'They were there';
    when p_outcome = 'no_show' and f.kind = 'possible_no_show' then
      select r.suspended into suspended from public.report_no_show(f.assignment_id) r;
      -- We've just decided it, so there's nothing more to look at.
      update public.admin_flags
      set status = 'resolved', resolution = 'Recorded by our team: ' || v_note,
        resolved_by = (select auth.uid()), resolved_at = now()
      where assignment_id = f.assignment_id and kind = 'no_show' and status = 'open';
      v_label := 'No-show';
    when p_outcome = 'excuse' and f.kind = 'no_show' then
      update public.assignments
      set status = 'cancelled_by_admin', cancelled_at = now(), cancelled_by = (select auth.uid()),
        cancellation_reason = left('No-show excused: ' || v_note, 500)
      where id = f.assignment_id and status = 'no_show';
      if not found then
        raise exception 'That booking isn''t a no-show any more' using errcode = 'check_violation';
      end if;
      v_label := 'No-show excused';
    when p_outcome = 'lift' and f.kind = 'suspension' then
      update public.workers set status = 'active', status_reason = null
      where id = f.worker_id and status = 'suspended';
      if not found then
        raise exception 'They''re not on hold any more' using errcode = 'check_violation';
      end if;
      update public.admin_flags
      set status = 'resolved', resolution = 'Hold lifted: ' || v_note,
        resolved_by = (select auth.uid()), resolved_at = now()
      where worker_id = f.worker_id and kind = 'suspension' and status = 'open' and id <> f.id;
      v_label := 'Hold lifted';
    when p_outcome = 'remove' and f.kind = 'booking_at_risk' then
      perform public.admin_cancel_booking(f.assignment_id, v_note);
      v_label := 'Taken off the shift';
    else
      raise exception 'That can''t be done with this matter' using errcode = 'check_violation';
  end case;

  if f.kind = 'safety' then
    update public.safety_reports
    set status = 'resolved', resolution = v_note, resolved_by = (select auth.uid()), resolved_at = now()
    where assignment_id = f.assignment_id and status = 'open';
  end if;
  update public.admin_flags
  set status = 'resolved', resolution = v_label || ': ' || v_note,
    resolved_by = (select auth.uid()), resolved_at = now()
  where id = f.id;

  worker_id := f.worker_id;
  assignment_id := f.assignment_id;
  shift_id := v_shift;
  job_id := v_job;
  return next;
end;
$$;

grant execute on function public.admin_cancel_booking(uuid, text),
  public.settle_admin_flag(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- A possible no-show settles itself once the worker clocks in, the business
-- confirms they arrived, or a no-show is reported.
-- ---------------------------------------------------------------------------
create function public.settle_possible_no_show_on_arrival()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admin_flags
  set status = 'resolved', resolved_at = now(),
    resolution = format(
      '%s at %s',
      case new.kind when 'clock_in' then 'Clocked in' else 'Arrival confirmed' end,
      to_char(new.occurred_at at time zone 'Australia/Sydney', 'FMHH12:MI am')
    )
  where assignment_id = new.assignment_id and kind = 'possible_no_show' and status = 'open';
  return null;
end;
$$;

create trigger attendance_settles_possible_no_show
  after insert on public.attendance_events
  for each row when (new.kind in ('clock_in', 'arrival_confirmed'))
  execute function public.settle_possible_no_show_on_arrival();

create function public.settle_possible_no_show_on_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admin_flags
  set status = 'resolved', resolved_at = now(), resolution = 'Reported as a no-show'
  where assignment_id = new.id and kind = 'possible_no_show' and status = 'open';
  return null;
end;
$$;

create trigger assignments_settle_possible_no_show
  after update of status on public.assignments
  for each row when (new.status = 'no_show' and old.status is distinct from 'no_show')
  execute function public.settle_possible_no_show_on_report();
