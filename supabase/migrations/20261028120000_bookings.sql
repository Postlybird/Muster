-- Taking work (brief §4.4): workers apply and the business picks ("I'll
-- choose"), or the first eligible workers to accept are booked ("First
-- in"). Each booking keeps a copy of the pay and bill rates it was made at
-- (brief §4.8), and the worker sees the address and who to report to once
-- they're booked.

-- ---------------------------------------------------------------------------
-- What a shift pays and bills, worked out when the job is posted. Bookings
-- copy it, so both sides get the terms they were shown.
-- ---------------------------------------------------------------------------
alter table public.shift_pay
  add column rate_card_id uuid references public.rate_cards (id),
  add column bill_rate_rule_id uuid references public.bill_rate_rules (id),
  -- What costShift() needs to cost the hours worked: the card, the bill
  -- rule, on-costs, the minimum engagement and any urgent loading.
  add column cost_rules jsonb,
  add column bill_hourly_cents integer check (bill_hourly_cents > 0),
  add column estimate_bill_cents integer check (estimate_bill_cents >= 0),
  add column estimate_margin_cents integer;

-- Emails to whoever posted a job go once each: its first applicant, and when
-- it's fully booked.
alter table public.jobs
  add column first_applicant_emailed_at timestamptz,
  add column filled_emailed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Applications and bookings
-- ---------------------------------------------------------------------------
create type public.application_status as enum ('applied', 'booked', 'declined', 'withdrawn');
create type public.assignment_status as enum (
  'confirmed', 'cancelled_by_worker', 'cancelled_by_business', 'no_show', 'completed'
);

-- A worker's hand up for a shift (plan: applying is a commitment). "First
-- in" bookings are recorded here too, booked straight away. Declined means
-- the shift filled without them.
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  worker_id uuid not null references public.workers (id),
  status public.application_status not null default 'applied',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, worker_id)
);

create index applications_worker_idx on public.applications (worker_id, status);

-- A worker booked on a shift. Employment records: never deleted.
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  worker_id uuid not null references public.workers (id),
  status public.assignment_status not null default 'confirmed',
  confirmed_at timestamptz not null default now(),
  -- The worker ("First in") or whoever at the business picked them.
  confirmed_by uuid references public.profiles (id),
  -- Reminders (brief §4.4): the day before, and two hours before.
  reminded_day_before_at timestamptz,
  reminded_soon_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index assignments_one_per_worker on public.assignments (shift_id, worker_id)
  where status = 'confirmed';
create index assignments_worker_idx on public.assignments (worker_id, status);
create index assignments_shift_idx on public.assignments (shift_id, status);

-- Pay, bill and margin as they stood when the worker was booked (brief
-- §4.8), so later rate changes never rewrite history. Admin only: workers
-- see their pay, and businesses their bill, through functions.
create table public.assignment_rates (
  assignment_id uuid primary key references public.assignments (id),
  rate_card_id uuid not null references public.rate_cards (id),
  bill_rate_rule_id uuid references public.bill_rate_rules (id),
  cost_rules jsonb not null,
  -- Ordinary hourly rates, casual loading included in pay.
  pay_hourly_cents integer not null,
  bill_hourly_cents integer not null,
  estimate_pay_cents integer not null,
  estimate_bill_cents integer not null,
  estimate_margin_cents integer not null,
  created_at timestamptz not null default now()
);

create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger applications_audit after insert or update on public.applications
  for each row execute function public.audit_row_change('worker_id');
create trigger assignments_audit after insert or update on public.assignments
  for each row execute function public.audit_row_change('worker_id');

