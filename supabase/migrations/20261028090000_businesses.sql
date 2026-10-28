-- Phase 1.4: businesses (hosts), their people and their sites (brief §4.2).
--
-- One business per login in v1. ABN details come from the Australian
-- Business Register and are written by the server, so users can't change
-- them; owners edit their contact details, sites and team. Approval and
-- account terms are admin-only.

create type public.business_status as enum ('draft', 'pending', 'approved', 'suspended');
create type public.business_role as enum ('owner', 'manager', 'supervisor');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  -- From the ABR (written by the server after a lookup).
  abn text not null check (abn ~ '^\d{11}$'),
  legal_name text not null,
  entity_type_code text,
  entity_type text,
  abn_status text not null check (abn_status in ('active', 'cancelled')),
  abn_status_from date,
  gst_registered boolean not null default false,
  gst_registered_from date,
  acn text,
  abr_state text,
  abr_postcode text,
  abr_checked_at timestamptz not null,
  -- Entered by the owner.
  trading_name text,
  billing_contact_name text,
  billing_contact_phone text,
  accounts_email text,
  onboarding_steps text[] not null default '{}',
  -- Admin only.
  status public.business_status not null default 'draft',
  status_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id),
  account_terms_approved boolean not null default false,
  payment_terms_days integer check (payment_terms_days between 0 and 90),
  stripe_customer_id text,
  created_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A cancelled ABN can't be approved (brief §4.2: block cancelled ABNs).
  check (abn_status = 'active' or status in ('draft', 'suspended'))
);

create unique index businesses_one_per_abn on public.businesses (abn) where archived_at is null;
create index businesses_status_idx on public.businesses (status) where archived_at is null;

-- People in a business. An invited person has an email until they sign in
-- and the invite is matched to their account.
create table public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  profile_id uuid references public.profiles (id),
  role public.business_role not null,
  invite_email text check (invite_email = lower(invite_email)),
  invited_by uuid references public.profiles (id),
  invited_at timestamptz,
  accepted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_id is not null or invite_email is not null)
);

create unique index business_users_one_business_per_login on public.business_users (profile_id)
  where archived_at is null and profile_id is not null;
create unique index business_users_one_invite on public.business_users (business_id, invite_email)
  where archived_at is null and profile_id is null;
create index business_users_business_idx on public.business_users (business_id) where archived_at is null;

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  name text not null check (char_length(name) between 1 and 80),
  address_line1 text not null,
  suburb text not null,
  state text not null references public.jurisdictions (code),
  postcode text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  -- Null uses the geofence_radius_m setting.
  geofence_radius_m integer check (geofence_radius_m between 50 and 5000),
  access_notes text check (char_length(access_notes) <= 1000),
  parking_notes text check (char_length(parking_notes) <= 1000),
  report_to_name text,
  report_to_phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_business_idx on public.sites (business_id) where archived_at is null;

-- Supervisors see and act only for the sites they're given.
create table public.business_user_sites (
  business_user_id uuid not null references public.business_users (id),
  site_id uuid not null references public.sites (id),
  created_at timestamptz not null default now(),
  primary key (business_user_id, site_id)
);

create index business_user_sites_site_idx on public.business_user_sites (site_id);

-- Business-specific rate cards and bill rules (step 1.1 left room for these),
-- and the business an agreement was accepted for.
alter table public.rate_cards
  add constraint rate_cards_business_fk foreign key (business_id) references public.businesses (id);
alter table public.bill_rate_rules
  add constraint bill_rate_rules_business_fk foreign key (business_id) references public.businesses (id);
alter table public.agreement_acceptances
  add constraint agreement_acceptances_business_fk foreign key (business_id) references public.businesses (id);

-- ---------------------------------------------------------------------------
-- Who's who
-- ---------------------------------------------------------------------------
create function public.my_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select bu.business_id
  from public.business_users bu
  join public.businesses b on b.id = bu.business_id and b.archived_at is null
  where bu.profile_id = (select auth.uid()) and bu.archived_at is null
  limit 1;
$$;

create function public.my_business_role()
returns public.business_role
language sql
stable
security definer
set search_path = ''
as $$
  select bu.role
  from public.business_users bu
  where bu.profile_id = (select auth.uid()) and bu.archived_at is null
  limit 1;
$$;

