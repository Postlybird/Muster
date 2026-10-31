-- Worker profiles for businesses (owner's go-ahead, 31/10/2026), so a
-- business can see who it's taking on: ratings with how many there are and
-- the tags businesses gave, reliability, experience and level in each type
-- of work, the checks we've done, and their history with this business.
-- Never documents, date of birth, visa details or contact details (a booked
-- worker's mobile stays on the job's booked list).

-- A worker's profile, for a business they've applied to or worked for, or
-- that has them as a favourite or blocked, and for admins.
create function public.business_worker_profile(p_worker_id uuid)
returns table (
  worker_id uuid,
  display_name text,
  photo_path text,
  bio text,
  rating numeric,
  rating_count integer,
  reliability numeric,
  shifts_completed integer,
  member_since timestamptz,
  -- [{"tag": "punctual", "count": 5}, …], most given first, from every business.
  tags jsonb,
  -- [{"name": …, "level": 2, "years": 4, "shifts": 12}, …], most shifts first.
  work_types jsonb,
  tickets text[],
  id_checked boolean,
  right_to_work_checked boolean,
  police_checked boolean,
  -- With this business: shifts with approved hours, the last one, and its ratings.
  shifts_here integer,
  last_worked_at timestamptz,
  our_rating numeric,
  our_rating_count integer,
  favourite boolean,
  blocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.my_business_id() as business_id),
  -- Booked here at some point, so the business already knows their full name.
  booked as (
    select exists (
      select 1
      from public.assignments x
      join public.shifts s on s.id = x.shift_id
      join public.jobs j on j.id = s.job_id
      where x.worker_id = p_worker_id and j.business_id = (select business_id from me)
    ) as yes
  ),
  approved as (
    select t.id, t.job_id, j.business_id, j.category_id, s.starts_at
    from public.timesheets t
    join public.jobs j on j.id = t.job_id
    join public.assignments x on x.id = t.assignment_id
    join public.shifts s on s.id = x.shift_id
    where t.worker_id = p_worker_id and t.status in ('approved', 'auto_approved', 'adjusted')
  )
  select
    w.id,
    case when (select yes from booked) or public.is_admin()
      then coalesce(w.preferred_name, w.legal_first_name) || ' ' || coalesce(w.legal_last_name, '')
      else coalesce(w.preferred_name, w.legal_first_name) || ' ' || left(w.legal_last_name, 1) || '.'
    end,
    case when w.photo_status = 'verified' then w.photo_path end,
    w.bio,
    w.rating_avg, w.rating_count, w.reliability_score, w.shifts_completed,
    w.activated_at,
    (
      select coalesce(jsonb_agg(jsonb_build_object('tag', t.tag, 'count', t.n) order by t.n desc, t.tag), '[]'::jsonb)
      from (
        select tag, count(*)::integer as n
        from public.ratings r, unnest(r.tags) as tag
        where r.worker_id = w.id and r.direction = 'worker'
        group by tag
      ) t
    ),
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.name, 'level', wc.level, 'years', wc.years_experience,
        'shifts', (select count(*) from approved a where a.category_id = wc.category_id)
      ) order by (select count(*) from approved a where a.category_id = wc.category_id) desc, c.name), '[]'::jsonb)
      from public.worker_categories wc
      join public.categories c on c.id = wc.category_id
      where wc.worker_id = w.id
    ),
    array(
      select distinct t.name
      from public.worker_credentials wc
      join public.credential_types t on t.id = wc.credential_type_id
      where wc.worker_id = w.id and wc.status = 'verified' and wc.archived_at is null
        and t.kind <> 'police_check'
        and (wc.expires_on is null or wc.expires_on >= (now() at time zone 'Australia/Sydney')::date)
      order by t.name
    ),
    exists (select 1 from public.identity_checks i where i.worker_id = w.id and i.status = 'verified'),
    exists (select 1 from public.work_rights r where r.worker_id = w.id and r.status = 'verified'),
    exists (
      select 1
      from public.worker_credentials wc
      join public.credential_types t on t.id = wc.credential_type_id
      where wc.worker_id = w.id and t.kind = 'police_check' and wc.status = 'verified'
        and wc.archived_at is null
        and (wc.expires_on is null or wc.expires_on >= (now() at time zone 'Australia/Sydney')::date)
    ),
    (select count(*)::integer from approved a where a.business_id = (select business_id from me)),
    (select max(a.starts_at) from approved a where a.business_id = (select business_id from me)),
    (
      select round(avg(r.score), 2)
      from public.ratings r
      where r.worker_id = w.id and r.direction = 'worker' and r.business_id = (select business_id from me)
    ),
    (
      select count(*)::integer
      from public.ratings r
      where r.worker_id = w.id and r.direction = 'worker' and r.business_id = (select business_id from me)
    ),
    exists (
      select 1 from public.favourites f
      where f.worker_id = w.id and f.business_id = (select business_id from me)
    ),
    exists (
      select 1 from public.blocks b
      where b.worker_id = w.id and b.business_id = (select business_id from me) and b.archived_at is null
    )
  from public.workers w
  where w.id = p_worker_id
    and (
      public.is_admin()
      or exists (
        select 1
        from public.applications a
        join public.shifts s on s.id = a.shift_id
        where a.worker_id = w.id and public.can_see_job(s.job_id)
      )
      or exists (
        select 1
        from public.assignments x
        join public.shifts s on s.id = x.shift_id
        where x.worker_id = w.id and public.can_see_job(s.job_id)
      )
      or (
        public.is_business_manager((select business_id from me))
        and (
          exists (
            select 1 from public.favourites f
            where f.worker_id = w.id and f.business_id = (select business_id from me)
          )
          or exists (
            select 1 from public.blocks b
            where b.worker_id = w.id and b.business_id = (select business_id from me)
          )
        )
      )
    );
