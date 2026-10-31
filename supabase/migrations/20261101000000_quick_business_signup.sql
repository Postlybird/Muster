-- Quicker business sign-up (owner, 01/11/2026): a business confirms its
-- ABN details and accepts the services agreement, then waits for our
-- approval. Sites are added while setting up the first shift, so
-- submitting no longer needs one. Everything else is checked as before.

create or replace function public.submit_business()
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
  if b.billing_contact_name is null or b.accounts_email is null then
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

revoke execute on function public.submit_business() from public, anon;
grant execute on function public.submit_business() to authenticated;
