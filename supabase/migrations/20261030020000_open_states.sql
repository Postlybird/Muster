-- Australia-wide: anyone can sign up from any state, but we only take work
-- where we've chosen to open (workers' compensation cover, people on the
-- ground) and, where the state needs one, hold a current labour hire
-- licence. state_blocked() now checks both, so post_job() refuses a job in
-- a state that isn't open.

alter table public.jurisdictions
  add column open_for_work boolean not null default false;

comment on column public.jurisdictions.open_for_work is
  'We take work here. Jobs are still blocked where a licence is needed and we don''t hold a current one.';

update public.jurisdictions set open_for_work = true where code = 'NSW';

create or replace function public.state_blocked(p_state text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1 from public.jurisdictions j
      where j.code = p_state and j.open_for_work
    )
    or exists (
      select 1 from public.jurisdictions j
      where j.code = p_state
        and j.licence_required
        and not exists (
          select 1 from public.licences l
          where l.jurisdiction = j.code
            and l.status = 'active'
            and l.archived_at is null
            and (l.expires_on is null or l.expires_on >= (now() at time zone 'Australia/Sydney')::date)
        )
    );
$$;

-- The website shows which states are open, so visitors can read the
-- state's code, name and whether it's open (not our notes).
grant select (code, name, open_for_work) on public.jurisdictions to anon;
create policy "jurisdictions: public read" on public.jurisdictions
  for select to anon using (true);