-- Owners and managers run the business's work; supervisors run their sites.
create function public.is_business_manager(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_users bu
    where bu.profile_id = (select auth.uid())
      and bu.business_id = p_business_id
      and bu.role in ('owner', 'manager')
      and bu.archived_at is null
  );
$$;

create function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_users bu
    where bu.profile_id = (select auth.uid())
      and bu.business_id = p_business_id
      and bu.role = 'owner'
      and bu.archived_at is null
  );
$$;

create function public.can_see_site(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s
    where s.id = p_site_id
      and (
        public.is_business_manager(s.business_id)
        or exists (
          select 1
          from public.business_user_sites bus
          join public.business_users bu on bu.id = bus.business_user_id
          where bus.site_id = s.id
            and bu.profile_id = (select auth.uid())
            and bu.archived_at is null
        )
      )
  );
$$;

grant execute on function public.my_business_id(), public.my_business_role(),
  public.is_business_manager(uuid), public.is_business_owner(uuid), public.can_see_site(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
create function public.businesses_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if row(new.id, new.abn, new.legal_name, new.entity_type_code, new.entity_type, new.abn_status,
           new.abn_status_from, new.gst_registered, new.gst_registered_from, new.acn, new.abr_state,
           new.abr_postcode, new.abr_checked_at, new.status, new.status_reason, new.submitted_at,
           new.approved_at, new.approved_by, new.account_terms_approved, new.payment_terms_days,
           new.stripe_customer_id, new.created_by, new.archived_at)
       is distinct from
       row(old.id, old.abn, old.legal_name, old.entity_type_code, old.entity_type, old.abn_status,
           old.abn_status_from, old.gst_registered, old.gst_registered_from, old.acn, old.abr_state,
           old.abr_postcode, old.abr_checked_at, old.status, old.status_reason, old.submitted_at,
           old.approved_at, old.approved_by, old.account_terms_approved, old.payment_terms_days,
           old.stripe_customer_id, old.created_by, old.archived_at)
    then
      raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_guard before update on public.businesses
  for each row execute function public.businesses_guard();

-- Owners manage their team, but can't take over another business or make
-- an invited person an owner of someone else's account.
create function public.business_users_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.profile_id is not null then
        raise exception 'Invite people by email' using errcode = 'insufficient_privilege';
      end if;
      new.invited_by := (select auth.uid());
      new.invited_at := now();
      new.accepted_at := null;
    else
      if new.business_id is distinct from old.business_id
        or new.profile_id is distinct from old.profile_id
        or new.invite_email is distinct from old.invite_email
        or new.accepted_at is distinct from old.accepted_at
      then
        raise exception 'Only an admin can change that' using errcode = 'insufficient_privilege';
      end if;
      -- Owners can't remove or demote themselves (someone has to stay in charge).
      if old.profile_id = (select auth.uid()) and old.role = 'owner'
        and (new.role <> 'owner' or new.archived_at is not null)
      then
        raise exception 'You can''t remove yourself as owner. Ask us to transfer the account.'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger business_users_guard before insert or update on public.business_users
  for each row execute function public.business_users_guard();

-- ---------------------------------------------------------------------------
-- Invites are matched to an account by its confirmed email address.
-- ---------------------------------------------------------------------------
create function public.accept_business_invites()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_invite public.business_users;
begin
  select lower(u.email) into v_email
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;
  if exists (
    select 1 from public.business_users
    where profile_id = (select auth.uid()) and archived_at is null
  ) then
    return null;
  end if;
  if (select p.role from public.profiles p where p.id = (select auth.uid())) <> 'business_user' then
    return null;
  end if;

  select * into v_invite
  from public.business_users bu
  where bu.invite_email = v_email and bu.profile_id is null and bu.archived_at is null
  order by bu.invited_at
  limit 1
  for update;
  if not found then
    return null;
  end if;

  update public.business_users
  set profile_id = (select auth.uid()), accepted_at = now()
  where id = v_invite.id;
  return v_invite.business_id;
end;
$$;

grant execute on function public.accept_business_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- Submitting for approval (brief §4.2 step 7).
-- ---------------------------------------------------------------------------
create function public.submit_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.businesses;
begin
  select * into b from public.businesses
  where id = public.my_business_id() and public.is_business_owner(id)
  for update;
  if not found then
    raise exception 'Only the business owner can submit' using errcode = 'insufficient_privilege';
  end if;
  if b.status <> 'draft' then
    raise exception 'Already submitted' using errcode = 'check_violation';
  end if;
  if b.abn_status <> 'active' then
    raise exception 'The ABN is cancelled' using errcode = 'check_violation';
  end if;
  if b.billing_contact_name is null or b.accounts_email is null
    or not exists (select 1 from public.sites s where s.business_id = b.id and s.archived_at is null)
  then
    raise exception 'Some steps are not finished' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.agreements a
    where a.kind = 'labour_hire_services' and a.is_current and a.jurisdiction is null
      and not exists (
        select 1 from public.agreement_acceptances aa
        where aa.agreement_id = a.id and aa.business_id = b.id
      )
  ) then
    raise exception 'The Labour Hire Services Agreement has not been accepted' using errcode = 'check_violation';
  end if;

  update public.businesses set status = 'pending', submitted_at = now() where id = b.id;
