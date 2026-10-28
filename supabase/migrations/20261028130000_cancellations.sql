-- Cancellations, no-shows and suspension (brief §4.5). Workers cancel their
-- own bookings (late ones count against reliability); owners and managers
-- cancel shifts or whole jobs (late ones are charged); anyone at the
-- business who can see the job reports a no-show once it has started.
-- Thresholds come from settings.

-- ---------------------------------------------------------------------------
-- Settings, read from SQL
-- ---------------------------------------------------------------------------
create function public.setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::numeric from public.settings s where s.key = p_key), p_default);
$$;

create function public.setting_boolean(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::boolean from public.settings s where s.key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- What happened to a booking
-- ---------------------------------------------------------------------------
alter table public.assignments
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles (id),
  add column cancellation_reason text check (char_length(cancellation_reason) <= 500),
  -- Inside the late cancellation window for whoever cancelled.
  add column late_cancellation boolean not null default false,
  -- A business cancelling late is charged this many hours (and the worker
  -- paid them, if that setting is on), at the booking's rates.
  add column cancellation_charge_hours numeric(4, 2),
  add column cancellation_pay_hours numeric(4, 2),
  add column no_show_reported_at timestamptz,
  add column no_show_reported_by uuid references public.profiles (id);

-- Matters for admins to look at (plan: the admin queues arrive in step 1.15).
create table public.admin_flags (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (
    kind in ('no_show', 'suspension', 'possible_no_show', 'outside_site', 'safety', 'work_limit')
  ),
  worker_id uuid references public.workers (id),
  business_id uuid references public.businesses (id),
  assignment_id uuid references public.assignments (id),
  summary text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_flags_open_idx on public.admin_flags (created_at) where status = 'open';

create trigger admin_flags_set_updated_at before update on public.admin_flags
  for each row execute function public.set_updated_at();
create trigger admin_flags_audit after insert or update on public.admin_flags
  for each row execute function public.audit_row_change('worker_id');

alter table public.admin_flags enable row level security;
grant all on public.admin_flags to service_role;
grant select, update on public.admin_flags to authenticated;
create policy "admin_flags: admins" on public.admin_flags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Workers cancel their own bookings. The shift reopens for others.
-- ---------------------------------------------------------------------------
create function public.cancel_my_bookings(p_assignment_ids uuid[], p_reason text)
returns table (assignment_id uuid, shift_id uuid, late boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_worker uuid := public.my_worker_id();
  v_window interval := make_interval(
    hours => public.setting_numeric('worker_late_cancel_hours', 12)::integer
  );
  b record;
begin
  if v_worker is null then
    raise exception 'Only workers can cancel their bookings' using errcode = '42501';
  end if;
  for b in
    select x.id, x.shift_id, s.starts_at
    from public.assignments x
    join public.shifts s on s.id = x.shift_id
    where x.id = any (p_assignment_ids) and x.worker_id = v_worker
      and x.status = 'confirmed' and s.starts_at > now()
    order by s.starts_at
    for update of x, s
  loop
    update public.assignments
    set status = 'cancelled_by_worker', cancelled_at = now(),
      cancelled_by = (select auth.uid()), cancellation_reason = nullif(btrim(p_reason), ''),
      late_cancellation = b.starts_at - now() < v_window
    where id = b.id;
    update public.applications set status = 'withdrawn', decided_at = now()
    where shift_id = b.shift_id and worker_id = v_worker;
    update public.shifts set status = 'open' where id = b.shift_id and status = 'filled';
    assignment_id := b.id;
    shift_id := b.shift_id;
    late := b.starts_at - now() < v_window;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owners and managers cancel shifts (or the whole job). Booked workers are
-- released; inside the business's late window each booking is charged.
-- ---------------------------------------------------------------------------
create function public.cancel_shifts(p_shift_ids uuid[], p_reason text)
returns table (shift_id uuid, worker_id uuid, late boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_window interval := make_interval(
    hours => public.setting_numeric('business_late_cancel_hours', 12)::integer
  );
  v_charge numeric := public.setting_numeric('business_late_cancel_charge_hours', 3);
  v_pay boolean := public.setting_boolean('pay_worker_on_late_business_cancel', false);
  s record;
  x record;
  v_late boolean;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Say why it''s cancelled' using errcode = 'check_violation';
  end if;
  for s in
    select sh.id, sh.job_id, sh.starts_at
    from public.shifts sh
    join public.jobs j on j.id = sh.job_id
    where sh.id = any (p_shift_ids) and sh.status in ('open', 'filled')
      and sh.starts_at > now() and j.status = 'posted'
    order by sh.starts_at
    for update of sh
  loop
    if not exists (
      select 1 from public.jobs j
      where j.id = s.job_id and public.is_business_manager(j.business_id)
    ) then
      raise exception 'Only owners and managers cancel work' using errcode = '42501';
    end if;
    v_late := s.starts_at - now() < v_window;
    update public.shifts
    set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()),
      cancellation_reason = btrim(p_reason)
    where id = s.id;
    update public.applications set status = 'declined', decided_at = now()
    where shift_id = s.id and status = 'applied';
    for x in
      select a.id, a.worker_id from public.assignments a
      where a.shift_id = s.id and a.status = 'confirmed'
    loop
      update public.assignments
      set status = 'cancelled_by_business', cancelled_at = now(),
        cancelled_by = (select auth.uid()), cancellation_reason = btrim(p_reason),
        late_cancellation = v_late,
        cancellation_charge_hours = case when v_late then v_charge end,
        cancellation_pay_hours = case when v_late and v_pay then v_charge end
      where id = x.id;
      shift_id := s.id;
      worker_id := x.worker_id;
      late := v_late;
      return next;
    end loop;
    -- A job with nothing left to do is over: completed if any of it was
    -- worked, otherwise cancelled.
    if not exists (
      select 1 from public.shifts o
      where o.job_id = s.job_id and o.status in ('open', 'filled')
    ) then
      if exists (
        select 1 from public.shifts o where o.job_id = s.job_id and o.status = 'completed'
      ) then
        update public.jobs set status = 'completed' where id = s.job_id;
      else
        update public.jobs
        set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()),
          cancellation_reason = btrim(p_reason)
        where id = s.job_id;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- No-shows (brief §4.5): reported by the business once a shift has
-- started. Enough of them within the window suspends the worker pending
-- review; suspension stops new shifts, and admins decide about existing
-- ones (plan).
-- ---------------------------------------------------------------------------
create function public.report_no_show(p_assignment_id uuid)
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

grant execute on function public.cancel_my_bookings(uuid[], text), public.cancel_shifts(uuid[], text),
  public.report_no_show(uuid) to authenticated;
grant execute on function public.setting_numeric(text, numeric), public.setting_boolean(text, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- Finished shifts (run on a schedule): shifts whose time has passed are
-- completed, and so are jobs with nothing left to do.
-- ---------------------------------------------------------------------------
create function public.finish_shifts()
returns table (worker_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with done as (
    update public.shifts s set status = 'completed'
    where s.status in ('open', 'filled') and s.ends_at <= now()
    returning s.id, s.job_id
  ),
  jobs_done as (
    update public.jobs j set status = 'completed'
    where j.status = 'posted'
      and j.id in (select job_id from done)
      and not exists (
        select 1 from public.shifts o
        where o.job_id = j.id and o.status in ('open', 'filled') and o.id not in (select id from done)
      )
    returning j.id
  )
  -- Workers whose booked shifts just finished, so their reliability and
  -- shift counts can be brought up to date.
  -- (Data-changing steps in a WITH always run in full.)
  select distinct x.worker_id
  from public.assignments x
  where x.shift_id in (select id from done) and x.status = 'confirmed';
end;
$$;

grant execute on function public.finish_shifts() to service_role;
