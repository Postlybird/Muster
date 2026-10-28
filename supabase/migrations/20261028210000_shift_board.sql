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
  select s.id, j.id, b.id, coalesce(b.trading_name, b.legal_name), si.name, si.suburb, c.name,
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

grant execute on function public.admin_shift_board(timestamptz, timestamptz) to authenticated;