end;
$$;

grant execute on function public.submit_business() to authenticated;

-- ---------------------------------------------------------------------------
-- Auditing and timestamps
-- ---------------------------------------------------------------------------
create trigger businesses_audit after insert or update on public.businesses
  for each row execute function public.audit_row_change();
create trigger business_users_audit after insert or update on public.business_users
  for each row execute function public.audit_row_change('profile_id');
create trigger sites_audit after insert or update on public.sites
  for each row execute function public.audit_row_change();

create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger business_users_set_updated_at before update on public.business_users
  for each row execute function public.set_updated_at();
create trigger sites_set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.business_users enable row level security;
alter table public.sites enable row level security;
alter table public.business_user_sites enable row level security;

grant all on public.businesses, public.business_users, public.sites, public.business_user_sites
  to service_role;
grant select, update on public.businesses to authenticated;
grant select, insert, update on public.business_users, public.sites to authenticated;
grant select, insert, delete on public.business_user_sites to authenticated;

create policy "businesses: members read" on public.businesses
  for select to authenticated using (id = (select public.my_business_id()));
create policy "businesses: owner updates" on public.businesses
  for update to authenticated
  using ((select public.is_business_owner(id)) and archived_at is null)
  with check ((select public.is_business_owner(id)));
create policy "businesses: admins" on public.businesses
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "business_users: members read" on public.business_users
  for select to authenticated
  using (business_id = (select public.my_business_id()) or profile_id = (select auth.uid()));
create policy "business_users: owner invites" on public.business_users
  for insert to authenticated
  with check ((select public.is_business_owner(business_id)));
create policy "business_users: owner manages" on public.business_users
  for update to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));
create policy "business_users: admins" on public.business_users
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "sites: managers and assigned supervisors read" on public.sites
  for select to authenticated using ((select public.can_see_site(id)));
create policy "sites: managers add" on public.sites
  for insert to authenticated
  with check ((select public.is_business_manager(business_id)));
create policy "sites: managers change" on public.sites
  for update to authenticated
  using ((select public.is_business_manager(business_id)))
  with check ((select public.is_business_manager(business_id)));
create policy "sites: admins" on public.sites
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "business_user_sites: members read" on public.business_user_sites
  for select to authenticated
  using (exists (
    select 1 from public.business_users bu
    where bu.id = business_user_id and bu.business_id = (select public.my_business_id())
  ));
create policy "business_user_sites: owner assigns" on public.business_user_sites
  for insert to authenticated
  with check (exists (
    select 1 from public.business_users bu
    join public.sites s on s.id = site_id and s.business_id = bu.business_id
    where bu.id = business_user_id and (select public.is_business_owner(bu.business_id))
  ));
create policy "business_user_sites: owner unassigns" on public.business_user_sites
  for delete to authenticated
  using (exists (
    select 1 from public.business_users bu
    where bu.id = business_user_id and (select public.is_business_owner(bu.business_id))
  ));
create policy "business_user_sites: admins" on public.business_user_sites
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Teammates can see each other's names and contact details (team page).
create policy "profiles: business teammates read" on public.profiles
  for select to authenticated
  using (exists (
    select 1 from public.business_users bu
    where bu.profile_id = profiles.id
      and bu.archived_at is null
      and bu.business_id = (select public.my_business_id())
  ));

-- Businesses can see their own agreement acceptances.
create policy "agreement_acceptances: business members read" on public.agreement_acceptances
  for select to authenticated
  using (business_id is not null and business_id = (select public.my_business_id()));
