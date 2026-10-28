-- The audit log viewer (brief §4.9: who viewed, changed or verified any
-- worker document or personal record, and when), newest first, a page at
-- a time, with names for who did it and whose record it was. With
-- p_people_only, just entries about a person (not jobs, shifts or
-- settings). Admins only.
create function public.admin_audit_log(
  p_person text default null,
  p_subject uuid default null,
  p_people_only boolean default false,
  p_kind text default null,
  p_table text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  action text,
  table_name text,
  record_id text,
  actor_id uuid,
  actor_role text,
  actor_name text,
  subject_profile_id uuid,
  subject_name text,
  subject_worker_id uuid,
  before jsonb,
  after jsonb,
  context jsonb,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select p.id, w.id as worker_id,
      coalesce(
        nullif(btrim(concat_ws(' ', coalesce(w.preferred_name, w.legal_first_name), w.legal_last_name)), ''),
        p.full_name, p.email, p.phone
      ) as name,
      lower(concat_ws(' ', w.preferred_name, w.legal_first_name, w.legal_last_name, p.full_name, p.email, p.phone))
        as search
    from public.profiles p
    left join public.workers w on w.profile_id = p.id
  ),
  q as (select nullif(lower(btrim(p_person)), '') as person)
  select a.id, a.created_at, a.action, a.table_name, a.record_id,
    a.actor_id, a.actor_role, actor.name,
    a.subject_profile_id, subject.name, subject.worker_id,
    a.before, a.after, a.context,
    count(*) over ()
  from public.audit_log a
  left join people actor on actor.id = a.actor_id
  left join people subject on subject.id = a.subject_profile_id
  cross join q
  where (select public.is_admin())
    and (p_subject is null or a.subject_profile_id = p_subject)
    and (not coalesce(p_people_only, false) or a.subject_profile_id is not null)
    and (
      q.person is null
      or position(q.person in coalesce(actor.search, '')) > 0
      or position(q.person in coalesce(subject.search, '')) > 0
    )
    and (
      p_kind is null
      or (p_kind = 'changes' and a.action in ('insert', 'update', 'delete'))
      or (p_kind = 'views' and a.action not in ('insert', 'update', 'delete'))
    )
    and (p_table is null or a.table_name = p_table)
    and (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at < p_to)
  order by a.created_at desc, a.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.admin_audit_log(
  text, uuid, boolean, text, text, timestamptz, timestamptz, integer, integer
) to authenticated;
