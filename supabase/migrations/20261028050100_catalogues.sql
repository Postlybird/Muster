-- Admin-managed catalogues: work categories, tickets (credential types),
-- site hazards and PPE. Nothing trade-specific is hard-coded: launch data is
-- loaded by the seed script and edited by admins.

create type public.credential_kind as enum ('ticket', 'licence', 'police_check', 'wwcc');
create type public.verification_method as enum ('manual', 'register_check', 'provider_api');

create table public.credential_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  kind public.credential_kind not null default 'ticket',
  issuer text,
  has_number boolean not null default true,
  has_expiry boolean not null default true,
  needs_document boolean not null default true,
  verification_method public.verification_method not null default 'manual',
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.credential_types is 'The ticket catalogue. Police checks are kind police_check; their accepted age is the police_check_max_age_months setting.';

create table public.hazards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ppe_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  police_check_required boolean not null default false,
  min_engagement_hours numeric(4, 2) not null default 3 check (min_engagement_hours >= 0),
  default_level smallint not null default 1 check (default_level between 1 and 10),
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.categories.min_engagement_hours is 'Minimum paid and billed hours for a shift in this category.';

-- Tickets required for every job in a category (pre-filled, editable per job).
create table public.category_credentials (
  category_id uuid not null references public.categories (id),
  credential_type_id uuid not null references public.credential_types (id),
  created_at timestamptz not null default now(),
  primary key (category_id, credential_type_id)
);

create index category_credentials_type_idx on public.category_credentials (credential_type_id);

-- PPE pre-ticked when posting a job in a category.
create table public.category_ppe (
  category_id uuid not null references public.categories (id),
  ppe_item_id uuid not null references public.ppe_items (id),
  created_at timestamptz not null default now(),
  primary key (category_id, ppe_item_id)
);

create index category_ppe_item_idx on public.category_ppe (ppe_item_id);

create trigger credential_types_set_updated_at before update on public.credential_types
  for each row execute function public.set_updated_at();
create trigger hazards_set_updated_at before update on public.hazards
  for each row execute function public.set_updated_at();
create trigger ppe_items_set_updated_at before update on public.ppe_items
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and row level security. Catalogues are public information (public
-- pages list work types and tickets); only admins change them.
-- ---------------------------------------------------------------------------
alter table public.credential_types enable row level security;
alter table public.hazards enable row level security;
alter table public.ppe_items enable row level security;
alter table public.categories enable row level security;
alter table public.category_credentials enable row level security;
alter table public.category_ppe enable row level security;

grant all on public.credential_types, public.hazards, public.ppe_items, public.categories,
  public.category_credentials, public.category_ppe to service_role;

grant select on public.credential_types, public.hazards, public.ppe_items, public.categories,
  public.category_credentials, public.category_ppe to anon, authenticated;

grant insert, update on public.credential_types, public.hazards, public.ppe_items,
  public.categories to authenticated;

-- Join rows are configuration, so admins may remove them.
grant insert, delete on public.category_credentials, public.category_ppe to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['credential_types', 'hazards', 'ppe_items', 'categories'] loop
    execute format(
      'create policy "%1$s: public reads active" on public.%1$I for select to anon
         using (active and archived_at is null)', t);
    execute format(
      'create policy "%1$s: signed-in read" on public.%1$I for select to authenticated
         using (archived_at is null or (select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admins insert" on public.%1$I for insert to authenticated
         with check ((select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admins update" on public.%1$I for update to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;

  foreach t in array array['category_credentials', 'category_ppe'] loop
    execute format(
      'create policy "%1$s: anyone reads" on public.%1$I for select to anon, authenticated
         using (true)', t);
    execute format(
      'create policy "%1$s: admins insert" on public.%1$I for insert to authenticated
         with check ((select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admins delete" on public.%1$I for delete to authenticated
         using ((select public.is_admin()))', t);
  end loop;
end;
$$;
