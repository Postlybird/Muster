-- Allowances on rate cards (owner, 03/11/2026): an award's allowances as
-- data a payroll professional checks, never code. Each has a name, what it
-- pays and when: on every shift worked (like the building award's fares and
-- travel), or when the worker stays more than some hours past the booked
-- finish in overtime (like the cleaning award's meal allowance). Pricing
-- copies them into each booking's terms with their charge, so they're paid
-- to the worker, charged to the business, and kept with the hours' costing.
--   [{"name": "Meal allowance", "pay_cents": 1753, "when": "late_overtime", "after_hours": 2}]

alter table public.rate_cards
  add column allowances jsonb not null default '[]'::jsonb,
  add constraint rate_cards_allowances_check check (jsonb_typeof(allowances) = 'array');

comment on column public.rate_cards.allowances is
  'The award''s allowances (src/domain/rates.ts allowancesFrom): name, pay_cents, when (each_shift or late_overtime) and after_hours.';

-- A worker's pay for one shift, line by line: the hours at each rate, any
-- call-out loading, and now the allowances the shift earned.
create or replace function public.my_timesheet_pay(p_id uuid)
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
    union all
    -- Then each allowance, by name.
    select a.item ->> 'name', 'allowance', null, null, (a.item ->> 'payCents')::integer,
      2000000 + a.n
    from costed c
    cross join lateral jsonb_array_elements(
      coalesce(c.cost -> 'allowances', '[]'::jsonb)
    ) with ordinality as a (item, n)
  )
  select rate_type, kind, minutes, rate_cents, pay_cents
  from lines
  order by position;
$$;
