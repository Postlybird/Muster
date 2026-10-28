-- Posting work (brief §4.3): jobs, their shifts, required tickets, site
-- hazards, PPE and photos, plus saved templates. A business builds a job as
-- a draft and posts it with post_job(), which checks everything the brief
-- requires (approval, account terms, the hazard section). Once posted, only
-- admins change a job; cancellations arrive in step 1.9.

create type public.job_type as enum ('single', 'multi_day', 'urgent');
create type public.fill_mode as enum ('pick', 'auto');
create type public.job_status as enum ('draft', 'posted', 'cancelled', 'completed');
create type public.shift_status as enum ('open', 'filled', 'cancelled', 'completed');
create type public.ppe_supplier as enum ('business', 'worker', 'both');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  site_id uuid references public.sites (id),
  category_id uuid references public.categories (id),
  -- The work type's level unless an admin changes it (plan question 4).
  level smallint not null default 1 check (level between 1 and 10),
  type public.job_type not null default 'single',
  headcount smallint not null default 1 check (headcount between 1 and 50),
  fill_mode public.fill_mode not null default 'pick',
  -- Offer to the business's favourites only, for this long, before everyone.
  favourites_first_minutes smallint check (favourites_first_minutes between 5 and 1440),
  police_check_required boolean not null default false,
  instructions text not null default '' check (char_length(instructions) <= 2000),
  report_to_name text check (char_length(report_to_name) <= 80),
  report_to_phone text,
  -- Safety (brief §4.3): hazards are in job_hazards; "no known hazards" is a valid answer.
  no_known_hazards boolean not null default false,
  hazard_notes text not null default '' check (char_length(hazard_notes) <= 2000),
  hazard_controls text not null default '' check (char_length(hazard_controls) <= 2000),
  induction text not null default '' check (char_length(induction) <= 2000),
  ppe_supplied_by public.ppe_supplier not null default 'business',
  ppe_notes text not null default '' check (char_length(ppe_notes) <= 1000),
  -- The estimate shown when it was posted: bill excluding GST, and the GST.
  estimate_cents integer check (estimate_cents >= 0),
  estimate_gst_cents integer check (estimate_gst_cents >= 0),
  -- Post-work steps done, so a draft can be resumed.
  steps text[] not null default '{}',
  copied_from uuid references public.jobs (id),
  status public.job_status not null default 'draft',
  posted_at timestamptz,
  posted_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  cancellation_reason text,
  created_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or (site_id is not null and category_id is not null and posted_at is not null))
);

create index jobs_business_idx on public.jobs (business_id, status) where archived_at is null;
create index jobs_site_idx on public.jobs (site_id);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes smallint not null default 0 check (break_minutes between 0 and 120),
  headcount smallint not null check (headcount between 1 and 50),
  status public.shift_status not null default 'open',
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '14 hours'),
  check (make_interval(mins => break_minutes) < ends_at - starts_at)
);

create index shifts_job_idx on public.shifts (job_id, starts_at);
create index shifts_open_idx on public.shifts (starts_at) where status = 'open';

-- Tickets a job needs: pre-filled from the work type, editable per job.
create table public.job_credentials (
  job_id uuid not null references public.jobs (id),
  credential_type_id uuid not null references public.credential_types (id),
  created_at timestamptz not null default now(),
  primary key (job_id, credential_type_id)
);

create table public.job_hazards (
  job_id uuid not null references public.jobs (id),
  hazard_id uuid not null references public.hazards (id),
  created_at timestamptz not null default now(),
  primary key (job_id, hazard_id)
);

create table public.job_ppe (
  job_id uuid not null references public.jobs (id),
  ppe_item_id uuid not null references public.ppe_items (id),
  created_at timestamptz not null default now(),
  primary key (job_id, ppe_item_id)
);

create index job_credentials_type_idx on public.job_credentials (credential_type_id);
create index job_hazards_hazard_idx on public.job_hazards (hazard_id);
create index job_ppe_item_idx on public.job_ppe (ppe_item_id);

