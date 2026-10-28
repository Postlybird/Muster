-- On the day (brief §4.6): workers clock in and out on their phone with a
-- location check against the site; clocking in outside the radius needs a
-- reason and is flagged; clock-ins made without signal arrive later with
-- the time they happened. Supervisors confirm arrivals. Workers report
-- safety issues, which reach admins straight away.

-- ---------------------------------------------------------------------------
-- Attendance: an append-only record of what happened, and when.
-- ---------------------------------------------------------------------------
create type public.attendance_kind as enum ('clock_in', 'clock_out', 'arrival_confirmed');

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id),
  kind public.attendance_kind not null,
  -- When it happened (on the phone, for clock-ins sent later), and when
  -- we heard about it.
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  lat numeric(9, 6),
  lng numeric(9, 6),
  accuracy_m integer check (accuracy_m >= 0),
  distance_m integer check (distance_m >= 0),
  inside_geofence boolean,
  -- Why they were outside the radius.
  reason text check (char_length(reason) <= 500),
  -- Sent later because there was no signal.
  offline boolean not null default false,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index attendance_assignment_idx on public.attendance_events (assignment_id, occurred_at);

-- Straight-line distance in metres (haversine), for the clock-in check.
create function public.distance_m(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select round(2 * 6371000 * asin(sqrt(
    power(sin(radians((p_lat2 - p_lat1)::float8) / 2), 2)
    + cos(radians(p_lat1::float8)) * cos(radians(p_lat2::float8))
      * power(sin(radians((p_lng2 - p_lng1)::float8) / 2), 2)
  )))::integer;
$$;

-- Clocking in or out (brief §4.6). The time is when it happened on the
-- phone (a queued clock-in arrives later), never in the future, and within
-- the shift's day. Outside the site's radius it needs a reason, and admins
-- are flagged.
create function public.clock(
  p_assignment_id uuid,
  p_kind public.attendance_kind,
  p_occurred_at timestamptz,
  -- Missing when the phone couldn't tell where it was.
  p_lat numeric default null,
  p_lng numeric default null,
  p_accuracy_m integer default null,
  p_reason text default null,
  p_offline boolean default false
)
returns table (inside boolean, distance_m integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  b record;
  v_at timestamptz := least(coalesce(p_occurred_at, now()), now());
  v_radius integer;
  v_distance integer;
  v_inside boolean;
begin
  if p_kind not in ('clock_in', 'clock_out') then
    raise exception 'Choose clock in or clock out' using errcode = 'check_violation';
  end if;
  select x.id, x.status, x.worker_id, s.starts_at, s.ends_at, si.lat, si.lng,
    si.geofence_radius_m, j.business_id, si.name as site
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  join public.sites si on si.id = j.site_id
  where x.id = p_assignment_id and x.worker_id = public.my_worker_id()
  for update of x;
  if not found then
    raise exception 'That isn''t one of your shifts' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'This booking isn''t active any more' using errcode = 'check_violation';
  end if;
  if v_at < b.starts_at - interval '2 hours' then
    raise exception 'It''s too early to clock in' using errcode = 'check_violation';
  end if;
  if v_at > b.ends_at + interval '12 hours' then
    raise exception 'This shift finished too long ago' using errcode = 'check_violation';
  end if;
  if p_kind = 'clock_in' and exists (
    select 1 from public.attendance_events e where e.assignment_id = b.id and e.kind = 'clock_in'
  ) then
    raise exception 'You''ve already clocked in' using errcode = 'check_violation';
  end if;
  if p_kind = 'clock_out' then
    if not exists (
      select 1 from public.attendance_events e
      where e.assignment_id = b.id and e.kind in ('clock_in', 'arrival_confirmed')
    ) then
      raise exception 'Clock in first' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.attendance_events e where e.assignment_id = b.id and e.kind = 'clock_out'
    ) then
      raise exception 'You''ve already clocked out' using errcode = 'check_violation';
    end if;
  end if;

  v_radius := coalesce(b.geofence_radius_m, public.setting_numeric('geofence_radius_m', 200)::integer);
  if p_lat is not null and p_lng is not null then
    v_distance := public.distance_m(p_lat, p_lng, b.lat, b.lng);
    -- A phone's location can be off by its accuracy (up to 100 m counts).
    v_inside := v_distance - least(coalesce(p_accuracy_m, 0), 100) <= v_radius;
  end if;
  if coalesce(v_inside, false) = false and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Say why you''re not at the site' using errcode = 'check_violation';
  end if;

  insert into public.attendance_events (
    assignment_id, kind, occurred_at, lat, lng, accuracy_m, distance_m, inside_geofence,
    reason, offline, recorded_by
  ) values (
    b.id, p_kind, v_at, p_lat, p_lng, p_accuracy_m, v_distance, v_inside,
    nullif(btrim(coalesce(p_reason, '')), ''), coalesce(p_offline, false), (select auth.uid())
  );
  if coalesce(v_inside, false) = false then
    insert into public.admin_flags (kind, worker_id, business_id, assignment_id, summary)
    values ('outside_site', b.worker_id, b.business_id, b.id,
      format('%s %s at %s: %s', case when p_kind = 'clock_in' then 'Clocked in' else 'Clocked out' end,
        case when v_distance is null then 'without a location' else v_distance || ' m away' end,
        b.site, btrim(p_reason)));
  end if;
  inside := v_inside;
  distance_m := v_distance;
  return next;
end;
$$;

-- Supervisors (or anyone at the business who can see the job) confirm a
-- worker has arrived (brief §4.6), e.g. when their phone couldn't clock in.
create function public.confirm_arrival(p_assignment_id uuid, p_at timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  v_at timestamptz := least(coalesce(p_at, now()), now());
begin
  select x.id, x.status, s.starts_at, s.ends_at, s.job_id
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
  if v_at < b.starts_at - interval '2 hours' or v_at > b.ends_at then
    raise exception 'Choose a time during the shift' using errcode = 'check_violation';
  end if;
  insert into public.attendance_events (assignment_id, kind, occurred_at, recorded_by)
  values (b.id, 'arrival_confirmed', v_at, (select auth.uid()));
end;
$$;

-- Possible no-shows (plan): booked, started more than the setting's
-- minutes ago, and no clock-in or confirmed arrival. Flagged once each.
create function public.flag_possible_no_shows()
returns table (assignment_id uuid, job_id uuid, worker_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_after interval := make_interval(mins => public.setting_numeric('no_show_flag_minutes', 30)::integer);
begin
  return query
  with due as (
    select x.id, s.job_id, x.worker_id, j.business_id
    from public.assignments x
    join public.shifts s on s.id = x.shift_id
    join public.jobs j on j.id = s.job_id
    where x.status = 'confirmed'
      and s.starts_at <= now() - v_after
      and s.ends_at > now() - interval '12 hours'
      and not exists (
        select 1 from public.attendance_events e
        where e.assignment_id = x.id and e.kind in ('clock_in', 'arrival_confirmed')
      )
      and not exists (
        select 1 from public.admin_flags f
        where f.assignment_id = x.id and f.kind = 'possible_no_show'
      )
  ),
  flagged as (
    insert into public.admin_flags (kind, worker_id, business_id, assignment_id, summary)
    select 'possible_no_show', d.worker_id, d.business_id, d.id, 'No clock-in yet'
    from due d
    returning admin_flags.assignment_id
  )
  select d.id, d.job_id, d.worker_id from due d where d.id in (select f.assignment_id from flagged f);
end;
$$;

-- ---------------------------------------------------------------------------
-- Safety reports (brief §4.6): from the live shift screen, straight to
-- admins. Only the reporter and admins see them.
-- ---------------------------------------------------------------------------
create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id),
  worker_id uuid not null references public.workers (id),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  -- In the safety-photos bucket, in the worker's folder.
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger safety_reports_set_updated_at before update on public.safety_reports
  for each row execute function public.set_updated_at();
create trigger safety_reports_audit after insert or update on public.safety_reports
  for each row execute function public.audit_row_change('worker_id');

create function public.report_safety_issue(
  p_assignment_id uuid,
  p_description text,
  p_photo_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  v_id uuid;
  v_worker uuid := public.my_worker_id();
begin
  select x.id, x.worker_id, j.business_id, si.name as site
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  join public.sites si on si.id = j.site_id
  where x.id = p_assignment_id and x.worker_id = v_worker;
  if not found then
    raise exception 'That isn''t one of your shifts' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_photo_paths, '{}')) path
    where not public.in_worker_folder(path, v_worker)
  ) then
    raise exception 'Upload the photos again' using errcode = 'check_violation';
  end if;
  insert into public.safety_reports (assignment_id, worker_id, description, photo_paths)
  values (b.id, v_worker, btrim(p_description), coalesce(p_photo_paths, '{}'))
  returning id into v_id;
  insert into public.admin_flags (kind, worker_id, business_id, assignment_id, summary)
  values ('safety', v_worker, b.business_id, b.id,
    format('Safety issue at %s: %s', b.site, left(btrim(p_description), 200)));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants, row level security and storage. Rows are added only through the