-- ---------------------------------------------------------------------------
-- Booking. One function books one worker on one shift, locking the shift
-- so two workers can't take the last place. The checks repeat the matching
-- rules that can change quickly (brief §4.4: eligibility is checked again
-- when a worker accepts).
-- ---------------------------------------------------------------------------
create function public.book_worker(
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
    j.status as job_status, b.status as business_status
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

-- Only the functions below (and the seed, with the service-role key) book.
grant execute on function public.book_worker(uuid, uuid, boolean) to service_role;

-- "First in" (brief §4.4): the first eligible workers to accept are booked.
create function public.accept_shifts(p_shift_ids uuid[])
returns table (shift_id uuid, result text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_worker uuid := public.my_worker_id();
  v_shift uuid;
begin
  if v_worker is null then
    raise exception 'Only workers can take shifts' using errcode = '42501';
  end if;
  for v_shift in
    select sh.id
    from public.shifts sh
    join public.jobs j on j.id = sh.job_id
    where sh.id = any (p_shift_ids) and j.fill_mode = 'auto'
    order by sh.starts_at
  loop
    shift_id := v_shift;
    result := public.book_worker(v_shift, v_worker, true);
    return next;
  end loop;
end;
$$;

-- "I'll choose": the worker applies, and the business picks.
create function public.apply_for_shifts(p_shift_ids uuid[])
returns table (shift_id uuid, result text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_worker uuid := public.my_worker_id();
  v_shift uuid;
begin
  if v_worker is null then
    raise exception 'Only workers can apply for shifts' using errcode = '42501';
  end if;
  for v_shift in
    select sh.id
    from public.shifts sh
    join public.jobs j on j.id = sh.job_id
    where sh.id = any (p_shift_ids) and j.fill_mode = 'pick'
    order by sh.starts_at
  loop
    shift_id := v_shift;
    if exists (
      select 1 from public.applications a
      where a.shift_id = v_shift and a.worker_id = v_worker and a.status in ('applied', 'booked')
    ) then
      result := 'already_applied';
    elsif not exists (select 1 from public.my_shift_offers() o where o.shift_id = v_shift) then
      result := 'not_offered';
    elsif exists (
      select 1
      from public.assignments x
      join public.shifts o on o.id = x.shift_id
      join public.shifts t on t.id = v_shift
      where x.worker_id = v_worker and x.status = 'confirmed'
        and o.starts_at < t.ends_at and o.ends_at > t.starts_at
    ) then
      result := 'clash';
    else
      insert into public.applications (shift_id, worker_id)
      values (v_shift, v_worker)
      on conflict (shift_id, worker_id)
        do update set status = 'applied', decided_at = null;
      result := 'applied';
    end if;
    return next;
  end loop;
end;
$$;

-- Changing their mind before the business picks them costs nothing.
create function public.withdraw_applications(p_shift_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with withdrawn as (
    update public.applications a
    set status = 'withdrawn', decided_at = now()
    where a.worker_id = public.my_worker_id()
      and a.shift_id = any (p_shift_ids)
      and a.status = 'applied'
    returning 1
  )
  select count(*)::integer from withdrawn;
$$;

-- The business picks an applicant (plan: picking confirms instantly). They're
-- booked on every shift of the job they applied for that still has room.
create function public.book_applicant(p_job_id uuid, p_worker_id uuid)
returns table (shift_id uuid, result text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_shift uuid;
begin
  if not exists (
    select 1 from public.jobs j
    where j.id = p_job_id and j.fill_mode = 'pick'
      and public.is_business_manager(j.business_id)
  ) then
    raise exception 'Only owners and managers pick workers' using errcode = '42501';
  end if;
  for v_shift in
    select sh.id
    from public.applications a
    join public.shifts sh on sh.id = a.shift_id
    where sh.job_id = p_job_id and a.worker_id = p_worker_id and a.status = 'applied'
    order by sh.starts_at
  loop
    shift_id := v_shift;
    result := public.book_worker(v_shift, p_worker_id, false);
    return next;
  end loop;
end;
$$;

grant execute on function public.accept_shifts(uuid[]), public.apply_for_shifts(uuid[]),
  public.withdraw_applications(uuid[]), public.book_applicant(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What workers see
-- ---------------------------------------------------------------------------

-- Offers leave out shifts the worker has already applied for or been
-- booked on; those show under My shifts. Someone turned away when a shift
-- filled sees it again if it reopens.
create or replace function public.my_shift_offers(p_job_id uuid default null)
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
    and not exists (
      select 1 from public.applications a
      where a.shift_id = s.id and a.worker_id = m.worker_id
        and a.status in ('applied', 'booked')
    )
  order by s.starts_at;
$$;

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
    coalesce(b.trading_name, b.legal_name), si.suburb, a.status, x.id, x.status,
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

-- A job in full, for a worker with an offer, application or booking on
-- it. The address, site notes, who to report to and the photos come only
-- once they're booked (brief §4.4).
create function public.my_job(p_job_id uuid)
returns table (
  job_id uuid,
  job_type public.job_type,
  fill_mode public.fill_mode,
  category_name text,
  business_name text,
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
    j.id, j.type, j.fill_mode, c.name, coalesce(b.trading_name, b.legal_name), si.suburb,
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

-- Superseded by my_job(), which also covers bookings.
drop function public.my_job_offer(uuid);

grant execute on function public.my_shifts(uuid), public.my_job(uuid) to authenticated;

-- Booked workers see the job's photos (a file path in, yes or no out).
create function public.booked_worker_can_see_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.job_photos ph
    join public.shifts s on s.job_id = ph.job_id
    join public.assignments x on x.shift_id = s.id
    where ph.path = p_path and ph.archived_at is null
      and x.worker_id = public.my_worker_id() and x.status = 'confirmed'
  );
$$;

grant execute on function public.booked_worker_can_see_photo(text) to authenticated, service_role;

create policy "job photos: booked workers read"
  on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and public.booked_worker_can_see_photo(name));

-- ---------------------------------------------------------------------------
-- What businesses see (brief §4.4): photo, preferred name, rating,
-- reliability, verified ticket names and shifts completed. Never documents,
-- date of birth or visa details. The mobile number once they're booked.
-- ---------------------------------------------------------------------------

-- Workers who applied to, were booked by or are favourites of the business.
create function public.business_can_see_worker(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
    join public.shifts s on s.id = a.shift_id
    where a.worker_id = p_worker_id and public.can_see_job(s.job_id)
  ) or exists (
    select 1 from public.favourites f
    where f.worker_id = p_worker_id and public.is_business_manager(f.business_id)
  );
$$;

-- The same, for a file in a folder named after the worker (anything that
-- isn't a worker's id is no one's).
create function public.business_can_see_worker_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.business_can_see_worker(p_folder::uuid)
    else false
  end;
$$;

grant execute on function public.business_can_see_worker(uuid),
  public.business_can_see_worker_folder(text) to authenticated, service_role;

create policy "worker photos: businesses read connected workers"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'worker-photos'
    and public.business_can_see_worker_folder((storage.foldername(name))[1])
  );

create function public.job_applicants(p_job_id uuid)
returns table (
  worker_id uuid,
  display_name text,
  photo_path text,
  rating numeric,
  reliability numeric,
  shifts_completed integer,
  tickets text[],
  rank_score numeric,
  shift_ids uuid[],
  applied_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.id,
    coalesce(w.preferred_name, w.legal_first_name) || ' ' || left(w.legal_last_name, 1) || '.',
    case when w.photo_status = 'verified' then w.photo_path end,
    w.rating_avg, w.reliability_score, w.shifts_completed,
    array(
      select distinct t.name
      from public.worker_credentials wc
      join public.credential_types t on t.id = wc.credential_type_id
      where wc.worker_id = w.id and wc.status = 'verified' and wc.archived_at is null
        and (wc.expires_on is null or wc.expires_on >= (now() at time zone 'Australia/Sydney')::date)
      order by t.name
    ),
    max(m.rank_score),
    array_agg(a.shift_id order by s.starts_at),
    min(a.created_at)
  from public.applications a
  join public.shifts s on s.id = a.shift_id
  join public.workers w on w.id = a.worker_id
  left join public.shift_matches m on m.shift_id = a.shift_id and m.worker_id = a.worker_id
  where s.job_id = p_job_id and a.status = 'applied' and s.status = 'open'
    and s.starts_at > now() and public.can_see_job(p_job_id)
  group by w.id
  order by max(m.rank_score) desc nulls last, min(a.created_at);
$$;

create function public.job_bookings(p_job_id uuid)
returns table (
  assignment_id uuid,
  shift_id uuid,
  worker_id uuid,
  display_name text,
  photo_path text,
  mobile text,
  rating numeric,
  reliability numeric,
  shifts_completed integer,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    x.id, x.shift_id, w.id,
    coalesce(w.preferred_name, w.legal_first_name) || ' ' || coalesce(w.legal_last_name, ''),
    case when w.photo_status = 'verified' then w.photo_path end,
    pr.phone, w.rating_avg, w.reliability_score, w.shifts_completed, x.confirmed_at
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.workers w on w.id = x.worker_id
  join public.profiles pr on pr.id = w.profile_id
  where s.job_id = p_job_id and x.status = 'confirmed' and public.can_see_job(p_job_id)
  order by s.starts_at, w.legal_last_name;
$$;

-- When everyone who matches can see a job's shifts: later than now only
-- while the business's favourites have their head start (brief §4.3).
create function public.job_open_to_all_at(p_job_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.can_see_job(p_job_id) then (
    select max(m.visible_from)
    from public.shift_matches m
    join public.shifts s on s.id = m.shift_id
    where s.job_id = p_job_id and m.eligible
  ) end;
$$;

grant execute on function public.job_applicants(uuid), public.job_bookings(uuid),
  public.job_open_to_all_at(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and row level security. Rows change only through the functions
-- above (and admins).
-- ---------------------------------------------------------------------------
alter table public.applications enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_rates enable row level security;

grant all on public.applications, public.assignments, public.assignment_rates to service_role;
grant select on public.applications, public.assignments, public.assignment_rates to authenticated;

create policy "applications: own" on public.applications
  for select to authenticated using (worker_id = (select public.my_worker_id()));
create policy "applications: business" on public.applications
  for select to authenticated using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and (select public.can_see_job(s.job_id))
    )
  );
create policy "applications: admins" on public.applications
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "assignments: own" on public.assignments
  for select to authenticated using (worker_id = (select public.my_worker_id()));
create policy "assignments: business" on public.assignments
  for select to authenticated using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and (select public.can_see_job(s.job_id))
    )
  );
create policy "assignments: admins" on public.assignments
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "assignment_rates: admins read" on public.assignment_rates
  for select to authenticated using ((select public.is_admin()));
