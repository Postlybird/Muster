-- Reports (brief §6) for shifts starting in a period: how well work is
-- filled and how fast, no-shows, workers, and the hours, revenue and gross
-- margin by business and work type. Admins only.

create function public.admin_report_summary(p_from timestamptz, p_to timestamptz)
returns table (
  places integer,
  filled integer,
  median_minutes_to_fill numeric,
  started_bookings integer,
  no_shows integer,
  active_workers integer,
  workers_worked integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with period_shifts as (
    -- Posted work, less shifts the business cancelled.
    select s.id, s.headcount, s.starts_at, j.posted_at
    from public.shifts s
    join public.jobs j on j.id = s.job_id
    where (select public.is_admin())
      and j.status in ('posted', 'completed')
      and s.status <> 'cancelled'
      and s.starts_at >= p_from and s.starts_at < p_to
  ),
  held as (
    -- Bookings that held: still booked, worked, or a no-show.
    select a.id, a.shift_id, a.status, a.confirmed_at, ps.starts_at, ps.posted_at
    from public.assignments a
    join period_shifts ps on ps.id = a.shift_id
    where a.status in ('confirmed', 'completed', 'no_show')
  )
  select
    (select coalesce(sum(ps.headcount), 0)::integer from period_shifts ps),
    (
      select coalesce(sum(least(n.booked, n.headcount)), 0)::integer
      from (
        select ps.headcount, count(h.id) as booked
        from period_shifts ps
        left join held h on h.shift_id = ps.id
        group by ps.id, ps.headcount
      ) n
    ),
    (
      select percentile_cont(0.5) within group (
        order by extract(epoch from h.confirmed_at - h.posted_at) / 60
      )::numeric
      from held h
      where h.posted_at is not null and h.confirmed_at >= h.posted_at
    ),
    (select count(*)::integer from held h where h.starts_at <= now()),
    (select count(*)::integer from held h where h.status = 'no_show'),
    (
      select count(*)::integer from public.workers w
      where (select public.is_admin()) and w.status = 'active' and w.archived_at is null
    ),
    (
      select count(distinct t.worker_id)::integer
      from public.timesheets t
      join public.assignments a on a.id = t.assignment_id
      join period_shifts ps on ps.id = a.shift_id
      where t.status in ('approved', 'auto_approved', 'adjusted')
    );
$$;

-- Approved hours as costed, before GST, by business and by work type.
create function public.admin_report_breakdown(p_from timestamptz, p_to timestamptz)
returns table (
  dimension text,
  key uuid,
  name text,
  shifts integer,
  paid_minutes integer,
  bill_cents bigint,
  cost_cents bigint,
  margin_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with worked as (
    select j.business_id, coalesce(b.trading_name, b.legal_name) as business,
      j.category_id, c.name as category, a.shift_id,
      k.paid_minutes, k.bill_cents, k.pay_cents + k.on_cost_cents as cost_cents, k.margin_cents
    from public.timesheets t
    join public.timesheet_costs k on k.timesheet_id = t.id
    join public.assignments a on a.id = t.assignment_id
    join public.shifts s on s.id = a.shift_id
    join public.jobs j on j.id = t.job_id
    join public.businesses b on b.id = j.business_id
    left join public.categories c on c.id = j.category_id
    where (select public.is_admin())
      and t.status in ('approved', 'auto_approved', 'adjusted')
      and s.starts_at >= p_from and s.starts_at < p_to
  )
  select 'business', w.business_id, min(w.business), count(distinct w.shift_id)::integer,
    sum(w.paid_minutes)::integer, sum(w.bill_cents)::bigint, sum(w.cost_cents)::bigint,
    sum(w.margin_cents)::bigint
  from worked w
  group by w.business_id
  union all
  select 'category', w.category_id, coalesce(min(w.category), 'Other'), count(distinct w.shift_id)::integer,
    sum(w.paid_minutes)::integer, sum(w.bill_cents)::bigint, sum(w.cost_cents)::bigint,
    sum(w.margin_cents)::bigint
  from worked w
  group by w.category_id
  order by 1, 6 desc, 3;
$$;

grant execute on function public.admin_report_summary(timestamptz, timestamptz),
  public.admin_report_breakdown(timestamptz, timestamptz) to authenticated;
