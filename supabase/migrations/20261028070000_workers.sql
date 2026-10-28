-- Phase 1.2: workers and everything they provide during onboarding
-- (brief §4.1): profile, right to work, identity, work types, tickets,
-- availability, plus private file storage.
--
-- Workers edit their own records, but verification fields (statuses,
-- reviewer, VEVO results, ratings, payroll) are admin-only. Triggers enforce
-- that for direct API calls; trusted server code and admins bypass them.
-- File paths must point into the worker's own storage folder.

create type public.worker_status as enum ('draft', 'pending', 'active', 'suspended', 'offboarded');
create type public.check_status as enum ('pending', 'verified', 'rejected', 'expired');
create type public.licence_class as enum ('none', 'C', 'MR', 'HR');
create type public.right_to_work_basis as enum ('citizen', 'permanent_resident', 'nz_citizen', 'visa');
create type public.citizenship_evidence as enum (
  'australian_passport',
  'birth_certificate',
  'citizenship_certificate'
);
create type public.identity_document as enum ('driver_licence', 'passport');
create type public.payroll_status as enum ('not_started', 'invited', 'complete');

-- ---------------------------------------------------------------------------
-- Workers
-- ---------------------------------------------------------------------------
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id),
  legal_first_name text,
  legal_last_name text,
  preferred_name text,
  date_of_birth date check (date_of_birth > '1900-01-01'),
  photo_path text,
  photo_status public.check_status,
  photo_rejection_reason text,
  home_suburb text,
  home_postcode text,
  home_state text not null default 'NSW',
  home_lat numeric(9, 6),
  home_lng numeric(9, 6),
  travel_radius_km integer not null default 30 check (travel_radius_km between 1 and 300),
  has_car boolean,
  licence_class public.licence_class,
  uses_public_transport boolean,
  bio text check (char_length(bio) <= 500),
  urgent_opt_in boolean not null default false,
  available_now_until timestamptz,
  -- Wizard steps the worker has finished (brief: onboarding step statuses).
  onboarding_steps text[] not null default '{}',
  status public.worker_status not null default 'draft',
  status_reason text,
  submitted_at timestamptz,
  activated_at timestamptz,
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,
  reliability_score numeric(5, 2),
  shifts_completed integer not null default 0,
  payroll_employee_id text,
  payroll_status public.payroll_status not null default 'not_started',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.workers.photo_path is 'Face photo in the worker-photos bucket, shown to supervisors so they know who is arriving.';

create index workers_status_idx on public.workers (status) where archived_at is null;

-- The signed-in worker's id (null for anyone else).
create function public.my_worker_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id from public.workers w where w.profile_id = (select auth.uid()) and w.archived_at is null;
$$;

grant execute on function public.my_worker_id() to authenticated, service_role;

