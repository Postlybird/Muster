-- Phase 1.3: checking workers and making them Active (brief §4.1 step 10,
-- §6 verification queue).
--
-- Admin powers now need a second factor (an authenticator app), checked by
-- the database itself: a stolen sign-in link alone isn't enough. Demo admin
-- accounts are exempt only where the demo data has switched that on (the
-- seed sets it; production is never seeded).

create or replace function public.is_admin()
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
      and (
        coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
        or (
          p.email like '%@demo.test'
          and exists (
            select 1 from public.settings s
            where s.key = 'demo_admins_skip_mfa' and s.value = 'true'::jsonb
          )
        )
      )
  );
$$;

comment on function public.is_admin() is
  'True for an admin who signed in with their authenticator app (or a seeded demo admin where demo data allows it).';

-- ---------------------------------------------------------------------------
-- Admins can open and delete worker files (ID images are deleted once
-- checked). Every view is logged by the app.
-- ---------------------------------------------------------------------------
create policy "worker files: admins read"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('worker-photos', 'identity', 'worker-docs')
    and (select public.is_admin())
  );

create policy "worker files: admins delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('worker-photos', 'identity', 'worker-docs')
    and (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- Checking a ticket. Verifying a renewal archives the copy it replaces, in
-- the same transaction, so a worker never has two current copies or none.
-- ---------------------------------------------------------------------------
create function public.review_worker_credential(
  p_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  c public.worker_credentials;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do that' using errcode = 'insufficient_privilege';
  end if;

  select * into c from public.worker_credentials where id = p_id for update;
  if not found or c.archived_at is not null then
    raise exception 'That ticket no longer exists' using errcode = 'no_data_found';
  end if;
  if c.status not in ('pending', 'rejected') then
    raise exception 'That ticket has already been checked' using errcode = 'check_violation';
  end if;

  if p_approve then
    if c.expires_on is not null and c.expires_on < (now() at time zone 'Australia/Sydney')::date then
      raise exception 'That ticket has expired' using errcode = 'check_violation';
    end if;
    update public.worker_credentials
    set archived_at = now()
    where worker_id = c.worker_id
      and credential_type_id = c.credential_type_id
      and id <> c.id
      and archived_at is null
      and status in ('verified', 'expired');
    update public.worker_credentials
    set status = 'verified', verified_by = (select auth.uid()), verified_at = now(), rejection_reason = null
    where id = c.id;
  else
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'Give the worker a reason' using errcode = 'check_violation';
    end if;
    update public.worker_credentials
    set status = 'rejected', rejection_reason = trim(p_reason), verified_by = null, verified_at = null
    where id = c.id;
  end if;
end;
$$;

grant execute on function public.review_worker_credential(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Activation: photo, right to work, photo ID and payroll setup must all be
-- done (plan question 9). Tickets are per work type, so they don't block it.
-- ---------------------------------------------------------------------------
create function public.activate_worker(p_worker_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  w public.workers;
  v_missing text[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do that' using errcode = 'insufficient_privilege';
  end if;

  select * into w from public.workers where id = p_worker_id for update;
  if not found or w.archived_at is not null then
    raise exception 'That worker no longer exists' using errcode = 'no_data_found';
  end if;
  if w.status <> 'pending' then
    raise exception 'Only a worker waiting for checks can be activated' using errcode = 'check_violation';
  end if;

  if w.photo_status is distinct from 'verified' then
    v_missing := v_missing || 'photo'::text;
  end if;
  if not exists (
    select 1 from public.work_rights r where r.worker_id = w.id and r.status = 'verified'
  ) then
    v_missing := v_missing || 'right to work'::text;
  end if;
  if not exists (
    select 1 from public.identity_checks i where i.worker_id = w.id and i.status = 'verified'
  ) then
    v_missing := v_missing || 'photo ID'::text;
  end if;
  if w.payroll_status <> 'complete' then
    v_missing := v_missing || 'payroll setup'::text;
  end if;
  if cardinality(v_missing) > 0 then
    raise exception 'Still to do: %', array_to_string(v_missing, ', ') using errcode = 'check_violation';
  end if;

  update public.workers
  set status = 'active', activated_at = now(), status_reason = null
  where id = w.id;
end;
$$;

grant execute on function public.activate_worker(uuid) to authenticated;