-- functions above.
-- ---------------------------------------------------------------------------
grant execute on function public.clock(uuid, public.attendance_kind, timestamptz, numeric, numeric,
  integer, text, boolean), public.confirm_arrival(uuid, timestamptz),
  public.report_safety_issue(uuid, text, text[]) to authenticated;
grant execute on function public.flag_possible_no_shows(), public.distance_m(numeric, numeric,
  numeric, numeric) to service_role;

alter table public.attendance_events enable row level security;
alter table public.safety_reports enable row level security;
grant all on public.attendance_events, public.safety_reports to service_role;
grant select on public.attendance_events to authenticated;
grant select, update on public.safety_reports to authenticated;

create policy "attendance: own" on public.attendance_events
  for select to authenticated using (
    exists (
      select 1 from public.assignments x
      where x.id = assignment_id and x.worker_id = (select public.my_worker_id())
    )
  );
create policy "attendance: business" on public.attendance_events
  for select to authenticated using (
    exists (
      select 1 from public.assignments x
      join public.shifts s on s.id = x.shift_id
      where x.id = assignment_id and (select public.can_see_job(s.job_id))
    )
  );
create policy "attendance: admins" on public.attendance_events
  for select to authenticated using ((select public.is_admin()));

create policy "safety_reports: reporter" on public.safety_reports
  for select to authenticated using (worker_id = (select public.my_worker_id()));
create policy "safety_reports: admins" on public.safety_reports
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('safety-photos', 'safety-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "safety photos: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'safety-photos'
    and (storage.foldername(name))[1] = (select public.my_worker_id())::text
  );
create policy "safety photos: workers read their own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'safety-photos'
    and (storage.foldername(name))[1] = (select public.my_worker_id())::text
  );
create policy "safety photos: admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'safety-photos' and (select public.is_admin()));
