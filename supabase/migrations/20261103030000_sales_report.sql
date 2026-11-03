-- Sales and GST (owner, 03/11/2026: invoicing stays in Shifta, so the
-- figures for the BAS come from here). For a period of Sydney dates, both
-- ends included, a line for:
--   * each invoice issued;
--   * each credit note issued, as negative amounts;
--   * each payment: an invoice marked paid in the period, for what was owed
--     on the day (its total, less credit notes issued by then).
-- Admins only: anyone else gets no lines. On each day, invoices come first,
-- then credit notes, then payments (`seq`).

create function public.admin_sales_lines(p_from date, p_to date)
returns table (
  kind text,
  seq smallint,
  on_date date,
  number text,
  invoice_id uuid,
  invoice_number text,
  business_name text,
  abn text,
  subtotal_cents integer,
  gst_cents integer,
  total_cents integer,
  status text,
  note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'invoice', 1::smallint, i.issued_on, i.number, i.id, i.number, b.legal_name, b.abn,
    i.subtotal_cents, i.gst_cents, i.total_cents, i.status, null::text
  from public.invoices i
  join public.businesses b on b.id = i.business_id
  where (select public.is_admin())
    and i.issued_on between p_from and p_to
  union all
  select 'credit_note', 2::smallint, c.issued_on, c.number, i.id, i.number, b.legal_name, b.abn,
    -c.subtotal_cents, -c.gst_cents, -c.total_cents, null::text, c.reason
  from public.credit_notes c
  join public.invoices i on i.id = c.invoice_id
  join public.businesses b on b.id = c.business_id
  where (select public.is_admin())
    and c.issued_on between p_from and p_to
  union all
  select 'payment', 3::smallint, i.paid_on, i.number, i.id, i.number, b.legal_name, b.abn,
    i.subtotal_cents - coalesce(cr.subtotal_cents, 0),
    i.gst_cents - coalesce(cr.gst_cents, 0),
    i.total_cents - coalesce(cr.total_cents, 0),
    i.status, i.payment_reference
  from public.invoices i
  join public.businesses b on b.id = i.business_id
  left join lateral (
    select sum(c.subtotal_cents)::integer as subtotal_cents,
      sum(c.gst_cents)::integer as gst_cents,
      sum(c.total_cents)::integer as total_cents
    from public.credit_notes c
    where c.invoice_id = i.id and c.issued_on <= i.paid_on
  ) cr on true
  where (select public.is_admin())
    and i.status = 'paid'
    and i.paid_on between p_from and p_to
  order by 3, 2, 4;
$$;

revoke all on function public.admin_sales_lines(date, date) from public, anon;
grant execute on function public.admin_sales_lines(date, date) to authenticated;
