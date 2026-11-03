-- Credit notes (owner, 03/11/2026: invoicing stays in Shifta). An invoice
-- that's gone out is never changed; it's corrected with a credit note (an
-- adjustment note, for GST). Our team issues one against an invoice for an
-- amount (GST included) and a reason: it's numbered, takes the invoice's
-- GST in proportion, and lowers what's still owed. An unpaid invoice
-- credited in full is closed ('credited'). The server makes its PDF (in
-- the business's folder of the invoices bucket) and emails it.

alter table public.invoices drop constraint invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check check (status in ('issued', 'paid', 'credited')),
  add column credited_cents integer not null default 0 check (credited_cents >= 0),
  add constraint invoices_credit_within_total check (credited_cents <= total_cents);

comment on column public.invoices.credited_cents is 'Credited by credit notes, GST included: what''s owed is total_cents less this.';

create sequence public.credit_note_number_seq start 1001;

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  business_id uuid not null references public.businesses (id),
  number text not null unique,
  issued_on date not null,
  reason text not null check (char_length(reason) between 3 and 500),
  -- Excluding GST.
  subtotal_cents integer not null check (subtotal_cents >= 0),
  gst_cents integer not null check (gst_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  -- In the private invoices bucket: <business id>/<number>.pdf
  pdf_path text,
  emailed_to text,
  emailed_at timestamptz,
  issued_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents + gst_cents)
);

create index credit_notes_invoice_id_idx on public.credit_notes (invoice_id);
create index credit_notes_business_id_idx on public.credit_notes (business_id);

create trigger credit_notes_set_updated_at before update on public.credit_notes
  for each row execute function public.set_updated_at();
create trigger credit_notes_audit after insert or update on public.credit_notes
  for each row execute function public.audit_row_change();

-- Issues a credit note against an invoice: our team only. The amount is
-- GST included and at most what's left to credit. Its GST is the invoice's
-- in proportion: the GST on everything credited so far, rounded, less what
-- earlier notes took, so rounding never drifts and the notes that credit a
-- whole invoice add up to its GST exactly.
create function public.issue_credit_note(p_invoice uuid, p_total_cents integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_gst integer;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only our team issues credit notes' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'Say why it''s being credited' using errcode = 'check_violation';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'Keep the reason to 500 characters' using errcode = 'check_violation';
  end if;
  if p_total_cents is null or p_total_cents <= 0 then
    raise exception 'Enter an amount to credit' using errcode = 'check_violation';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice for update;
  if not found then
    raise exception 'No such invoice' using errcode = 'no_data_found';
  end if;
  if v_invoice.credited_cents + p_total_cents > v_invoice.total_cents then
    raise exception 'That''s more than is left to credit on the invoice' using errcode = 'check_violation';
  end if;

  v_gst := round((v_invoice.credited_cents + p_total_cents)::numeric
      * v_invoice.gst_cents / v_invoice.total_cents)::integer
    - round(v_invoice.credited_cents::numeric
      * v_invoice.gst_cents / v_invoice.total_cents)::integer;

  insert into public.credit_notes (
    invoice_id, business_id, number, issued_on, reason,
    subtotal_cents, gst_cents, total_cents, issued_by
  )
  values (
    p_invoice, v_invoice.business_id, 'CN-' || nextval('public.credit_note_number_seq'),
    (now() at time zone 'Australia/Sydney')::date, v_reason,
    p_total_cents - v_gst, v_gst, p_total_cents, (select auth.uid())
  )
  returning id into v_id;

  update public.invoices
  set credited_cents = credited_cents + p_total_cents,
    status = case
      when status = 'issued' and credited_cents + p_total_cents = total_cents then 'credited'
      else status
    end
  where id = p_invoice;
  return v_id;
end;
$$;

-- A payment can't be marked against an invoice credited in full.
create or replace function public.mark_invoice_paid(p_id uuid, p_paid_on date, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only our team marks invoices paid' using errcode = '42501';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Australia/Sydney')::date then
    raise exception 'Choose the day it was paid' using errcode = 'check_violation';
  end if;
  update public.invoices
  set status = 'paid', paid_on = p_paid_on,
    payment_reference = nullif(btrim(coalesce(p_reference, '')), ''),
    marked_paid_by = (select auth.uid())
  where id = p_id and status = 'issued';
  if not found then
    raise exception 'That invoice is already paid or credited' using errcode = 'check_violation';
  end if;
end;
$$;

-- Unmarking a payment leaves an invoice credited in full closed.
create or replace function public.mark_invoice_unpaid(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only our team marks invoices paid' using errcode = '42501';
  end if;
  update public.invoices
  set status = case when credited_cents = total_cents then 'credited' else 'issued' end,
    paid_on = null, payment_reference = null, marked_paid_by = null
  where id = p_id and status = 'paid';
  if not found then
    raise exception 'That invoice isn''t marked paid' using errcode = 'check_violation';
  end if;
end;
$$;

revoke all on function public.issue_credit_note(uuid, integer, text) from public, anon;
grant execute on function public.issue_credit_note(uuid, integer, text) to authenticated;
grant usage on sequence public.credit_note_number_seq to service_role;

alter table public.credit_notes enable row level security;
grant all on public.credit_notes to service_role;
grant select on public.credit_notes to authenticated;

create policy "credit_notes: owners and managers" on public.credit_notes
  for select to authenticated using ((select public.is_business_manager(business_id)));
create policy "credit_notes: admins" on public.credit_notes
  for select to authenticated using ((select public.is_admin()));
