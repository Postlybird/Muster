-- Industries group the work types (categories): workers choose work by
-- industry, businesses post it, and the website has a page for each one.
-- Admins manage them like the other catalogues. A work type with no
-- industry is listed under "Other work".

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  summary text not null default '',
  description text not null default '',
  icon text not null default 'briefcase' check (icon ~ '^[a-z][a-z0-9-]*$'),
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.industries.summary is 'One line for lists and cards.';
comment on column public.industries.description is 'A paragraph for the industry''s page on the website.';
comment on column public.industries.icon is 'An icon name from src/config/industry-icons.ts.';

create trigger industries_set_updated_at before update on public.industries
  for each row execute function public.set_updated_at();

alter table public.categories add column industry_id uuid references public.industries (id);
create index categories_industry_id_idx on public.categories (industry_id);

-- Public information, like the other catalogues; only admins change it.
alter table public.industries enable row level security;

grant all on public.industries to service_role;
grant select on public.industries to anon, authenticated;
grant insert, update on public.industries to authenticated;

create policy "industries: public reads active" on public.industries for select to anon
  using (active and archived_at is null);
create policy "industries: signed-in read" on public.industries for select to authenticated
  using (archived_at is null or (select public.is_admin()));
create policy "industries: admins insert" on public.industries for insert to authenticated
  with check ((select public.is_admin()));
create policy "industries: admins update" on public.industries for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
