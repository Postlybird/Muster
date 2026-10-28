-- Makes one published version of an agreement the current one, in a single
-- transaction (only one version of each agreement may be current).
-- Runs with the caller's rights, so row level security limits it to admins.
create function public.set_current_agreement(p_agreement_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.agreement_kind;
  v_jurisdiction text;
  v_published timestamptz;
begin
  select kind, jurisdiction, published_at
    into v_kind, v_jurisdiction, v_published
  from public.agreements
  where id = p_agreement_id and archived_at is null;

  if not found then
    raise exception 'Agreement not found' using errcode = 'no_data_found';
  end if;
  if v_published is null then
    raise exception 'Publish the agreement before making it current' using errcode = 'check_violation';
  end if;

  update public.agreements
  set is_current = false
  where kind = v_kind
    and jurisdiction is not distinct from v_jurisdiction
    and is_current
    and id <> p_agreement_id;

  update public.agreements set is_current = true where id = p_agreement_id;

  if not found then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke execute on function public.set_current_agreement(uuid) from public, anon;
grant execute on function public.set_current_agreement(uuid) to authenticated, service_role;
