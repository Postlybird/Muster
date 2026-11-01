-- How a worker's pay for a shift adds up (owner, 01/11/2026: overtime shown
-- in the pay for each individual): the hours at each rate, overtime
-- included, as their hours were costed (timesheet_costs.cost, the pay engine's
-- ShiftCost), then any call-out loading. Only the worker's own hours, only
-- once they're approved and costed as they stand (as my_timesheets() shows
-- the pay), and only the pay, never what the business is charged.

create function public.my_timesheet_pay(p_id uuid)
returns table (
  rate_type text,
  kind text,
  minutes integer,
  rate_cents integer,
  pay_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with costed as (
    select k.cost
    from public.timesheets t
    join public.timesheet_costs k on k.timesheet_id = t.id
    where t.id = p_id
      and t.worker_id = public.my_worker_id()
      and t.status in ('approved', 'auto_approved', 'adjusted')
      and (k.start_at, k.finish_at, k.break_minutes)
        = (t.start_at, t.finish_at, t.break_minutes)
  ),
  lines as (
    select
      l.line ->> 'type' as rate_type,
      l.line ->> 'kind' as kind,
      (l.line ->> 'minutes')::integer as minutes,
      (l.line ->> 'payRateCents')::integer as rate_cents,
      (l.line ->> 'payCents')::integer as pay_cents,
      l.n as position
    from costed c
    cross join lateral jsonb_array_elements(
      coalesce(c.cost -> 'lines', '[]'::jsonb)
    ) with ordinality as l (line, n)
    union all
    -- The call-out loading is paid on top of the hours.
    select 'callout', 'loading', null, null, (c.cost ->> 'urgentPayCents')::integer, 1000000
    from costed c
    where coalesce((c.cost ->> 'urgentPayCents')::integer, 0) > 0
  )
  select rate_type, kind, minutes, rate_cents, pay_cents
  from lines
  order by position;
$$;

comment on function public.my_timesheet_pay(uuid) is
  'The signed-in worker''s pay for one approved shift, a line per rate (overtime included) and any call-out loading. Pay only.';

revoke execute on function public.my_timesheet_pay(uuid) from public, anon;
grant execute on function public.my_timesheet_pay(uuid) to authenticated, service_role;
