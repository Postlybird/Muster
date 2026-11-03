-- Credit notes: our team corrects an invoice that's gone out with a
-- numbered credit note (never by changing it). Its GST is the invoice's in
-- proportion and the notes add up to the invoice; an unpaid invoice
-- credited in full is closed; businesses see only their own.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('c4444444-4444-4444-4444-444444444444', 'cn.admin@pgtap.test', now(), '{}'),
  ('c6111111-1111-1111-1111-111111111111', 'cn.owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('c6555555-5555-5555-5555-555555555555', 'cn.other@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = 'c4444444-4444-4444-4444-444444444444';

insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('cb111111-0000-0000-0000-000000000001', '31111111111', 'PGTAP CREDIT PTY LTD', 'active', now(),
   'approved', true, 'c6111111-1111-1111-1111-111111111111'),
  ('cb222222-0000-0000-0000-000000000002', '32222222222', 'PGTAP OTHER PTY LTD', 'active', now(),
   'approved', true, 'c6555555-5555-5555-5555-555555555555');
insert into public.business_users (business_id, profile_id, role, accepted_at) values
  ('cb111111-0000-0000-0000-000000000001', 'c6111111-1111-1111-1111-111111111111', 'owner', now()),
  ('cb222222-0000-0000-0000-000000000002', 'c6555555-5555-5555-5555-555555555555', 'owner', now());

-- A run far in the past, so it can't clash with the demo's.
insert into public.pay_runs (id, period_start, period_end, line_count, pay_cents, bill_cents, gst_cents)
values ('cf111111-0000-0000-0000-000000000001', date '2001-01-01', date '2001-01-07', 1, 7000, 10000, 1000);
-- $110.00: $100.00 and $10.00 GST.
insert into public.invoices (id, pay_run_id, business_id, number, issued_on, due_on,
  subtotal_cents, gst_cents, total_cents) values
  ('ce111111-0000-0000-0000-000000000001', 'cf111111-0000-0000-0000-000000000001',
   'cb111111-0000-0000-0000-000000000001', 'PGTAP-CN-1', date '2001-01-08', date '2001-01-22',
   10000, 1000, 11000);

set local role authenticated;

-- The business can't credit itself.
select set_config('request.jwt.claims', '{"sub": "c6111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 1100, 'Overcharged') $$,
  '42501', 'Only our team issues credit notes', 'only our team issues credit notes'
);

-- Our team
select set_config('request.jwt.claims', '{"sub": "c4444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 1100, ' ') $$,
  '23514', 'Say why it''s being credited', 'with a reason'
);
select throws_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 0, 'Overcharged') $$,
  '23514', 'Enter an amount to credit', 'for an amount'
);
select throws_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 11001, 'Overcharged') $$,
  '23514', 'That''s more than is left to credit on the invoice', 'no more than the invoice'
);

select lives_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 1100, 'An hour charged twice') $$,
  'part of an invoice is credited'
);
select results_eq(
  $$ select subtotal_cents, gst_cents, total_cents, number ~ '^CN-\d+$', issued_by
     from public.credit_notes where invoice_id = 'ce111111-0000-0000-0000-000000000001' $$,
  $$ values (1000, 100, 1100, true, 'c4444444-4444-4444-4444-444444444444'::uuid) $$,
  'with the invoice''s GST in proportion, a CN number, and who issued it'
);
select results_eq(
  $$ select status, credited_cents from public.invoices where id = 'ce111111-0000-0000-0000-000000000001' $$,
  $$ values ('issued', 1100) $$,
  'and the invoice still has the rest to pay'
);

-- The rest: its GST is what's left, so the notes add up to the invoice.
select lives_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 9900, 'Job cancelled') $$,
  'the rest is credited'
);
select results_eq(
  $$ select sum(subtotal_cents)::int, sum(gst_cents)::int, sum(total_cents)::int
     from public.credit_notes where invoice_id = 'ce111111-0000-0000-0000-000000000001' $$,
  $$ values (10000, 1000, 11000) $$,
  'the notes add up to the invoice'
);
select results_eq(
  $$ select status, credited_cents from public.invoices where id = 'ce111111-0000-0000-0000-000000000001' $$,
  $$ values ('credited', 11000) $$,
  'an invoice credited in full is closed'
);
select throws_ok(
  $$ select public.issue_credit_note('ce111111-0000-0000-0000-000000000001', 1, 'Again') $$,
  '23514', 'That''s more than is left to credit on the invoice', 'and has nothing left to credit'
);
select throws_ok(
  $$ select public.mark_invoice_paid('ce111111-0000-0000-0000-000000000001', current_date) $$,
  '23514', 'That invoice is already paid or credited', 'or to pay'
);

-- The business sees its own credit notes; another business sees none.
select set_config('request.jwt.claims', '{"sub": "c6111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*)::int from public.credit_notes),
  2,
  'the business sees its credit notes'
);
select set_config('request.jwt.claims', '{"sub": "c6555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select is_empty($$ select * from public.credit_notes $$, 'another business sees none');

select * from finish();
rollback;
