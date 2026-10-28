-- Admin console lists (brief §6): every worker, filtered by status, work
-- type, ticket, suburb or papers running out soon, a page at a time.
-- Admins only.
create function public.admin_worker_list(
  p_search text default null,
  p_status public.worker_status default null,
  p_category_id uuid default null,
  p_credential_type_id uuid default null,
  p_suburb text default null,
  p_expiring_within_days integer default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  worker_id uuid,
  preferred_name text,
  legal_first_name text,
  legal_last_name text,
  status public.worker_status,
  home_suburb text,
  home_postcode text,
  categories text[],
  rating_avg numeric,
  reliability_score numeric,
  shifts_completed integer,
  next_expiry date,
  next_expiry_what text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      (now() at time zone 'Australia/Sydney')::date as today,
      nullif(lower(trim(p_search)), '') as search,
      -- A mobile number however it's typed: 0412 345 678 or +61 412 345 678.
      case when length(regexp_replace(coalesce(p_search, ''), '\D', '', 'g')) >= 6
        then regexp_replace(regexp_replace(p_search, '\D', '', 'g'), '^0', '61')
      end as digits,
      nullif(lower(trim(p_suburb)), '') as suburb,
      public.setting_numeric('police_check_max_age_months', 12)::integer as police_months
  ),
  -- Papers that run out: tickets, police checks (by their age) and visas.
  papers as (
    select wc.worker_id, t.name as what,
      coalesce(
        wc.expires_on,
        case when t.kind = 'police_check' and wc.issued_on is not null
          then (wc.issued_on + make_interval(months => params.police_months))::date - 1
        end
      ) as until
    from public.worker_credentials wc
    join public.credential_types t on t.id = wc.credential_type_id
    cross join params
    where wc.status = 'verified' and wc.archived_at is null
    union all
    select r.worker_id, 'Visa', r.visa_expiry
    from public.work_rights r
    where r.status = 'verified' and r.basis = 'visa' and r.visa_expiry is not null
  ),
  next_expiry as (
    select distinct on (p.worker_id) p.worker_id, p.until, p.what
    from papers p
    cross join params
    where p.until >= params.today
    order by p.worker_id, p.until, p.what
  ),
  found as (
    select w.id, w.preferred_name, w.legal_first_name, w.legal_last_name, w.status,
      w.home_suburb, w.home_postcode, w.rating_avg, w.reliability_score, w.shifts_completed,
      ne.until, ne.what
    from public.workers w
    join public.profiles pr on pr.id = w.profile_id
    left join next_expiry ne on ne.worker_id = w.id
    cross join params
    where (select public.is_admin())
      and w.archived_at is null
      and (p_status is null or w.status = p_status)
      and (
        params.search is null
        or position(params.search in lower(concat_ws(' | ',
          concat_ws(' ', w.preferred_name, w.legal_last_name),
          concat_ws(' ', w.legal_first_name, w.legal_last_name),
          pr.email))) > 0
        or position(params.digits in regexp_replace(coalesce(pr.phone, ''), '\D', '', 'g')) > 0
      )
      and (
        params.suburb is null
        or position(params.suburb in lower(concat_ws(' ', w.home_suburb, w.home_postcode))) > 0
      )
      and (p_category_id is null or exists (
        select 1 from public.worker_categories c
        where c.worker_id = w.id and c.category_id = p_category_id
      ))
      and (p_credential_type_id is null or exists (
        select 1 from public.worker_credentials wc
        where wc.worker_id = w.id and wc.credential_type_id = p_credential_type_id
          and wc.status = 'verified' and wc.archived_at is null
      ))
      and (p_expiring_within_days is null or ne.until <= params.today + p_expiring_within_days)
  )
  select f.id, f.preferred_name, f.legal_first_name, f.legal_last_name, f.status,
    f.home_suburb, f.home_postcode,
    array(
      select c.name
      from public.worker_categories wcat
      join public.categories c on c.id = wcat.category_id
      where wcat.worker_id = f.id
      order by c.name
    ),
    f.rating_avg, f.reliability_score, f.shifts_completed, f.until, f.what,
    count(*) over ()
  from found f
  -- By name; people who haven't given one yet come last.
  order by coalesce(f.preferred_name, f.legal_first_name) is null,
    lower(coalesce(f.preferred_name, f.legal_first_name)), lower(f.legal_last_name), f.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.admin_worker_list(
  text, public.worker_status, uuid, uuid, text, integer, integer, integer
) to authenticated;
