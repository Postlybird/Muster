-- Ratings (brief §4.7): once the hours are approved, the business rates the
-- worker and the worker rates the site, once each, with tags. Averages are
-- visible (businesses see each worker's, workers see each business's, not
-- per site); written comments go privately to admins. Favourites and
-- blocks (tables from step 1.7) get their screens in this step.

create type public.rating_direction as enum (
  -- The business rating the worker.
  'worker',
  -- The worker rating the site.
  'site'
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id),
  direction public.rating_direction not null,
  worker_id uuid not null references public.workers (id),
  business_id uuid not null references public.businesses (id),
  site_id uuid not null references public.sites (id),
  score smallint not null check (score between 1 and 5),
  tags text[] not null default '{}',
  -- For admins only (brief §4.7).
  private_note text check (char_length(private_note) <= 1000),
  rated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (assignment_id, direction)
);

create index ratings_worker_idx on public.ratings (worker_id) where direction = 'worker';
create index ratings_business_idx on public.ratings (business_id) where direction = 'site';

create trigger ratings_audit after insert on public.ratings
  for each row execute function public.audit_row_change('worker_id');

alter table public.businesses
  add column rating_avg numeric(3, 2),
  add column rating_count integer not null default 0;

-- Businesses can't change their own rating.
create or replace function public.businesses_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if row(new.id, new.abn, new.legal_name, new.entity_type_code, new.entity_type, new.abn_status,
           new.abn_status_from, new.gst_registered, new.gst_registered_from, new.acn, new.abr_state,
           new.abr_postcode, new.abr_checked_at, new.status, new.status_reason, new.submitted_at,
           new.approved_at, new.approved_by, new.account_terms_approved, new.payment_terms_days,
           new.stripe_customer_id, new.created_by, new.archived_at, new.rating_avg,
           new.rating_count)
       is distinct from
       row(old.id, old.abn, old.legal_name, old.entity_type_code, old.entity_type, old.abn_status,
           old.abn_status_from, old.gst_registered, old.gst_registered_from, old.acn, old.abr_state,
           old.abr_postcode, old.abr_checked_at, old.status, old.status_reason, old.submitted_at,
           old.approved_at, old.approved_by, old.account_terms_approved, old.payment_terms_days,
           old.stripe_customer_id, old.created_by, old.archived_at, old.rating_avg,
           old.rating_count)
    then
      raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

-- Hours that count: rated once they're approved (plan: "Rater, once, after
-- approval").
create function public.hours_approved(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.timesheets t
    where t.assignment_id = p_assignment_id
      and t.status in ('approved', 'auto_approved', 'adjusted')
  );
$$;

-- The business rates the worker: anyone who can see the job.
create function public.rate_worker(
  p_assignment_id uuid,
  p_score integer,
  p_tags text[] default '{}',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
begin
  select x.id, x.worker_id, j.id as job_id, j.business_id, j.site_id
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  where x.id = p_assignment_id;
  if not found or not public.can_see_job(b.job_id) then
    raise exception 'That booking isn''t one of yours' using errcode = '42501';
  end if;
  if not public.hours_approved(b.id) then
    raise exception 'Rate them once their hours are approved' using errcode = 'check_violation';
  end if;
  if p_score is null or p_score not between 1 and 5 then
    raise exception 'Choose 1 to 5 stars' using errcode = 'check_violation';
  end if;
  if not coalesce(p_tags, '{}') <@ array[
    'punctual', 'hard_working', 'would_rehire', 'careful', 'great_attitude', 'skilled'
  ] then
    raise exception 'Choose from the tags shown' using errcode = 'check_violation';
  end if;
  insert into public.ratings (
    assignment_id, direction, worker_id, business_id, site_id, score, tags, private_note, rated_by
  ) values (
    b.id, 'worker', b.worker_id, b.business_id, b.site_id, p_score, coalesce(p_tags, '{}'),
    nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid())
  )
  on conflict (assignment_id, direction) do nothing;
  if not found then
    raise exception 'You''ve already rated them for this shift' using errcode = 'check_violation';
  end if;
  update public.workers w
  set rating_avg = r.avg, rating_count = r.count
  from (
    select round(avg(score), 2) as avg, count(*)::integer as count
    from public.ratings where worker_id = b.worker_id and direction = 'worker'
  ) r
  where w.id = b.worker_id;
end;
$$;

