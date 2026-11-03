-- A worker sees how their pay for a shift adds up, overtime included (owner,
-- 01/11/2026): only for their own hours, once approved and costed as they
-- stand, and never what the business is charged.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_pay_cleaner', 'PGTAP pay cleaner');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', 'worker.b@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}');
select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '22222222-2222-2222-2222-222222222222' \gset
update public.workers set status = 'active' where id in (:'worker_a', :'worker_b');

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'One', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111');
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted', now(), true);
-- Three shifts worked by A: S1 a long day (approved), S2 still waiting for
-- the business, S3 approved but changed since it was costed.
insert into public.shifts (id, job_id, starts_at, ends_at, break_minutes, headcount, status) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '3 days 11 hours', now() - interval '3 days 30 minutes', 30, 1, 'completed'),
  ('a2222222-0000-0000-0000-000000000002', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '2 days 6 hours', now() - interval '2 days 2 hours', 0, 1, 'completed'),
  ('a3333333-0000-0000-0000-000000000003', 'f1111111-0000-0000-0000-000000000001',
   now() - interval '1 day 6 hours', now() - interval '1 day 2 hours', 0, 1, 'completed');
insert into public.assignments (id, shift_id, worker_id, status) values
  ('91111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', :'worker_a', 'confirmed'),
  ('92222222-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000002', :'worker_a', 'confirmed'),
  ('93333333-0000-0000-0000-000000000003', 'a3333333-0000-0000-0000-000000000003', :'worker_a', 'confirmed');
insert into public.timesheets (id, assignment_id, worker_id, job_id, start_at, finish_at, break_minutes,
  status, approve_by)
select t.id, t.assignment_id, :'worker_a', 'f1111111-0000-0000-0000-000000000001', s.starts_at, s.ends_at,
  s.break_minutes, t.status, now()
from (values
  ('71111111-0000-0000-0000-000000000001'::uuid, '91111111-0000-0000-0000-000000000001'::uuid,
   'approved'::public.timesheet_status, 'a1111111-0000-0000-0000-000000000001'::uuid),
  ('72222222-0000-0000-0000-000000000002', '92222222-0000-0000-0000-000000000002', 'submitted',
   'a2222222-0000-0000-0000-000000000002'),
  ('73333333-0000-0000-0000-000000000003', '93333333-0000-0000-0000-000000000003', 'approved',
   'a3333333-0000-0000-0000-000000000003')
) as t (id, assignment_id, status, shift_id)
join public.shifts s on s.id = t.shift_id;

-- 10 hours worked: 7.6 at the shift's rate, 2 of overtime, then 0.4 at the
-- later overtime rate, plus a call-out loading. S3 was costed for hours
-- that have since changed.
insert into public.timesheet_costs (timesheet_id, start_at, finish_at, break_minutes, minutes_by_type,
  cost, paid_minutes, pay_cents, on_cost_cents, bill_cents, margin_cents)
select id,
  start_at + case when id = '73333333-0000-0000-0000-000000000003' then interval '15 minutes' else interval '0' end,
  finish_at, break_minutes, '{}',
  $json${
    "lines": [
      {"type": "ordinary", "kind": "worked", "minutes": 456, "payRateCents": 3435, "payCents": 26106,
       "billRateCents": 5301, "billCents": 40288},
      {"type": "overtime", "kind": "worked", "minutes": 120, "payRateCents": 4809, "payCents": 9618,
       "billRateCents": 7421, "billCents": 14842},
      {"type": "overtime_after", "kind": "worked", "minutes": 24, "payRateCents": 6183, "payCents": 2473,
       "billRateCents": 9541, "billCents": 3816}
    ],
    "urgentPayCents": 7639, "urgentBillCents": 11789
  }$json$::jsonb,
  600, 45836, 10749, 70735, 14150
from public.timesheets
where id in ('71111111-0000-0000-0000-000000000001', '72222222-0000-0000-0000-000000000002',
  '73333333-0000-0000-0000-000000000003');

select has_function('public', 'my_timesheet_pay', array['uuid'], 'Workers can see how their pay adds up');
select ok(
  pg_get_function_result('public.my_timesheet_pay(uuid)'::regprocedure) !~ 'bill',
  'It gives the pay, never the charge'
);
select ok(
  not has_function_privilege('anon', 'public.my_timesheet_pay(uuid)', 'execute'),
  'Anonymous visitors cannot call it'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select rate_type, kind, minutes, rate_cents, pay_cents
     from public.my_timesheet_pay('71111111-0000-0000-0000-000000000001') $$,
  $$ values ('ordinary', 'worked', 456, 3435, 26106),
            ('overtime', 'worked', 120, 4809, 9618),
            ('overtime_after', 'worked', 24, 6183, 2473),
            ('callout', 'loading', null::integer, null::integer, 7639) $$,
  'The worker sees each rate, overtime included, then the call-out loading'
);
select is(
  (select sum(pay_cents)::integer from public.my_timesheet_pay('71111111-0000-0000-0000-000000000001')),
  (select pay_cents from public.my_timesheets('71111111-0000-0000-0000-000000000001')),
  'The lines add up to the pay on the timesheet'
);
select is_empty(
  $$ select * from public.my_timesheet_pay('72222222-0000-0000-0000-000000000002') $$,
  'Nothing until the business approves the hours'
);
select is_empty(
  $$ select * from public.my_timesheet_pay('73333333-0000-0000-0000-000000000003') $$,
  'Nothing while changed hours wait to be costed again'
);

-- The card's allowances (owner, 03/11/2026) come last, by name.
reset role;
update public.timesheet_costs
set cost = cost || '{"allowances": [{"name": "Meal allowance", "payCents": 1753, "billCents": 2300}]}'::jsonb,
  pay_cents = pay_cents + 1753
where timesheet_id = '71111111-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select rate_type, kind, pay_cents
     from public.my_timesheet_pay('71111111-0000-0000-0000-000000000001')
     where kind in ('loading', 'allowance') $$,
  $$ values ('callout', 'loading', 7639), ('Meal allowance', 'allowance', 1753) $$,
  'Then each allowance the shift earned, by name'
);
select is(
  (select sum(pay_cents)::integer from public.my_timesheet_pay('71111111-0000-0000-0000-000000000001')),
  (select pay_cents from public.my_timesheets('71111111-0000-0000-0000-000000000001')),
  'Still adding up to the pay on the timesheet'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is_empty(
  $$ select * from public.my_timesheet_pay('71111111-0000-0000-0000-000000000001') $$,
  'Another worker sees nothing'
);

select * from finish();
rollback;
