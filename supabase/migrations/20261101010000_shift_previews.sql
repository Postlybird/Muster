-- Shifts near a worker we haven't checked yet (owner, 01/11/2026). Someone
-- who has just signed up sees open shifts in the work they chose, within
-- their travel distance, with the pay, so they know there's work waiting.
-- They can't apply until we've checked them, and they don't see the
-- business or the address. Nobody is told about these shifts: matching and
-- notifications are still for checked workers only (my_shift_offers()).

create function public.preview_shift_offers()
returns table (
  job_id uuid,
  shift_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  break_minutes smallint,
  category_name text,
  suburb text,
  state text,
  distance_km numeric,
  hourly_cents integer,
  estimate_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    j.id, s.id, s.starts_at, s.ends_at, s.break_minutes, c.name, si.suburb, si.state,
    round(public.distance_m(w.home_lat, w.home_lng, si.lat, si.lng) / 1000.0, 1),
    p.hourly_cents, p.estimate_cents
  from public.workers w
  join public.worker_categories wc on wc.worker_id = w.id
  join public.jobs j on j.category_id = wc.category_id
  join public.shifts s on s.job_id = j.id
  join public.businesses b on b.id = j.business_id
  join public.sites si on si.id = j.site_id
  join public.categories c on c.id = j.category_id
  join public.shift_pay p on p.shift_id = s.id
  where w.id = public.my_worker_id()
    and w.status in ('draft', 'pending')
    and w.home_lat is not null
    and w.home_lng is not null
    and j.status = 'posted'
    and j.archived_at is null
    and b.status = 'approved'
    and s.status = 'open'
    and s.starts_at > now()
    and public.distance_m(w.home_lat, w.home_lng, si.lat, si.lng) <= w.travel_radius_km * 1000
  order by s.starts_at
  limit 30;
$$;

revoke execute on function public.preview_shift_offers() from public, anon;
grant execute on function public.preview_shift_offers() to authenticated, service_role;