-- The worker rates the site; the average is the business's (plan: workers
-- see each business's average, not per site).
create function public.rate_site(
  p_assignment_id uuid,
  p_score integer,
  p_tags text[] default '{}',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
begin
  select x.id, x.worker_id, j.business_id, j.site_id
    into b
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  where x.id = p_assignment_id and x.worker_id = public.my_worker_id();
  if not found then
    raise exception 'That isn''t one of your shifts' using errcode = '42501';
  end if;
  if not public.hours_approved(b.id) then
    raise exception 'Rate the site once your hours are approved' using errcode = 'check_violation';
  end if;
  if p_score is null or p_score not between 1 and 5 then
    raise exception 'Choose 1 to 5 stars' using errcode = 'check_violation';
  end if;
  if not coalesce(p_tags, '{}') <@ array[
    'safe_site', 'well_organised', 'clear_instructions', 'friendly_team', 'good_facilities'
  ] then
    raise exception 'Choose from the tags shown' using errcode = 'check_violation';
  end if;
  insert into public.ratings (
    assignment_id, direction, worker_id, business_id, site_id, score, tags, private_note, rated_by
  ) values (
    b.id, 'site', b.worker_id, b.business_id, b.site_id, p_score, coalesce(p_tags, '{}'),
    nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid())
  )
  on conflict (assignment_id, direction) do nothing;
  if not found then
    raise exception 'You''ve already rated this shift' using errcode = 'check_violation';
  end if;
  update public.businesses bz
  set rating_avg = r.avg, rating_count = r.count
  from (
    select round(avg(score), 2) as avg, count(*)::integer as count
    from public.ratings where business_id = b.business_id and direction = 'site'
  ) r
  where bz.id = b.business_id;
end;
$$;

-- The business's workers (brief §7: favourites, history, blocked): anyone
-- who has worked for them, plus favourites and blocked workers. Owners and
-- managers only, like favourites and blocks.
create function public.business_workers()
returns table (
  worker_id uuid,
  display_name text,
  photo_path text,
  rating numeric,
  rating_count integer,
  reliability numeric,
  shifts_completed integer,
  -- Shifts with this business with approved hours, and the last one.
  shifts_here integer,
  last_worked_at timestamptz,
  favourite boolean,
  block_id uuid,
  block_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.my_business_id() as business_id),
  worked as (
    select t.worker_id, count(*)::integer as shifts, max(s.starts_at) as last_at
    from public.timesheets t
    join public.jobs j on j.id = t.job_id
    join public.assignments x on x.id = t.assignment_id
    join public.shifts s on s.id = x.shift_id
    where j.business_id = (select business_id from me)
      and t.status in ('approved', 'auto_approved', 'adjusted')
    group by t.worker_id
  ),
  people as (
    select worker_id from worked
    union
    select f.worker_id from public.favourites f where f.business_id = (select business_id from me)
    union
    select bl.worker_id from public.blocks bl
    where bl.business_id = (select business_id from me) and bl.archived_at is null
  )
  select
    w.id,
    coalesce(w.preferred_name, w.legal_first_name) || ' ' || coalesce(w.legal_last_name, ''),
    case when w.photo_status = 'verified' then w.photo_path end,
    w.rating_avg, w.rating_count, w.reliability_score, w.shifts_completed,
    coalesce(wk.shifts, 0), wk.last_at,
    exists (
      select 1 from public.favourites f
      where f.business_id = (select business_id from me) and f.worker_id = w.id
    ),
    bl.id, bl.reason
  from people p
  join public.workers w on w.id = p.worker_id
  left join worked wk on wk.worker_id = w.id
  left join public.blocks bl on bl.business_id = (select business_id from me)
    and bl.worker_id = w.id and bl.archived_at is null
  where public.is_business_manager((select business_id from me))
  order by wk.last_at desc nulls last, w.legal_last_name;
$$;

-- ---------------------------------------------------------------------------
-- Grants and row level security. Ratings are added only through the
-- functions above; each side sees the ratings it gave, admins see all
-- (with the private notes), and averages are on workers and businesses.
-- ---------------------------------------------------------------------------
grant execute on function public.rate_worker(uuid, integer, text[], text),
  public.rate_site(uuid, integer, text[], text), public.business_workers() to authenticated;

alter table public.ratings enable row level security;
grant all on public.ratings to service_role;
grant select on public.ratings to authenticated;

create policy "ratings: workers see theirs" on public.ratings
  for select to authenticated
  using (direction = 'site' and worker_id = (select public.my_worker_id()));
create policy "ratings: businesses see theirs" on public.ratings
  for select to authenticated
  using (
    direction = 'worker'
    and ((select public.is_business_manager(business_id)) or (select public.can_see_site(site_id)))
  );
create policy "ratings: admins" on public.ratings
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Workers see each business's average rating with its work (plan). The
-- columns change, so the functions are made again.
-- ---------------------------------------------------------------------------
drop function public.my_job(uuid);
drop function public.my_shift_offers(uuid);

