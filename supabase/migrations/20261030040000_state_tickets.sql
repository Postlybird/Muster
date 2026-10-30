-- Australia-wide tickets. Some tickets are issued by each state and don't
-- carry across borders: the RSA, working with children checks and traffic
-- control. Each state's version is its own ticket, and the versions share a
-- family. A job asks for its site's state's version and a worker is asked
-- for their home state's (src/lib/state-tickets.ts); matching compares the
-- tickets themselves, as before.

alter table public.credential_types
  add column state text check (state in ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  add column family text check (family is null or length(trim(family)) > 0),
  add constraint credential_types_family_has_state check (family is null or state is not null);

comment on column public.credential_types.state is
  'The state or territory that issues it, for tickets that don''t carry across borders; null for tickets accepted Australia-wide.';
comment on column public.credential_types.family is
  'What every state''s version of the same ticket shares (e.g. "Responsible Service of Alcohol (RSA)"); null for tickets with no state versions.';

-- One current version of a ticket per state.
create unique index credential_types_family_state_key
  on public.credential_types (family, state)
  where family is not null and archived_at is null;

-- The demo catalogue's NSW tickets, where they're already loaded. A name an
-- admin has changed is kept.
update public.credential_types
set state = 'NSW', family = 'Responsible Service of Alcohol (RSA)'
where code = 'rsa_nsw' and family is null;

update public.credential_types
set state = 'NSW',
  family = 'Working with children check',
  name = case when name = 'Working with Children Check' then 'Working with Children Check (NSW)' else name end
where code = 'wwcc' and family is null;

update public.credential_types
set state = 'NSW',
  family = 'Traffic controller accreditation',
  name = case when name = 'Traffic controller card' then 'Traffic controller card (NSW)' else name end
where code = 'traffic_controller' and family is null;
