-- A worker's own words for businesses (owner's go-ahead, 31/10/2026): the
-- bio on their profile ("a little about you", up to 500 characters) and a
-- note when they apply for a job ("why I'm a good fit", up to 300), so they
-- can stand out. Neither can hold a phone number, email address or link:
-- businesses reach workers through us. src/domain/worker-words.ts applies
-- the same rules in the app.

create function public.worker_words_ok(p_text text, p_max integer default 300)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text is null or (
    char_length(p_text) <= p_max
    and p_text !~ '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
    and p_text !~* '(https?://|www\.)'
    and p_text !~* '\m[a-z0-9-]+\.(com|net|org|io|co|me|app|biz|info|au)\M'
    and not exists (
      select 1
      from regexp_matches(p_text, '\+?\(?[0-9][0-9[:space:]().-]{6,}[0-9]', 'g') as run (m)
      where regexp_replace(run.m[1], '[^0-9+]', '', 'g')
        ~ '^((\+?61|0)[2-478][0-9]{8}|1[38]00[0-9]{6}|13[0-9]{4})$'
    )
  );
$$;

-- Check constraints run as whoever writes the row, and workers write their
-- own bio.
grant execute on function public.worker_words_ok(text, integer) to authenticated, service_role;

-- Before launch, so any test bio with contact details is simply cleared.
update public.workers set bio = null where not public.worker_words_ok(bio, 500);
alter table public.workers
  drop constraint workers_bio_check,
  add constraint workers_bio_ok check (public.worker_words_ok(bio, 500));

-- One note per job: applying for more of its shifts, or changing the note,
-- updates it on all of them.
alter table public.applications
  add column note text constraint applications_note_ok check (public.worker_words_ok(note));

drop function public.apply_for_shifts(uuid[]);

create function public.apply_for_shifts(p_shift_ids uuid[], p_note text default null)
returns table (shift_id uuid, result text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_worker uuid := public.my_worker_id();
  v_note text := nullif(btrim(p_note), '');
  v_shift uuid;
  v_applied boolean := false;
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
      insert into public.applications (shift_id, worker_id, note)
      values (v_shift, v_worker, v_note)
      on conflict (shift_id, worker_id)
        do update set status = 'applied', decided_at = null, note = excluded.note;
      result := 'applied';
      v_applied := true;
    end if;
    return next;
  end loop;
  -- The latest note counts for every shift of the job they're waiting on.
  if v_applied then
    update public.applications a
    set note = v_note
    from public.shifts s
    where s.id = a.shift_id and a.worker_id = v_worker and a.status = 'applied'
      and s.job_id in (select sh.job_id from public.shifts sh where sh.id = any (p_shift_ids))
      and a.note is distinct from v_note;
  end if;
end;
$$;

-- Changing the note while they wait for the business to choose.
create function public.set_application_note(p_job_id uuid, p_note text)
returns integer
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update public.applications a
    set note = nullif(btrim(p_note), '')
    from public.shifts s
    where s.id = a.shift_id and s.job_id = p_job_id
      and a.worker_id = public.my_worker_id() and a.status = 'applied'
    returning 1
  )
  select count(*)::integer from changed;
$$;

-- The applicants list, now with each applicant's note.
drop function public.job_applicants(uuid);

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
  applied_at timestamptz,
  note text
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
    min(a.created_at),
    (array_agg(a.note order by a.updated_at desc))[1]
  from public.applications a
  join public.shifts s on s.id = a.shift_id
  join public.workers w on w.id = a.worker_id
  left join public.shift_matches m on m.shift_id = a.shift_id and m.worker_id = a.worker_id
  where s.job_id = p_job_id and a.status = 'applied' and s.status = 'open'
    and s.starts_at > now() and public.can_see_job(p_job_id)
  group by w.id
  order by max(m.rank_score) desc nulls last, min(a.created_at);
$$;

grant execute on function public.apply_for_shifts(uuid[], text),
  public.set_application_note(uuid, text), public.job_applicants(uuid) to authenticated;