create function public.my_shift_offers(p_job_id uuid default null)
returns table (
  shift_id uuid,
  job_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  break_minutes smallint,
  job_type public.job_type,
  category_name text,
  business_name text,
  business_rating numeric,
  business_rating_count integer,
  suburb text,
  state text,
  distance_km numeric,
  hourly_cents integer,
  estimate_cents integer,
  headcount smallint,
  police_check_required boolean,
  no_known_hazards boolean,
  hazards text[],
  ppe text[],
  ppe_supplied_by public.ppe_supplier,
  tickets text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, j.id, s.starts_at, s.ends_at, s.break_minutes, j.type, c.name,
    coalesce(b.trading_name, b.legal_name), b.rating_avg, b.rating_count, si.suburb, si.state, m.distance_km,
    p.hourly_cents, p.estimate_cents, s.headcount, j.police_check_required,
    j.no_known_hazards,
    array(select h.name from public.job_hazards jh join public.hazards h on h.id = jh.hazard_id
          where jh.job_id = j.id order by h.sort_order),
    array(select i.name from public.job_ppe jp join public.ppe_items i on i.id = jp.ppe_item_id
          where jp.job_id = j.id order by i.sort_order),
    j.ppe_supplied_by,
    array(select t.name from public.job_credentials jc
          join public.credential_types t on t.id = jc.credential_type_id
          where jc.job_id = j.id order by t.sort_order)
  from public.shift_matches m
  join public.workers w on w.id = m.worker_id
  join public.shifts s on s.id = m.shift_id
  join public.jobs j on j.id = s.job_id
  join public.businesses b on b.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  left join public.shift_pay p on p.shift_id = s.id
  where m.worker_id = public.my_worker_id()
    and m.eligible
    and m.visible_from <= now()
    and w.status = 'active'
    and s.status = 'open'
    and s.starts_at > now()
    and j.status = 'posted'
    and b.status = 'approved'
    and (p_job_id is null or j.id = p_job_id)
    and not exists (
      select 1 from public.blocks bl
      where bl.business_id = j.business_id and bl.worker_id = m.worker_id
        and bl.archived_at is null
    )
    and not exists (
      select 1 from public.applications a
      where a.shift_id = s.id and a.worker_id = m.worker_id
        and a.status in ('applied', 'booked')
    )
  order by s.starts_at;
$$;

create function public.my_job(p_job_id uuid)
returns table (
  job_id uuid,
  job_type public.job_type,
  fill_mode public.fill_mode,
  category_name text,
  business_name text,
  business_rating numeric,
  business_rating_count integer,
  suburb text,
  state text,
  police_check_required boolean,
  no_known_hazards boolean,
  hazards text[],
  ppe text[],
  ppe_supplied_by public.ppe_supplier,
  tickets text[],
  instructions text,
  hazard_controls text,
  hazard_notes text,
  induction text,
  ppe_notes text,
  booked boolean,
  address_line1 text,
  postcode text,
  lat numeric,
  lng numeric,
  access_notes text,
  parking_notes text,
  report_to_name text,
  report_to_phone text,
  photo_paths text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.my_worker_id() as worker_id),
  booked as (
    select exists (
      select 1 from public.assignments x
      join public.shifts s on s.id = x.shift_id
      where s.job_id = p_job_id and x.worker_id = (select worker_id from me)
        and x.status = 'confirmed'
    ) as yes
  )
  select
    j.id, j.type, j.fill_mode, c.name, coalesce(b.trading_name, b.legal_name), b.rating_avg, b.rating_count, si.suburb,
    si.state, j.police_check_required, j.no_known_hazards,
    array(select h.name from public.job_hazards jh join public.hazards h on h.id = jh.hazard_id
          where jh.job_id = j.id order by h.sort_order),
    array(select i.name from public.job_ppe jp join public.ppe_items i on i.id = jp.ppe_item_id
          where jp.job_id = j.id order by i.sort_order),
    j.ppe_supplied_by,
    array(select t.name from public.job_credentials jc
          join public.credential_types t on t.id = jc.credential_type_id
          where jc.job_id = j.id order by t.sort_order),
    j.instructions, j.hazard_controls, j.hazard_notes, j.induction, j.ppe_notes,
    bk.yes,
    case when bk.yes then si.address_line1 end,
    case when bk.yes then si.postcode end,
    case when bk.yes then si.lat end,
    case when bk.yes then si.lng end,
    case when bk.yes then si.access_notes end,
    case when bk.yes then si.parking_notes end,
    case when bk.yes then coalesce(j.report_to_name, si.report_to_name) end,
    case when bk.yes then coalesce(j.report_to_phone, si.report_to_phone) end,
    case when bk.yes then array(
      select ph.path from public.job_photos ph
      where ph.job_id = j.id and ph.archived_at is null order by ph.sort_order
    ) else '{}'::text[] end
  from public.jobs j
  join public.businesses b on b.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  cross join booked bk
  where j.id = p_job_id
    and (
      exists (select 1 from public.my_shift_offers(p_job_id))
      or exists (
        select 1 from public.applications a
        join public.shifts s on s.id = a.shift_id
        where s.job_id = p_job_id and a.worker_id = (select worker_id from me)
          and a.status <> 'withdrawn'
      )
    );
$$;

grant execute on function public.my_shift_offers(uuid), public.my_job(uuid) to authenticated;
