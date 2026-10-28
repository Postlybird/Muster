-- Phase 1.1: pay rate cards, bill rate rules, public holidays, labour hire
-- licensing by state, and versioned agreements with acceptance records.
-- Admin-managed; changes to money and compliance data are audited.

-- ---------------------------------------------------------------------------
-- Pay rate cards (brief §4.8): category × level × day type, as a base rate
-- plus multipliers. The base excludes casual loading; each multiplier is the
-- total including it (e.g. ordinary 1.25). A business-specific card (host
-- override, e.g. a "same job, same pay" order) beats the default card.
-- ---------------------------------------------------------------------------
create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  -- null = default card. Foreign key to businesses is added with that table (step 1.4).
  business_id uuid,
  category_id uuid not null references public.categories (id),
  level smallint not null default 1 check (level between 1 and 10),
  base_rate_cents integer not null check (base_rate_cents > 0),
  ordinary_multiplier numeric(5, 3) not null default 1.250 check (ordinary_multiplier > 0),
  saturday_multiplier numeric(5, 3) not null default 1.750 check (saturday_multiplier > 0),
  sunday_multiplier numeric(5, 3) not null default 2.250 check (sunday_multiplier > 0),
  public_holiday_multiplier numeric(5, 3) not null default 2.750 check (public_holiday_multiplier > 0),
  overtime_multiplier numeric(5, 3) not null default 1.875 check (overtime_multiplier > 0),
  night_multiplier numeric(5, 3) not null default 1.400 check (night_multiplier > 0),
  effective_from date not null,
  effective_to date,
  -- Who checked these rates (brief: rate cards are checked by a payroll professional).
  checked_by text,
  checked_on date,
  notes text not null default '',
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

comment on table public.rate_cards is 'Pay rates. For a shift, use the card with the latest effective_from on or before the shift date (business card first, then default).';

create unique index rate_cards_one_per_start on public.rate_cards (
  coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
  category_id,
  level,
  effective_from
) where archived_at is null;

create index rate_cards_lookup_idx on public.rate_cards (category_id, level, effective_from desc);

-- Per-category workers' comp rate overrides the global on-cost setting.
alter table public.categories
  add column workers_comp_pct numeric(5, 2) check (workers_comp_pct between 0 and 100);

-- ---------------------------------------------------------------------------
-- Bill rate rules (brief §4.8): pay plus on-costs plus margin ("markup"), or
-- a fixed bill rate per day type. The most specific rule wins: business and
-- category, then business, then category, then the default margin setting.
-- ---------------------------------------------------------------------------
create type public.bill_method as enum ('markup', 'fixed');

create table public.bill_rate_rules (
  id uuid primary key default gen_random_uuid(),
  -- Foreign key to businesses is added with that table (step 1.4).
  business_id uuid,
  category_id uuid references public.categories (id),
  method public.bill_method not null default 'markup',
  margin_pct numeric(6, 2) check (margin_pct >= 0),
  fixed_ordinary_cents integer check (fixed_ordinary_cents > 0),
  fixed_saturday_cents integer check (fixed_saturday_cents > 0),
  fixed_sunday_cents integer check (fixed_sunday_cents > 0),
  fixed_public_holiday_cents integer check (fixed_public_holiday_cents > 0),
  fixed_overtime_cents integer check (fixed_overtime_cents > 0),
  fixed_night_cents integer check (fixed_night_cents > 0),
  effective_from date not null,
  effective_to date,
  notes text not null default '',
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (business_id is not null or category_id is not null),
  check (method <> 'markup' or margin_pct is not null),
  check (
    method <> 'fixed' or (
      fixed_ordinary_cents is not null and fixed_saturday_cents is not null
      and fixed_sunday_cents is not null and fixed_public_holiday_cents is not null
      and fixed_overtime_cents is not null and fixed_night_cents is not null
    )
  )
);

create index bill_rate_rules_lookup_idx on public.bill_rate_rules (business_id, category_id, effective_from desc);

-- ---------------------------------------------------------------------------
-- Public holidays by state (for public holiday rates).
-- ---------------------------------------------------------------------------
create table public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'NSW' check (state in ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state, date)
);