-- Uploaded files live under a folder named after the worker's id.
create function public.in_worker_folder(p_path text, p_worker_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_path is null or (p_path like p_worker_id::text || '/%' and p_path not like '%..%');
$$;

grant execute on function public.in_worker_folder(text, uuid) to authenticated, service_role;

-- Every worker login gets a worker record. If someone stops being a worker
-- (for example a staff member made an admin), the record is archived.
create function public.handle_worker_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.role is not distinct from old.role then
    return new;
  end if;
  if new.role = 'worker' then
    insert into public.workers (profile_id) values (new.id)
    on conflict (profile_id) do update set archived_at = null;
  elsif tg_op = 'UPDATE' and old.role = 'worker' then
    update public.workers set archived_at = now() where profile_id = new.id and archived_at is null;
  end if;
  return new;
end;
$$;

create trigger on_profile_role_set
  after insert or update of role on public.profiles
  for each row execute function public.handle_worker_role();

insert into public.workers (profile_id)
select id from public.profiles where role = 'worker'
on conflict (profile_id) do nothing;

-- Workers can't change their own status, ratings, payroll or photo review.
create function public.workers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.id is distinct from old.id
      or new.profile_id is distinct from old.profile_id
      or new.status is distinct from old.status
      or new.status_reason is distinct from old.status_reason
      or new.submitted_at is distinct from old.submitted_at
      or new.activated_at is distinct from old.activated_at
      or new.photo_status is distinct from old.photo_status
      or new.photo_rejection_reason is distinct from old.photo_rejection_reason
      or new.rating_avg is distinct from old.rating_avg
      or new.rating_count is distinct from old.rating_count
      or new.reliability_score is distinct from old.reliability_score
      or new.shifts_completed is distinct from old.shifts_completed
      or new.payroll_employee_id is distinct from old.payroll_employee_id
      or new.payroll_status is distinct from old.payroll_status
      or new.archived_at is distinct from old.archived_at
    then
      raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
    end if;
    -- Names and date of birth are fixed once photo ID has been checked.
    if (new.legal_first_name is distinct from old.legal_first_name
        or new.legal_last_name is distinct from old.legal_last_name
        or new.date_of_birth is distinct from old.date_of_birth)
      and exists (
        select 1 from public.identity_checks i where i.worker_id = new.id and i.status = 'verified'
      )
    then
      raise exception 'Your ID has been checked, so contact us to change your legal name or date of birth.'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.in_worker_folder(new.photo_path, new.id) then
      raise exception 'That file is not in your folder' using errcode = 'check_violation';
    end if;
    -- A new photo goes back for checking.
    if new.photo_path is distinct from old.photo_path then
      new.photo_status := case when new.photo_path is null then null else 'pending'::public.check_status end;
      new.photo_rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger workers_guard before update on public.workers
  for each row execute function public.workers_guard();

-- ---------------------------------------------------------------------------
-- Right to work (brief §4.1 step 3). Citizens upload proof of citizenship;
-- everyone else gives passport and visa details and consents to a VEVO
-- check, whose result an admin records.
-- ---------------------------------------------------------------------------
create table public.work_rights (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null unique references public.workers (id),
  basis public.right_to_work_basis not null,
  citizenship_evidence public.citizenship_evidence,
  evidence_path text,
  evidence_deleted_at timestamptz,
  passport_number text,
  passport_country text,
  visa_grant_number text,
  visa_subclass text,
  vevo_consent_at timestamptz,
  -- Recorded by an admin after checking.
  status public.check_status not null default 'pending',
  rejection_reason text,
  vevo_checked_at timestamptz,
  vevo_reference text,
  visa_expiry date,
  visa_conditions text,
  work_limit_flag boolean not null default false,
  next_check_due date,
  checked_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (basis <> 'citizen' or citizenship_evidence is not null),
  check (basis = 'citizen' or vevo_consent_at is not null)
);

-- ---------------------------------------------------------------------------
-- Identity check (brief §4.1 step 4): photo ID plus a selfie, reviewed by an
-- admin. The images are deleted after verification; the outcome is kept.
-- ---------------------------------------------------------------------------
create table public.identity_checks (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null unique references public.workers (id),
  document_type public.identity_document not null,
  document_path text,
  selfie_path text,
  status public.check_status not null default 'pending',
  rejection_reason text,
  document_reference text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  images_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Work types and tickets
-- ---------------------------------------------------------------------------
create table public.worker_categories (
  worker_id uuid not null references public.workers (id),
  category_id uuid not null references public.categories (id),
  years_experience smallint not null default 0 check (years_experience between 0 and 60),
  -- Set by an admin (rate card level the worker can work at).
  level smallint not null default 1 check (level between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (worker_id, category_id)
);

create index worker_categories_category_idx on public.worker_categories (category_id);

create table public.worker_credentials (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  credential_type_id uuid not null references public.credential_types (id),
  number text,
  issued_on date,
  expires_on date,
  document_path text,
  -- Police certificates are deleted after checking; the outcome is kept.
  document_deleted_at timestamptz,
  status public.check_status not null default 'pending',
  rejection_reason text,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  -- Which expiry warning (30/14/7 days) was last sent.
  last_expiry_warning_days integer,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

-- A renewed ticket can wait for checking while the current one still counts:
-- at most one unchecked (pending or rejected) and one verified per type.
-- Verifying a renewal archives the ticket it replaces.
create unique index worker_credentials_one_open on public.worker_credentials (worker_id, credential_type_id)
  where archived_at is null and status in ('pending', 'rejected');
create unique index worker_credentials_one_verified on public.worker_credentials (worker_id, credential_type_id)
  where archived_at is null and status = 'verified';
create index worker_credentials_expiry_idx on public.worker_credentials (expires_on)
  where status = 'verified' and archived_at is null;

-- ---------------------------------------------------------------------------
-- Availability (brief §4.1 step 8): a weekly pattern and blocked-out dates.
-- weekday is ISO: 1 = Monday ... 7 = Sunday. A window ending before it
-- starts runs past midnight.
-- ---------------------------------------------------------------------------
create table public.availability_weekly (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (worker_id, weekday)
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (worker_id, date)
);

-- ---------------------------------------------------------------------------
-- Guards: workers can't verify their own documents. Changing a document
-- sends it back for checking; verified tickets can't be edited (add the
-- renewed one instead).
-- ---------------------------------------------------------------------------
create function public.work_rights_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'UPDATE' and old.status = 'verified' then
      raise exception 'Your right to work has been verified. Contact us to change it.'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.in_worker_folder(new.evidence_path, new.worker_id) then
      raise exception 'That file is not in your folder' using errcode = 'check_violation';
    end if;
    new.status := 'pending';
    new.rejection_reason := null;
    new.vevo_checked_at := null;
    new.vevo_reference := null;
    new.visa_expiry := null;
    new.visa_conditions := null;
    new.work_limit_flag := false;
    new.next_check_due := null;
    new.checked_by := null;
    new.evidence_deleted_at := null;
  end if;
  return new;
end;
$$;

create trigger work_rights_guard before insert or update on public.work_rights
  for each row execute function public.work_rights_guard();

create function public.identity_checks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'UPDATE' and old.status = 'verified' then
      raise exception 'Your identity has been verified already.'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.in_worker_folder(new.document_path, new.worker_id)
      or not public.in_worker_folder(new.selfie_path, new.worker_id)
    then
      raise exception 'That file is not in your folder' using errcode = 'check_violation';
    end if;
    new.status := 'pending';
    new.rejection_reason := null;
    new.document_reference := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.images_deleted_at := null;
  end if;
  return new;
end;
$$;

create trigger identity_checks_guard before insert or update on public.identity_checks
  for each row execute function public.identity_checks_guard();

create function public.worker_credentials_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if not public.in_worker_folder(new.document_path, new.worker_id) then
      raise exception 'That file is not in your folder' using errcode = 'check_violation';
    end if;

    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.rejection_reason := null;
      new.verified_by := null;
      new.verified_at := null;
      new.last_expiry_warning_days := null;
      new.document_deleted_at := null;
      return new;
    end if;

    if new.status is distinct from old.status
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
      or new.rejection_reason is distinct from old.rejection_reason
      or new.last_expiry_warning_days is distinct from old.last_expiry_warning_days
      or new.document_deleted_at is distinct from old.document_deleted_at
      or new.worker_id is distinct from old.worker_id
    then
      raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
    end if;

    if row(new.credential_type_id, new.number, new.issued_on, new.expires_on, new.document_path)
       is distinct from row(old.credential_type_id, old.number, old.issued_on, old.expires_on, old.document_path)
    then
      if old.status = 'verified' then
        raise exception 'A verified ticket can''t be edited. Add the renewed ticket instead.'
          using errcode = 'insufficient_privilege';
      end if;
      new.status := 'pending';
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger worker_credentials_guard before insert or update on public.worker_credentials
  for each row execute function public.worker_credentials_guard();

create function public.worker_categories_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.level := 1;
    elsif new.level is distinct from old.level then
      raise exception 'Only an admin can change your level' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger worker_categories_guard before insert or update on public.worker_categories
  for each row execute function public.worker_categories_guard();

-- ---------------------------------------------------------------------------
-- Submitting for verification (brief §4.1 step 10).
-- ---------------------------------------------------------------------------
-- The app checks each step as it's saved; this is the last line of defence.
create function public.submit_worker_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.workers;
  v_min_age integer;
begin
  select * into w from public.workers where profile_id = (select auth.uid()) for update;
  if not found then
    raise exception 'No worker record' using errcode = 'no_data_found';
  end if;
  if w.status <> 'draft' then
    raise exception 'Already submitted' using errcode = 'check_violation';
  end if;
  if w.legal_first_name is null or w.legal_last_name is null or w.date_of_birth is null
    or w.photo_path is null or w.home_suburb is null
    or not exists (select 1 from public.work_rights where worker_id = w.id)
    or not exists (select 1 from public.identity_checks where worker_id = w.id)
    or not exists (select 1 from public.worker_categories where worker_id = w.id)
  then
    raise exception 'Some required steps are not finished' using errcode = 'check_violation';
  end if;

  select coalesce((select (s.value #>> '{}')::integer from public.settings s where s.key = 'min_worker_age'), 18)
    into v_min_age;
  if w.date_of_birth > (now() at time zone 'Australia/Sydney')::date - make_interval(years => v_min_age) then
    raise exception 'You must be at least % to work with us', v_min_age using errcode = 'check_violation';
  end if;

  -- Every current employment document must be acknowledged (brief §4.1 step 9).
  if exists (
    select 1 from public.agreements a
    where a.is_current
      and a.kind in (
        'casual_employment_contract',
        'fair_work_information_statement',
        'casual_employment_information_statement'
      )
      and not exists (
        select 1 from public.agreement_acceptances aa
        where aa.agreement_id = a.id and aa.profile_id = w.profile_id
      )
  ) then
    raise exception 'Some employment documents have not been accepted' using errcode = 'check_violation';
  end if;

  update public.workers
  set status = 'pending', submitted_at = now()
  where id = w.id;
end;
$$;

grant execute on function public.submit_worker_onboarding() to authenticated;

-- ---------------------------------------------------------------------------
-- Auditing. Changes to worker records name the worker as the subject.
-- Passport and visa grant numbers are redacted in the audit log.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_subject uuid;
  v_subject_value text;
  v_col text;
  i int;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_before := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_after := to_jsonb(new); end if;

  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return new;
  end if;

  if tg_nargs > 0 and tg_argv[0] <> '' then
    v_subject_value := coalesce(v_after ->> tg_argv[0], v_before ->> tg_argv[0]);
    if tg_argv[0] = 'worker_id' then
      -- Tables keyed by worker: the subject is that worker's profile.
      select w.profile_id into v_subject from public.workers w where w.id = v_subject_value::uuid;
    else
      v_subject := v_subject_value::uuid;
    end if;
  end if;

  if tg_nargs > 1 then
    for i in 1 .. tg_nargs - 1 loop
      v_col := tg_argv[i];
      if v_before ? v_col and v_before ->> v_col is not null then
        v_before := jsonb_set(v_before, array[v_col], '"[redacted]"');
      end if;
      if v_after ? v_col and v_after ->> v_col is not null then
        v_after := jsonb_set(v_after, array[v_col], '"[redacted]"');
      end if;
    end loop;
  end if;

  insert into public.audit_log (
    actor_id, actor_role, action, table_name, record_id, subject_profile_id, before, after
  )
  values (
    (select auth.uid()),
    coalesce(nullif(auth.role(), ''), session_user),
    lower(tg_op),
    tg_table_name,
    coalesce(v_after ->> 'id', v_before ->> 'id', v_after ->> 'key', v_before ->> 'key'),
    v_subject,
    v_before,
    v_after
  );

  return coalesce(new, old);
end;
$$;

create trigger workers_audit after insert or update on public.workers
  for each row execute function public.audit_row_change('profile_id');
create trigger work_rights_audit after insert or update on public.work_rights
  for each row execute function public.audit_row_change('worker_id', 'passport_number', 'visa_grant_number');
create trigger identity_checks_audit after insert or update on public.identity_checks
  for each row execute function public.audit_row_change('worker_id');
create trigger worker_credentials_audit after insert or update on public.worker_credentials
  for each row execute function public.audit_row_change('worker_id');
create trigger worker_categories_audit after insert or update or delete on public.worker_categories
  for each row execute function public.audit_row_change('worker_id');

create trigger workers_set_updated_at before update on public.workers
  for each row execute function public.set_updated_at();
create trigger work_rights_set_updated_at before update on public.work_rights
  for each row execute function public.set_updated_at();
create trigger identity_checks_set_updated_at before update on public.identity_checks
  for each row execute function public.set_updated_at();
create trigger worker_credentials_set_updated_at before update on public.worker_credentials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and row level security. Businesses never read these tables; they
-- get a limited worker view later (step 1.8).
-- ---------------------------------------------------------------------------
alter table public.workers enable row level security;
alter table public.work_rights enable row level security;
alter table public.identity_checks enable row level security;
alter table public.worker_categories enable row level security;
alter table public.worker_credentials enable row level security;
alter table public.availability_weekly enable row level security;
alter table public.availability_blocks enable row level security;

grant all on public.workers, public.work_rights, public.identity_checks, public.worker_categories,
  public.worker_credentials, public.availability_weekly, public.availability_blocks to service_role;

grant select, update on public.workers to authenticated;
grant select, insert, update on public.work_rights, public.identity_checks, public.worker_credentials
  to authenticated;
grant select, insert, update, delete on public.worker_categories, public.availability_weekly,
  public.availability_blocks to authenticated;

create policy "workers: read own" on public.workers
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "workers: update own" on public.workers
  for update to authenticated
  using (profile_id = (select auth.uid()) and archived_at is null)
  with check (profile_id = (select auth.uid()));
create policy "workers: admins" on public.workers
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'work_rights', 'identity_checks', 'worker_credentials', 'worker_categories',
    'availability_weekly', 'availability_blocks'
  ] loop
    execute format(
      'create policy "%1$s: own" on public.%1$I for all to authenticated
         using (worker_id = (select public.my_worker_id()))
         with check (worker_id = (select public.my_worker_id()))', t);
    execute format(
      'create policy "%1$s: admins" on public.%1$I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private file storage (brief §4.9): short-lived signed links only.
-- Files live under a folder named after the worker's id.
--   worker-photos  face photo (shown to supervisors via the server)
--   identity       photo ID, selfie, citizenship evidence and police
--                  certificates: workers can upload but not read them back,
--                  and they're deleted after verification
--   worker-docs    ticket copies, kept (hosts and insurers ask for them)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('worker-photos', 'worker-photos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('identity', 'identity', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']),
  ('worker-docs', 'worker-docs', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

create policy "worker files: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('worker-photos', 'identity', 'worker-docs')
    and (storage.foldername(name))[1] = (select public.my_worker_id())::text
  );

-- Workers can see their own photo and documents, but not their ID images.
create policy "worker files: read own photo and documents"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('worker-photos', 'worker-docs')
    and (storage.foldername(name))[1] = (select public.my_worker_id())::text
  );
