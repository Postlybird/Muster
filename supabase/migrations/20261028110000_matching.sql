-- Matching workers to shifts (brief §4.4): businesses' favourites and blocks
-- (managed from step 1.12), what a shift pays, each worker's eligibility and
-- rank for each open shift, and the worker's own view of what's offered.

create table public.favourites (
  business_id uuid not null references public.businesses (id),
  worker_id uuid not null references public.workers (id),
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (business_id, worker_id)
);

create index favourites_worker_idx on public.favourites (worker_id);

-- Workers can't see that they've been blocked (brief §4.4).
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  worker_id uuid not null references public.workers (id),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_by uuid references public.profiles (id) default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index blocks_one_active on public.blocks (business_id, worker_id)
  where archived_at is null;

-- Pay for one worker on a shift, worked out when it's posted. Businesses
-- never see pay (they see the bill); workers see it in their offers.
create table public.shift_pay (
  shift_id uuid primary key references public.shifts (id),
  -- The ordinary hourly rate, casual loading included.
  hourly_cents integer not null check (hourly_cents > 0),
  -- The whole shift: penalty rates, minimum engagement and any urgent allowance.
  estimate_cents integer not null check (estimate_cents >= 0),
  computed_at timestamptz not null default now()
);

-- One row per open shift and worker who does that type of work.
create table public.shift_matches (
  shift_id uuid not null references public.shifts (id),
  worker_id uuid not null references public.workers (id),
  eligible boolean not null,
  -- Why not, in the words of src/domain/eligibility.ts.
  reasons text[] not null default '{}',
  -- For admin attention, e.g. visa work-hour limits.
  flags text[] not null default '{}',
  distance_km numeric(6, 1),
  rank_score numeric(8, 1) not null default 0,
  favourite boolean not null default false,
  -- Favourites see a shift first (brief §4.3); everyone else from this time.
  visible_from timestamptz not null default now(),
  notified_at timestamptz,
  computed_at timestamptz not null default now(),
  primary key (shift_id, worker_id)
);

create index shift_matches_worker_idx on public.shift_matches (worker_id) where eligible;

create trigger blocks_set_updated_at before update on public.blocks
  for each row execute function public.set_updated_at();
create trigger favourites_audit after insert or update or delete on public.favourites
  for each row execute function public.audit_row_change('worker_id');
create trigger blocks_audit after insert or update on public.blocks
  for each row execute function public.audit_row_change('worker_id');

-- ---------------------------------------------------------------------------
-- What a worker sees (brief §4.4): hourly pay, the suburb, hazards, PPE and
-- tickets. The street address, who to report to and the job's photos stay
-- hidden until they're booked (step 1.8). A block or suspension takes
-- effect straight away, before matches are worked out again.
-- ---------------------------------------------------------------------------
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
    coalesce(b.trading_name, b.legal_name), si.suburb, si.state, m.distance_km,
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
  order by s.starts_at;
$$;

-- The rest of a job a worker has been offered: instructions, safety notes
-- and how it's filled. Nothing comes back without a current offer.
create function public.my_job_offer(p_job_id uuid)
returns table (
  job_id uuid,
  instructions text,
  hazard_controls text,
  hazard_notes text,
  induction text,
  ppe_notes text,
  fill_mode public.fill_mode
)
language sql
stable
security definer
set search_path = ''
as $$
  select j.id, j.instructions, j.hazard_controls, j.hazard_notes, j.induction,
    j.ppe_notes, j.fill_mode
  from public.jobs j
  where j.id = p_job_id
    and exists (select 1 from public.my_shift_offers(p_job_id));
$$;

grant execute on function public.my_shift_offers(uuid), public.my_job_offer(uuid) to authenticated;

-- How many workers can see a job's shifts, for its business (a count,
-- never who).
create function public.job_offer_count(p_job_id uuid)
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
    where s.job_id = p_job_id and m.eligible and m.visible_from <= now()
  ) end;
$$;

grant execute on function public.job_offer_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and row level security. Matches and pay are written by the server.
-- ---------------------------------------------------------------------------
alter table public.favourites enable row level security;
alter table public.blocks enable row level security;
alter table public.shift_pay enable row level security;
alter table public.shift_matches enable row level security;

grant all on public.favourites, public.blocks, public.shift_pay, public.shift_matches
  to service_role;
grant select, insert, delete on public.favourites to authenticated;
grant select, insert, update on public.blocks to authenticated;
grant select on public.shift_pay, public.shift_matches to authenticated;

create policy "favourites: managers" on public.favourites
  for select to authenticated using ((select public.is_business_manager(business_id)));
create policy "favourites: managers add" on public.favourites
  for insert to authenticated with check ((select public.is_business_manager(business_id)));
create policy "favourites: managers remove" on public.favourites
  for delete to authenticated using ((select public.is_business_manager(business_id)));
create policy "favourites: admins" on public.favourites
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "blocks: managers" on public.blocks
  for select to authenticated using ((select public.is_business_manager(business_id)));
create policy "blocks: managers add" on public.blocks
  for insert to authenticated with check ((select public.is_business_manager(business_id)));
create policy "blocks: managers lift" on public.blocks
  for update to authenticated
  using ((select public.is_business_manager(business_id)))
  with check ((select public.is_business_manager(business_id)));
create policy "blocks: admins" on public.blocks
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "shift_pay: admins read" on public.shift_pay
  for select to authenticated using ((select public.is_admin()));
create policy "shift_matches: admins read" on public.shift_matches
  for select to authenticated using ((select public.is_admin()));
