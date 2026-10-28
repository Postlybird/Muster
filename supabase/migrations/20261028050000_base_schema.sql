-- Base schema: roles, profiles, settings, audit log, demo outbox and the
-- access helpers every later migration relies on.
--
-- Conventions (see CLAUDE.md):
-- * RLS is enabled on every table; access is granted explicitly per table
--   because the hosted project does not auto-expose new tables.
-- * Rows are archived (archived_at), never hard-deleted.
-- * Functions are not executable by API roles unless granted.

-- ---------------------------------------------------------------------------
-- Default privileges: nothing new in public is reachable by API roles unless
-- a migration grants it.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
-- Postgres lets everyone (PUBLIC) execute new functions. That default is
-- global, so it can only be revoked globally, not per schema.
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.prevent_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows cannot be changed or deleted', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: one per login. Role decides which part of the app a user sees.
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('worker', 'business_user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  role public.user_role not null,
  full_name text,
  email text,
  phone text,
  notification_prefs jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per login. Email and phone mirror auth.users (verified there).';
comment on column public.profiles.phone is 'E.164, e.g. +61412345678.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies can call them without
-- recursing into profiles' own RLS.
-- ---------------------------------------------------------------------------
create function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.archived_at is null;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.archived_at is null
  );
$$;

grant execute on function public.my_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- New logins get a profile. Self sign-up can only create workers or business
-- users; admins are promoted by an existing admin, never via sign-up data.
-- ---------------------------------------------------------------------------
create function public.normalise_auth_phone(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when raw is null or raw = '' then null
    when left(raw, 1) = '+' then raw
    else '+' || raw
  end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'signup_role';
begin
  insert into public.profiles (id, role, email, phone, full_name)
  values (
    new.id,
    case when requested = 'business_user' then 'business_user'::public.user_role
         else 'worker'::public.user_role end,
    nullif(new.email, ''),
    public.normalise_auth_phone(new.phone),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep profiles.email/phone in step with the verified values in auth.users.
create function public.handle_auth_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = nullif(new.email, ''),
      phone = public.normalise_auth_phone(new.phone)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row
  when (old.email is distinct from new.email or old.phone is distinct from new.phone)
  execute function public.handle_auth_user_contact_change();

-- ---------------------------------------------------------------------------
-- Settings: admin-managed policy values (cancellation windows, geofence
-- radius, on-costs...). Non-public keys (margin, on-costs) are admin-only.
-- ---------------------------------------------------------------------------
create table public.settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  value jsonb not null,
  description text not null default '',
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.settings.is_public is 'Readable by any signed-in user. Keep commercial values (margin, on-costs) private.';

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log: who viewed, changed or verified personal records, and when.
-- Append-only: no API role can write to it directly, and nobody can change
-- or delete a row once written.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text not null,
  action text not null,
  table_name text,
  record_id text,
  subject_profile_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  context jsonb not null default '{}'::jsonb
);

comment on table public.audit_log is 'Append-only. actor_id is null for system jobs. subject_profile_id is whose personal data was touched.';

create index audit_log_subject_idx on public.audit_log (subject_profile_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

create trigger audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function public.prevent_change();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.prevent_change();

-- Generic change trigger. Arguments (both optional):
--   tg_argv[0]  column holding the profile id whose data this row is about
--   tg_argv[1+] columns to redact in before/after (e.g. passport numbers)
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_subject uuid;
  v_col text;
  i int;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_before := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_after := to_jsonb(new); end if;

  -- Ignore updates that only touched updated_at.
  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return new;
  end if;

  if tg_nargs > 0 and tg_argv[0] <> '' then
    v_subject := coalesce(v_after ->> tg_argv[0], v_before ->> tg_argv[0])::uuid;
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

-- Server code records views, downloads, verifications and exports here.
-- The actor is always the caller; it can't be spoofed.
create function public.log_access_event(
  p_action text,
  p_table_name text,
  p_record_id text,
  p_subject_profile_id uuid default null,
  p_context jsonb default '{}'::jsonb,
  p_ip inet default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_action !~ '^[a-z][a-z_]*$' then
    raise exception 'invalid audit action %', p_action;
  end if;

  insert into public.audit_log (
    actor_id, actor_role, action, table_name, record_id, subject_profile_id,
    context, ip, user_agent
  )
  values (
    (select auth.uid()),
    coalesce(public.my_role()::text, nullif(auth.role(), ''), session_user),
    p_action,
    p_table_name,
    p_record_id,
    p_subject_profile_id,
    coalesce(p_context, '{}'::jsonb),
    p_ip,
    p_user_agent
  );
end;
$$;

grant execute on function public.log_access_event(text, text, text, uuid, jsonb, inet, text)
  to authenticated, service_role;

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change('id');

create trigger settings_audit
  after insert or update or delete on public.settings
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Demo outbox: in demo mode every email, SMS and push message (including
-- login codes) lands here instead of being sent. Read via the service role
-- only, and only when DEMO_MODE is on.
-- ---------------------------------------------------------------------------
create table public.dev_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'sms', 'push')),
  recipient text not null,
  subject text,
  body text not null,
  meta jsonb not null default '{}'::jsonb
);