-- ---------------------------------------------------------------------------
-- Labour hire licensing (brief §4.9): which states require a licence, and the
-- licences we hold. Jobs are blocked in a state that requires a licence we
-- don't hold.
-- ---------------------------------------------------------------------------
create table public.jurisdictions (
  code text primary key check (code in ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  name text not null,
  licence_required boolean not null default false,
  licensing_body text,
  show_licence_on_invoice boolean not null default false,
  -- e.g. SA: an information notice to the worker each time they're supplied.
  worker_notice_required boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.licence_status as enum ('active', 'expired', 'suspended', 'cancelled');

create table public.licences (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null references public.jurisdictions (code),
  licence_number text not null,
  holder_name text not null,
  issued_on date,
  expires_on date,
  status public.licence_status not null default 'active',
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Agreements (brief §4.1 step 9, §4.2 step 6): versioned documents. Once a
-- version is published its wording can't change; publish a new version.
-- Acceptances record who, when, IP address and browser, and never change.
-- ---------------------------------------------------------------------------
create type public.agreement_kind as enum (
  'labour_hire_services',
  'casual_employment_contract',
  'fair_work_information_statement',
  'casual_employment_information_statement',
  'privacy_collection_notice',
  'worker_supply_notice'
);

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  kind public.agreement_kind not null,
  -- For state-specific documents (e.g. the SA worker notice); null = everywhere.
  jurisdiction text references public.jurisdictions (code),
  version text not null,
  title text not null,
  body_md text not null,
  is_current boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (kind, jurisdiction, version),
  check (not is_current or published_at is not null)
);

create unique index agreements_one_current on public.agreements (kind, coalesce(jurisdiction, ''))
  where is_current;

create function public.agreements_freeze_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null and (
    new.title is distinct from old.title
    or new.body_md is distinct from old.body_md
    or new.version is distinct from old.version
    or new.kind is distinct from old.kind
    or new.jurisdiction is distinct from old.jurisdiction
    or new.published_at is distinct from old.published_at
  ) then
    raise exception 'A published agreement can''t be changed. Publish a new version instead.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger agreements_freeze_published
  before update on public.agreements
  for each row execute function public.agreements_freeze_published();

create table public.agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  profile_id uuid not null references public.profiles (id),
  -- Foreign key to businesses is added with that table (step 1.4).
  business_id uuid,
  accepted_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index agreement_acceptances_profile_idx on public.agreement_acceptances (profile_id, agreement_id);

create trigger agreement_acceptances_no_change
  before update or delete on public.agreement_acceptances
  for each row execute function public.prevent_change();

-- ---------------------------------------------------------------------------
-- Timestamps and auditing
-- ---------------------------------------------------------------------------
create trigger rate_cards_set_updated_at before update on public.rate_cards
  for each row execute function public.set_updated_at();
create trigger bill_rate_rules_set_updated_at before update on public.bill_rate_rules
  for each row execute function public.set_updated_at();
create trigger public_holidays_set_updated_at before update on public.public_holidays
  for each row execute function public.set_updated_at();
create trigger jurisdictions_set_updated_at before update on public.jurisdictions
  for each row execute function public.set_updated_at();
create trigger licences_set_updated_at before update on public.licences
  for each row execute function public.set_updated_at();
create trigger agreements_set_updated_at before update on public.agreements
  for each row execute function public.set_updated_at();

create trigger rate_cards_audit after insert or update or delete on public.rate_cards
  for each row execute function public.audit_row_change();
create trigger bill_rate_rules_audit after insert or update or delete on public.bill_rate_rules
  for each row execute function public.audit_row_change();
create trigger public_holidays_audit after insert or update or delete on public.public_holidays
  for each row execute function public.audit_row_change();
create trigger jurisdictions_audit after insert or update or delete on public.jurisdictions
  for each row execute function public.audit_row_change();
create trigger licences_audit after insert or update or delete on public.licences
  for each row execute function public.audit_row_change();
create trigger agreements_audit after insert or update or delete on public.agreements
  for each row execute function public.audit_row_change();
create trigger agreement_acceptances_audit after insert on public.agreement_acceptances
  for each row execute function public.audit_row_change('profile_id');

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------
alter table public.rate_cards enable row level security;
alter table public.bill_rate_rules enable row level security;
alter table public.public_holidays enable row level security;
alter table public.jurisdictions enable row level security;
alter table public.licences enable row level security;
alter table public.agreements enable row level security;
alter table public.agreement_acceptances enable row level security;

grant all on public.rate_cards, public.bill_rate_rules, public.public_holidays,
  public.jurisdictions, public.licences, public.agreements, public.agreement_acceptances
  to service_role;

-- Rates are commercial: admins only (workers see pay, businesses see bill
-- rates, through their own assignments later).
grant select, insert, update on public.rate_cards, public.bill_rate_rules to authenticated;

create policy "rate_cards: admins" on public.rate_cards
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "bill_rate_rules: admins" on public.bill_rate_rules
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public holidays, jurisdictions and our licence numbers are public
-- information (licence numbers appear on agreements and invoices).
grant select on public.public_holidays, public.jurisdictions, public.licences to authenticated;
grant insert, update, delete on public.public_holidays to authenticated;
grant insert, update on public.jurisdictions, public.licences to authenticated;

create policy "public_holidays: signed-in read" on public.public_holidays
  for select to authenticated using (true);
create policy "public_holidays: admins insert" on public.public_holidays
  for insert to authenticated with check ((select public.is_admin()));
create policy "public_holidays: admins update" on public.public_holidays
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public_holidays: admins delete" on public.public_holidays
  for delete to authenticated using ((select public.is_admin()));

create policy "jurisdictions: signed-in read" on public.jurisdictions
  for select to authenticated using (true);
create policy "jurisdictions: admins insert" on public.jurisdictions
  for insert to authenticated with check ((select public.is_admin()));
create policy "jurisdictions: admins update" on public.jurisdictions
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "licences: signed-in read" on public.licences
  for select to authenticated using (archived_at is null or (select public.is_admin()));
create policy "licences: admins insert" on public.licences
  for insert to authenticated with check ((select public.is_admin()));
create policy "licences: admins update" on public.licences
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Agreements: signed-in users read published versions; admins manage them.
grant select, insert, update on public.agreements to authenticated;

create policy "agreements: signed-in read published" on public.agreements
  for select to authenticated using (published_at is not null);
create policy "agreements: admins read all" on public.agreements
  for select to authenticated using ((select public.is_admin()));
create policy "agreements: admins insert" on public.agreements
  for insert to authenticated with check ((select public.is_admin()));
create policy "agreements: admins update" on public.agreements
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Acceptances are recorded by the server (which captures the IP address),
-- so signed-in users can only read their own.
grant select on public.agreement_acceptances to authenticated;

create policy "agreement_acceptances: read own" on public.agreement_acceptances
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "agreement_acceptances: admins read all" on public.agreement_acceptances
  for select to authenticated using ((select public.is_admin()));

-- Admins can set per-category workers' comp (the column is new).
-- (categories already grants update to authenticated, limited to admins by RLS.)
