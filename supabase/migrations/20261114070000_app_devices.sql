-- Notifications on the phone apps (owner, 14/11/2026; docs/apps.md). A phone
-- that turns notifications on registers with Firebase, and its token is
-- kept here, as web push subscriptions are, so the server can send to it.
-- A phone someone else used before moves to them; anyone can take their own
-- phones off, and deleting an account removes them.

create table public.app_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique check (char_length(token) between 20 and 4096),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

comment on table public.app_devices is
  'Phones with the app that turned notifications on: their Firebase token.';

create index app_devices_profile_idx on public.app_devices (profile_id);

alter table public.app_devices enable row level security;

create policy "app devices: own" on public.app_devices
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "app devices: admins read" on public.app_devices
  for select to authenticated using ((select public.is_admin()));

grant select on public.app_devices to authenticated;
grant all on public.app_devices to service_role;

-- This phone gets notifications for the signed-in person.
create function public.save_app_device(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  insert into public.app_devices (profile_id, platform, token)
  values ((select auth.uid()), p_platform, p_token)
  on conflict (token) do update
  set profile_id = excluded.profile_id, platform = excluded.platform;
end;
$$;

-- This phone stops getting them.
create function public.remove_app_device(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.app_devices
  where token = p_token and profile_id = (select auth.uid());
$$;

grant execute on function public.save_app_device(text, text),
  public.remove_app_device(text) to authenticated;

-- Deleting an account removes its phones too.
create or replace function public.close_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_role public.user_role;
  v_worker_id uuid;
  v_member record;
  v_closed_businesses uuid[] := '{}';
begin
  select p.role into v_role
  from public.profiles p
  where p.id = v_me and p.archived_at is null;
  if v_role is null then
    raise exception 'There''s no account to close' using errcode = '42501';
  end if;
  if v_role = 'admin' then
    raise exception 'Our team''s accounts are closed by another admin' using errcode = '42501';
  end if;

  if v_role = 'worker' then
    select w.id into v_worker_id
    from public.workers w
    where w.profile_id = v_me and w.archived_at is null;
    if v_worker_id is not null then
      if exists (
        select 1
        from public.assignments a
        join public.shifts s on s.id = a.shift_id
        where a.worker_id = v_worker_id
          and a.status = 'confirmed'
          and s.ends_at > now()
      ) then
        raise exception 'shifts_booked' using errcode = 'P0001',
          hint = 'Cancel your booked shifts first.';
      end if;

      update public.applications
      set status = 'withdrawn', decided_at = now()
      where worker_id = v_worker_id and status = 'applied';
      delete from public.shift_matches where worker_id = v_worker_id;
      delete from public.availability_weekly where worker_id = v_worker_id;
      delete from public.availability_blocks where worker_id = v_worker_id;
      update public.workers
      set photo_path = null,
          photo_status = null,
          photo_rejection_reason = null,
          bio = null,
          available_now_until = null,
          urgent_opt_in = false,
          status = 'offboarded',
          status_reason = 'Deleted their account',
          archived_at = now()
      where id = v_worker_id;
    end if;
  else
    for v_member in
      select bu.id, bu.business_id, bu.role
      from public.business_users bu
      where bu.profile_id = v_me and bu.archived_at is null
    loop
      if v_member.role = 'owner' and not exists (
        select 1
        from public.business_users o
        where o.business_id = v_member.business_id
          and o.role = 'owner'
          and o.profile_id is not null
          and o.profile_id <> v_me
          and o.archived_at is null
      ) then
        -- The last owner: closing their account closes the business, for
        -- everyone on its team. Its jobs, hours and invoices are kept.
        if exists (
          select 1
          from public.jobs j
          join public.shifts s on s.job_id = j.id
          where j.business_id = v_member.business_id
            and j.status = 'posted'
            and s.status in ('open', 'filled')
            and s.ends_at > now()
        ) then
          raise exception 'shifts_booked' using errcode = 'P0001',
            hint = 'Cancel your upcoming shifts first.';
        end if;
        update public.business_users
        set archived_at = now()
        where business_id = v_member.business_id and archived_at is null;
        update public.businesses
        set archived_at = now()
        where id = v_member.business_id and archived_at is null;
        v_closed_businesses := v_closed_businesses || v_member.business_id;
      else
        update public.business_users set archived_at = now() where id = v_member.id;
      end if;
    end loop;
  end if;

  delete from public.push_subscriptions where profile_id = v_me;
  delete from public.app_devices where profile_id = v_me;
  update public.profiles
  set closed_at = now(), archived_at = now()
  where id = v_me;

  return jsonb_build_object(
    'worker_id', v_worker_id,
    'closed_businesses', to_jsonb(v_closed_businesses)
  );
end;
$$;