$$;

-- The applicants list, now with how many ratings, their history with this
-- business, and their experience and level in the job's type of work.
drop function public.job_applicants(uuid);

create function public.job_applicants(p_job_id uuid)
returns table (
  worker_id uuid,
  display_name text,
  photo_path text,
  rating numeric,
  rating_count integer,
  reliability numeric,
  shifts_completed integer,
  tickets text[],
  rank_score numeric,
  shift_ids uuid[],
  applied_at timestamptz,
  note text,
  shifts_here integer,
  favourite boolean,
  years_experience smallint,
  level smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with job as (select j.business_id, j.category_id from public.jobs j where j.id = p_job_id)
  select
    w.id,
    coalesce(w.preferred_name, w.legal_first_name) || ' ' || left(w.legal_last_name, 1) || '.',
    case when w.photo_status = 'verified' then w.photo_path end,
    w.rating_avg, w.rating_count, w.reliability_score, w.shifts_completed,
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
    min(a.created_at),
    (array_agg(a.note order by a.updated_at desc))[1],
    (
      select count(*)::integer
      from public.timesheets t
      join public.jobs tj on tj.id = t.job_id
      where t.worker_id = w.id and tj.business_id = (select business_id from job)
        and t.status in ('approved', 'auto_approved', 'adjusted')
    ),
    exists (
      select 1 from public.favourites f
      where f.worker_id = w.id and f.business_id = (select business_id from job)
    ),
    wc.years_experience,
    wc.level
  from public.applications a
  join public.shifts s on s.id = a.shift_id
  join public.workers w on w.id = a.worker_id
  left join public.shift_matches m on m.shift_id = a.shift_id and m.worker_id = a.worker_id
  left join public.worker_categories wc
    on wc.worker_id = w.id and wc.category_id = (select category_id from job)
  where s.job_id = p_job_id and a.status = 'applied' and s.status = 'open'
    and s.starts_at > now() and public.can_see_job(p_job_id)
  group by w.id, wc.years_experience, wc.level
  order by max(m.rank_score) desc nulls last, min(a.created_at);
$$;

-- Booked workers, now with how many ratings they have.
drop function public.job_bookings(uuid);

create function public.job_bookings(p_job_id uuid)
returns table (
  assignment_id uuid,
  shift_id uuid,
  worker_id uuid,
  display_name text,
  photo_path text,
  mobile text,
  rating numeric,
  rating_count integer,
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
    pr.phone, w.rating_avg, w.rating_count, w.reliability_score, w.shifts_completed, x.confirmed_at
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  join public.workers w on w.id = x.worker_id
  join public.profiles pr on pr.id = w.profile_id
  where s.job_id = p_job_id and x.status = 'confirmed' and public.can_see_job(p_job_id)
  order by s.starts_at, w.legal_last_name;
$$;

grant execute on function public.business_worker_profile(uuid), public.job_applicants(uuid),
  public.job_bookings(uuid) to authenticated;
