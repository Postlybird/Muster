-- Sales and GST: for a period, each invoice and credit note issued, and
-- each payment for what was owed on the day. Admins only.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('d4444444-4444-4444-4444-444444444444', 'sales.admin@pgtap.test', now(), '{}'),
  ('d6111111-1111-1111-1111-111111111111', 'sales.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = 'd4444444-4444-4444-4444-444444444444';

insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('db111111-0000-0000-0000-000000000001', '41111111111', 'PGTAP SALES PTY LTD', 'active', now(),
   'approved', true, 'd6111111-1111-1111-1111-111111111111');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('db111111-0000-0000-0000-000000000001', 'd6111111-1111-1111-1111-111111111111', 'owner', now());

-- Runs far in the past, so they can't clash with the demo's.
insert into public.pay_runs (id, period_start, period_end, line_count, pay_cents, bill_cents, gst_cents)
values
  ('df111111-0000-0000-0000-000000000001', date '2002-03-25', date '2002-03-31', 1, 7000, 10000, 1000),
  ('df222222-0000-0000-0000-000000000002', date '2002-04-01', date '2002-04-07', 1, 14000, 20000, 2000);
-- One issued in March and paid in April, one issued in April.
insert into public.invoices (id, pay_run_id, business_id, number, issued_on, due_on,
  subtotal_cents, gst_cents, total_cents) values
  ('de111111-0000-0000-0000-000000000001', 'df111111-0000-0000-0000-000000000001',
   'db111111-0000-0000-0000-000000000001', 'PGTAP-S-1', date '2002-03-31', date '2002-04-14',
   10000, 1000, 11000),
  ('de222222-0000-0000-0000-000000000002', 'df222222-0000-0000-0000-000000000002',
   'db111111-0000-0000-0000-000000000001', 'PGTAP-S-2', date '2002-04-08', date '2002-04-22',
   20000, 2000, 22000);
-- $11.00 off the first before it was paid, then $22.00 off the second.
insert into public.credit_notes (invoice_id, business_id, number, issued_on, reason,
  subtotal_cents, gst_cents, total_cents, issued_by) values
  ('de111111-0000-0000-0000-000000000001', 'db111111-0000-0000-0000-000000000001', 'PGTAP-CN-1',
   date '2002-04-02', 'Overcharged', 1000, 100, 1100, 'd4444444-4444-4444-4444-444444444444'),
  ('de222222-0000-0000-0000-000000000002', 'db111111-0000-0000-0000-000000000001', 'PGTAP-CN-2',
   date '2002-04-09', 'A shift was cancelled', 2000, 200, 2200, 'd4444444-4444-4444-4444-444444444444');
update public.invoices set credited_cents = 1100, status = 'paid', paid_on = date '2002-04-03',
  payment_reference = 'EFT 1'
where id = 'de111111-0000-0000-0000-000000000001';
update public.invoices set credited_cents = 2200 where id = 'de222222-0000-0000-0000-000000000002';

set local role authenticated;

-- A business owner gets nothing.
select set_config('request.jwt.claims', '{"sub": "d6111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*) from public.admin_sales_lines(date '2002-04-01', date '2002-04-30'))::integer,
  0, 'businesses get no lines'
);

-- Our team
select set_config('request.jwt.claims', '{"sub": "d4444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select results_eq(
  $$ select kind, on_date, number, invoice_number, subtotal_cents, gst_cents, total_cents, note
     from public.admin_sales_lines(date '2002-04-01', date '2002-04-30') $$,
  $$ values
     ('credit_note', date '2002-04-02', 'PGTAP-CN-1', 'PGTAP-S-1', -1000, -100, -1100, 'Overcharged'),
     ('payment', date '2002-04-03', 'PGTAP-S-1', 'PGTAP-S-1', 9000, 900, 9900, 'EFT 1'),
     ('invoice', date '2002-04-08', 'PGTAP-S-2', 'PGTAP-S-2', 20000, 2000, 22000, null),
     ('credit_note', date '2002-04-09', 'PGTAP-CN-2', 'PGTAP-S-2', -2000, -200, -2200, 'A shift was cancelled') $$,
  'April: both credit notes, the payment (less the credit before it), and the invoice issued'
);
select results_eq(
  $$ select kind, number, total_cents, status
     from public.admin_sales_lines(date '2002-03-01', date '2002-03-31') $$,
  $$ values ('invoice', 'PGTAP-S-1', 11000, 'paid') $$,
  'March: the invoice issued then, in full'
);
select is(
  (select sum(gst_cents) from public.admin_sales_lines(date '2002-04-01', date '2002-04-30')
   where kind <> 'payment')::integer,
  1700, 'GST on sales in April: invoiced less credited'
);
select is(
  (select count(*) from public.admin_sales_lines(date '2002-05-01', date '2002-05-31'))::integer,
  0, 'nothing in May'
);

-- An admin who hasn't used their authenticator app gets nothing.
select set_config('request.jwt.claims', '{"sub": "d4444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select count(*) from public.admin_sales_lines(date '2002-04-01', date '2002-04-30'))::integer,
  0, 'admins need their second factor'
);

select * from finish();
rollback;
