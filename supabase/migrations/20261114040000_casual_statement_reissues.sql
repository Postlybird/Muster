-- The Casual Employment Information Statement, given again (owner,
-- 14/11/2026). Under the Fair Work Act, an employer with 15 or more
-- employees gives each casual the statement again after 6 months, after
-- 12 months and every 12 months after that; a smaller employer only
-- after 12 months, and giving it more often does no harm. The compliance
-- job emails each worker a link on those dates, counted from when we
-- activated them, and records each one here, once, as proof it was given.

create table public.casual_statement_reissues (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  months integer not null check (months >= 6),
  sent_at timestamptz not null default now(),
  unique (worker_id, months)
);

comment on table public.casual_statement_reissues is
  'Each time a worker was emailed the Casual Employment Information Statement again, by months employed (6, 12, 24, ...). Written by the compliance job.';

alter table public.casual_statement_reissues enable row level security;

-- Workers see their own; our team sees everyone's. Only the service role
-- (the compliance job) writes.
create policy "casual_statement_reissues: own or admin"
  on public.casual_statement_reissues
  for select to authenticated
  using (
    worker_id in (
      select w.id from public.workers w where w.profile_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

grant select on public.casual_statement_reissues to authenticated;
grant all on public.casual_statement_reissues to service_role;