-- Photos of the site or the work, in the job-photos bucket under the business's folder.
create table public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  path text not null,
  sort_order smallint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_photos_job_idx on public.job_photos (job_id) where archived_at is null;

-- A saved job to post again quickly: copying it keeps everything but the dates.
create table public.job_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  job_id uuid not null references public.jobs (id),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid references public.profiles (id) default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index job_templates_one_name on public.job_templates (business_id, lower(btrim(name)))
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Who can see and change a job
-- ---------------------------------------------------------------------------

-- Managers see all their business's jobs; supervisors see jobs at their sites.
create function public.can_see_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and (
        public.is_business_manager(j.business_id)
        or (j.site_id is not null and public.can_see_site(j.site_id))
      )
  );
$$;

-- Owners and managers change a job while it's a draft.
create function public.can_edit_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status = 'draft'
      and j.archived_at is null
      and public.is_business_manager(j.business_id)
  );
$$;

-- A state whose labour hire licence we need but don't hold (brief §4.9).
create function public.state_blocked(p_state text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

grant execute on function public.can_see_job(uuid), public.can_edit_job(uuid),
  public.state_blocked(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
create function public.jobs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    -- The work type sets the level; only admins change it.
    new.level := coalesce(
      (select c.default_level from public.categories c where c.id = new.category_id),
      1
    );
    if new.site_id is not null and not exists (
      select 1 from public.sites s
      where s.id = new.site_id and s.business_id = new.business_id and s.archived_at is null
    ) then
      raise exception 'Choose one of your sites' using errcode = 'check_violation';
    end if;
    if tg_op = 'INSERT' then
      if new.status <> 'draft' or new.posted_at is not null or new.cancelled_at is not null then
        raise exception 'New jobs start as drafts' using errcode = 'insufficient_privilege';
      end if;
      new.created_by := (select auth.uid());
    elsif row(new.business_id, new.status, new.posted_at, new.posted_by, new.cancelled_at,
              new.cancelled_by, new.cancellation_reason, new.created_by, new.copied_from)
          is distinct from
          row(old.business_id, old.status, old.posted_at, old.posted_by, old.cancelled_at,
              old.cancelled_by, old.cancellation_reason, old.created_by, old.copied_from)
    then
      raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_guard before insert or update on public.jobs
  for each row execute function public.jobs_guard();

-- Businesses add shifts as open; later statuses come from booking and the day itself.
create function public.shifts_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.status := 'open';
  end if;
  return new;
end;
$$;

create trigger shifts_defaults before insert on public.shifts
  for each row execute function public.shifts_defaults();

-- Templates must point at one of the business's own jobs.
create function public.job_templates_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.jobs j where j.id = new.job_id and j.business_id = new.business_id
  ) then
    raise exception 'A template must come from one of your jobs' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger job_templates_guard before insert or update on public.job_templates
  for each row execute function public.job_templates_guard();

-- ---------------------------------------------------------------------------
-- Posting (brief §4.3)
-- ---------------------------------------------------------------------------
create function public.post_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs;
  b public.businesses;
  v_state text;
begin
  select * into j from public.jobs where id = p_job_id for update;
  if not found or not public.is_business_manager(j.business_id) then
    raise exception 'Only an owner or manager of the business can post work'
      using errcode = 'insufficient_privilege';
  end if;
  if j.status <> 'draft' or j.archived_at is not null then
    raise exception 'This job has already been posted' using errcode = 'check_violation';
  end if;

  select * into b from public.businesses where id = j.business_id;
  if b.status <> 'approved' or not b.account_terms_approved then
    raise exception 'The business can''t post work yet' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.agreements a
    where a.kind = 'labour_hire_services' and a.is_current and a.jurisdiction is null
      and not exists (
        select 1 from public.agreement_acceptances aa
        where aa.agreement_id = a.id and aa.business_id = b.id
      )
  ) then
    raise exception 'The current Labour Hire Services Agreement hasn''t been accepted'
      using errcode = 'check_violation';
  end if;

  select s.state into v_state from public.sites s
  where s.id = j.site_id and s.business_id = j.business_id and s.archived_at is null;
  if v_state is null then
    raise exception 'Choose a site' using errcode = 'check_violation';
  end if;
  if public.state_blocked(v_state) then
    raise exception 'We can''t place workers in % yet', v_state using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.categories c
    where c.id = j.category_id and c.active and c.archived_at is null
  ) then
    raise exception 'Choose a work type' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.shifts s where s.job_id = j.id) then
    raise exception 'Add at least one shift' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.shifts s where s.job_id = j.id and s.starts_at <= now()) then
    raise exception 'A shift has already started' using errcode = 'check_violation';
  end if;

  -- The hazard section must be complete; "no known hazards" is a valid answer.
  if j.no_known_hazards = exists (select 1 from public.job_hazards h where h.job_id = j.id) then
    raise exception 'Complete the hazards section' using errcode = 'check_violation';
  end if;
  if not j.no_known_hazards and btrim(j.hazard_controls) = '' then
    raise exception 'Describe the controls in place' using errcode = 'check_violation';
  end if;

  update public.jobs
  set status = 'posted', posted_at = now(), posted_by = (select auth.uid()),
      steps = array['what', 'when', 'needs', 'safety', 'review']
  where id = j.id;
