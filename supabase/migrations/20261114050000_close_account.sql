-- Delete my account (owner, 14/11/2026). Both app stores require that
-- anyone who can make an account in an app can delete it there. Closing an
-- account signs the person out for good and stops their messages, and
-- removes what the law doesn't need: their photo, their phones and their
-- availability (and a worker's "about me"). Hours, pay and invoices stay,
-- archived, for 7 years from closing, as the law requires (both stores
-- allow that). Anyone with shifts booked cancels them first.
--
-- The app's server then deletes the photo files and blocks sign-in
-- (src/server/accounts.ts), which need the service role.

alter table public.profiles add column closed_at timestamptz;

comment on column public.profiles.closed_at is
  'When the person deleted their account. Their records are kept, archived, for 7 years from then.';

create function public.close_my_account()
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
  update public.profiles
  set closed_at = now(), archived_at = now()
  where id = v_me;

  return jsonb_build_object(
    'worker_id', v_worker_id,
    'closed_businesses', to_jsonb(v_closed_businesses)
  );
end;
$$;

comment on function public.close_my_account() is
  'Delete my account: archives the signed-in worker or business user and removes what the law doesn''t need. Refuses while they have shifts booked.';

grant execute on function public.close_my_account() to authenticated;