create index dev_outbox_recipient_idx on public.dev_outbox (recipient, created_at desc);

-- Supabase Auth hooks: login codes go to the outbox (demo mode).
create function public.hook_send_sms(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalise_auth_phone(event -> 'user' ->> 'phone');
  v_otp text := event -> 'sms' ->> 'otp';
begin
  insert into public.dev_outbox (channel, recipient, body, meta)
  values (
    'sms',
    coalesce(v_phone, 'unknown'),
    'Your sign-in code is ' || v_otp || '. It expires in 15 minutes.',
    jsonb_build_object('kind', 'auth_otp', 'otp', v_otp)
  );
  return '{}'::jsonb;
end;
$$;

create function public.hook_send_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := event -> 'user' ->> 'email';
  v_data jsonb := event -> 'email_data';
  v_action text := v_data ->> 'email_action_type';
  v_token text := v_data ->> 'token';
  v_hash text := v_data ->> 'token_hash';
  v_base text := coalesce(nullif(v_data ->> 'redirect_to', ''), (v_data ->> 'site_url') || '/auth/confirm');
  v_type text;
  v_link text;
begin
  -- verifyOtp() type for each email action.
  v_type := case v_action
    when 'signup' then 'email'
    when 'magiclink' then 'email'
    when 'email_change' then 'email_change'
    else v_action
  end;

  v_link := v_base
    || case when position('?' in v_base) > 0 then '&' else '?' end
    || 'token_hash=' || v_hash || '&type=' || v_type;

  insert into public.dev_outbox (channel, recipient, subject, body, meta)
  values (
    'email',
    coalesce(v_email, 'unknown'),
    'Your sign-in code',
    'Your sign-in code is ' || v_token || '. It expires in 15 minutes.' || chr(10) || chr(10)
      || 'Or sign in with this link: ' || v_link,
    jsonb_build_object('kind', 'auth_' || v_action, 'otp', v_token, 'link', v_link)
  );
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_send_sms(jsonb) to supabase_auth_admin;
grant execute on function public.hook_send_email(jsonb) to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.dev_outbox enable row level security;

grant all on public.profiles, public.settings, public.audit_log, public.dev_outbox to service_role;

-- profiles: users read their own row and may edit only their name and
-- notification preferences (column-level grant). Admins read everyone.
grant select on public.profiles to authenticated;
grant update (full_name, notification_prefs) on public.profiles to authenticated;

create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admins read all" on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and archived_at is null)
  with check (id = (select auth.uid()));

-- settings: signed-in users read public keys; admins read and edit all.
grant select, insert, update on public.settings to authenticated;

create policy "settings: read public" on public.settings
  for select to authenticated
  using (is_public);

create policy "settings: admins read all" on public.settings
  for select to authenticated
  using ((select public.is_admin()));

create policy "settings: admins insert" on public.settings
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "settings: admins update" on public.settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- audit_log: admins read; writes only through the functions above.
grant select on public.audit_log to authenticated;

create policy "audit_log: admins read" on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

-- dev_outbox: no API access except the service role (demo mode page).