end;
$$;

grant execute on function public.post_job(uuid) to authenticated;

-- Copies a job into a new draft (templates and "repeat last job"): everything
-- but the dates and photos. Runs as the caller, so the usual rules apply.
create function public.duplicate_job(p_job_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_new uuid;
begin
  insert into public.jobs (
    business_id, site_id, category_id, type, headcount, fill_mode, favourites_first_minutes,
    police_check_required, instructions, report_to_name, report_to_phone, no_known_hazards,
    hazard_notes, hazard_controls, induction, ppe_supplied_by, ppe_notes, copied_from, steps
  )
  select
    j.business_id,
    case when exists (
      select 1 from public.sites s where s.id = j.site_id and s.archived_at is null
    ) then j.site_id end,
    case when exists (
      select 1 from public.categories c
      where c.id = j.category_id and c.active and c.archived_at is null
    ) then j.category_id end,
    j.type, j.headcount, j.fill_mode, j.favourites_first_minutes, j.police_check_required,
    j.instructions, j.report_to_name, j.report_to_phone, j.no_known_hazards, j.hazard_notes,
    j.hazard_controls, j.induction, j.ppe_supplied_by, j.ppe_notes, j.id,
    array['what', 'needs', 'safety']
  from public.jobs j
  where j.id = p_job_id
  returning id into v_new;

  if v_new is null then
    raise exception 'That job no longer exists' using errcode = 'no_data_found';
  end if;

  insert into public.job_credentials (job_id, credential_type_id)
  select v_new, credential_type_id from public.job_credentials where job_id = p_job_id;
  insert into public.job_hazards (job_id, hazard_id)
  select v_new, hazard_id from public.job_hazards where job_id = p_job_id;
  insert into public.job_ppe (job_id, ppe_item_id)
  select v_new, ppe_item_id from public.job_ppe where job_id = p_job_id;
  return v_new;
end;
$$;

grant execute on function public.duplicate_job(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditing and timestamps
-- ---------------------------------------------------------------------------
create trigger jobs_audit after insert or update on public.jobs
  for each row execute function public.audit_row_change();
create trigger shifts_audit after insert or update on public.shifts
  for each row execute function public.audit_row_change();

create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger shifts_set_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();
create trigger job_photos_set_updated_at before update on public.job_photos
  for each row execute function public.set_updated_at();
create trigger job_templates_set_updated_at before update on public.job_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.shifts enable row level security;
alter table public.job_credentials enable row level security;
alter table public.job_hazards enable row level security;
alter table public.job_ppe enable row level security;
alter table public.job_photos enable row level security;
alter table public.job_templates enable row level security;

grant all on public.jobs, public.shifts, public.job_credentials, public.job_hazards,
  public.job_ppe, public.job_photos, public.job_templates to service_role;
grant select, insert, update on public.jobs, public.shifts, public.job_photos,
  public.job_templates to authenticated;
-- Draft shifts are replaced when the dates change; child rows are ticked and unticked.
grant delete on public.shifts to authenticated;
grant select, insert, delete on public.job_credentials, public.job_hazards, public.job_ppe
  to authenticated;

create policy "jobs: business members read" on public.jobs
  for select to authenticated
  using (
    (select public.is_business_manager(business_id))
    or (site_id is not null and (select public.can_see_site(site_id)))
  );
create policy "jobs: managers start drafts" on public.jobs
  for insert to authenticated
  with check ((select public.is_business_manager(business_id)) and status = 'draft');
create policy "jobs: managers change drafts" on public.jobs
  for update to authenticated
  using ((select public.is_business_manager(business_id)) and status = 'draft')
  with check ((select public.is_business_manager(business_id)));
create policy "jobs: admins" on public.jobs
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "shifts: business members read" on public.shifts
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "shifts: managers add to drafts" on public.shifts
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "shifts: managers change drafts" on public.shifts
  for update to authenticated
  using ((select public.can_edit_job(job_id))) with check ((select public.can_edit_job(job_id)));
create policy "shifts: managers remove from drafts" on public.shifts
  for delete to authenticated using ((select public.can_edit_job(job_id)));
create policy "shifts: admins" on public.shifts
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "job_credentials: business members read" on public.job_credentials
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "job_credentials: managers tick" on public.job_credentials
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "job_credentials: managers untick" on public.job_credentials
  for delete to authenticated using ((select public.can_edit_job(job_id)));
create policy "job_credentials: admins" on public.job_credentials
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "job_hazards: business members read" on public.job_hazards
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "job_hazards: managers tick" on public.job_hazards
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "job_hazards: managers untick" on public.job_hazards
  for delete to authenticated using ((select public.can_edit_job(job_id)));
create policy "job_hazards: admins" on public.job_hazards
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "job_ppe: business members read" on public.job_ppe
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "job_ppe: managers tick" on public.job_ppe
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "job_ppe: managers untick" on public.job_ppe
  for delete to authenticated using ((select public.can_edit_job(job_id)));
create policy "job_ppe: admins" on public.job_ppe
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "job_photos: business members read" on public.job_photos
  for select to authenticated using ((select public.can_see_job(job_id)));
create policy "job_photos: managers add to drafts" on public.job_photos
  for insert to authenticated
  with check (
    (select public.can_edit_job(job_id))
    and split_part(path, '/', 1) = (select public.my_business_id())::text
  );
create policy "job_photos: managers remove from drafts" on public.job_photos
  for update to authenticated
  using ((select public.can_edit_job(job_id))) with check ((select public.can_edit_job(job_id)));
create policy "job_photos: admins" on public.job_photos
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "job_templates: managers" on public.job_templates
  for select to authenticated using ((select public.is_business_manager(business_id)));
create policy "job_templates: managers save" on public.job_templates
  for insert to authenticated with check ((select public.is_business_manager(business_id)));
create policy "job_templates: managers rename or remove" on public.job_templates
  for update to authenticated
  using ((select public.is_business_manager(business_id)))
  with check ((select public.is_business_manager(business_id)));
create policy "job_templates: admins" on public.job_templates
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Job photos: private, in a folder named after the business.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('job-photos', 'job-photos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "job photos: managers upload to their business folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (select public.my_business_id())::text
    and (select public.is_business_manager(public.my_business_id()))
  );

create policy "job photos: business members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (select public.my_business_id())::text
  );

create policy "job photos: admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (select public.is_admin()));
