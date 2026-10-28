-- Reports: fill rate, time to fill and no-shows for shifts starting in a
-- period, and approved hours as costed by business and work type. Admins
-- only. The period is March 2020, clear of the demo data.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1811111-0000-0000-0000-000000000001', 'pgtap_report_cleaner', 'PGTAP report cleaner'),
  ('e1822222-0000-0000-0000-000000000002', 'pgtap_report_labourer', 'PGTAP report labourer');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('18111111-1111-1111-1111-111111111111', 'report.a@pgtap.test', now(), '{}'),
  ('18222222-2222-2222-2222-222222222222', 'report.b@pgtap.test', now(), '{}'),
  ('18444444-4444-4444-4444-444444444444', 'report.admin@pgtap.test', now(), '{}'),
  ('18555555-5555-5555-5555-555555555555', 'report.owner@pgtap.test', now(), '{"signup_role": "business_user"}');
update public.profiles set role = 'admin' where id = '18444444-4444-4444-4444-444444444444';
select id as worker_a from public.workers where profile_id = '18111111-1111-1111-1111-111111111111' \gset
select id as worker_b from public.workers where profile_id = '18222222-2222-2222-2222-222222222222' \gset

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1811111-0000-0000-0000-000000000001', '18111111111', 'REPORT ONE PTY LTD', 'Report One', 'active', now(),
   'approved', true, '18555555-5555-5555-5555-555555555555'),
  ('b1822222-0000-0000-0000-000000000002', '18222222222', 'REPORT TWO PTY LTD', 'Report Two', 'active', now(),
   'approved', true, '18555555-5555-5555-5555-555555555555');
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1811111-0000-0000-0000-000000000001', 'b1811111-0000-0000-0000-000000000001', 'One depot',
   '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00),
  ('d1822222-0000-0000-0000-000000000002', 'b1822222-0000-0000-0000-000000000002', 'Two depot',
   '2 Test St', 'Penrith', 'NSW', '2750', -33.75, 150.69);

-- J1 (One, cleaner): S1 for two (A worked, B didn't come), S2 cancelled by
-- the business, and S5 after the period. J2 (Two, labourer): S3, A worked.
-- J3 is a draft.
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards) values
  ('f1811111-0000-0000-0000-000000000001', 'b1811111-0000-0000-0000-000000000001',
   'd1811111-0000-0000-0000-000000000001', 'e1811111-0000-0000-0000-000000000001', 'completed',
   '2020-02-25 09:00+11', true),
  ('f1822222-0000-0000-0000-000000000002', 'b1822222-0000-0000-0000-000000000002',
   'd1822222-0000-0000-0000-000000000002', 'e1822222-0000-0000-0000-000000000002', 'completed',
   '2020-03-01 09:00+11', true),
  ('f1833333-0000-0000-0000-000000000003', 'b1811111-0000-0000-0000-000000000001',
   'd1811111-0000-0000-0000-000000000001', 'e1811111-0000-0000-0000-000000000001', 'draft', null, true);
insert into public.shifts (id, job_id, starts_at, ends_at, headcount, status) values
  ('a1811111-0000-0000-0000-000000000001', 'f1811111-0000-0000-0000-000000000001',
   '2020-03-02 08:00+11', '2020-03-02 16:00+11', 2, 'completed'),
  ('a1822222-0000-0000-0000-000000000002', 'f1811111-0000-0000-0000-000000000001',
   '2020-03-03 08:00+11', '2020-03-03 16:00+11', 1, 'cancelled'),
  ('a1833333-0000-0000-0000-000000000003', 'f1822222-0000-0000-0000-000000000002',
   '2020-03-05 08:00+11', '2020-03-05 12:00+11', 1, 'completed'),
  ('a1844444-0000-0000-0000-000000000004', 'f1833333-0000-0000-0000-000000000003',
   '2020-03-06 08:00+11', '2020-03-06 12:00+11', 3, 'open'),
  ('a1855555-0000-0000-0000-000000000005', 'f1811111-0000-0000-0000-000000000001',
   '2020-04-02 08:00+11', '2020-04-02 12:00+11', 1, 'completed');
insert into public.assignments (id, shift_id, worker_id, status, confirmed_at) values
  ('91811111-0000-0000-0000-000000000001', 'a1811111-0000-0000-0000-000000000001', :'worker_a',
   'completed', '2020-02-25 10:00+11'),
  ('91822222-0000-0000-0000-000000000002', 'a1811111-0000-0000-0000-000000000001', :'worker_b',
   'no_show', '2020-02-25 12:00+11'),
  ('91833333-0000-0000-0000-000000000003', 'a1833333-0000-0000-0000-000000000003', :'worker_a',
   'completed', '2020-03-01 11:00+11'),
  ('91855555-0000-0000-0000-000000000005', 'a1855555-0000-0000-0000-000000000005', :'worker_b',
   'completed', '2020-03-30 11:00+11');
insert into public.timesheets (id, assignment_id, worker_id, job_id, start_at, finish_at, status, approve_by) values
  ('71811111-0000-0000-0000-000000000001', '91811111-0000-0000-0000-000000000001', :'worker_a',
   'f1811111-0000-0000-0000-000000000001', '2020-03-02 08:00+11', '2020-03-02 16:00+11', 'approved', now()),
  ('71833333-0000-0000-0000-000000000003', '91833333-0000-0000-0000-000000000003', :'worker_a',
   'f1822222-0000-0000-0000-000000000002', '2020-03-05 08:00+11', '2020-03-05 12:00+11', 'adjusted', now()),
  ('71855555-0000-0000-0000-000000000005', '91855555-0000-0000-0000-000000000005', :'worker_b',
   'f1811111-0000-0000-0000-000000000001', '2020-04-02 08:00+11', '2020-04-02 12:00+11', 'approved', now());
insert into public.timesheet_costs (timesheet_id, start_at, finish_at, break_minutes, minutes_by_type,
  cost, paid_minutes, pay_cents, on_cost_cents, bill_cents, margin_cents)
select t.id, t.start_at, t.finish_at, 0, '{}', '{}', c.minutes, c.pay, c.on_cost, c.bill, c.margin
from public.timesheets t
join (values
  ('71811111-0000-0000-0000-000000000001'::uuid, 480, 20000, 4000, 30000, 6000),
  ('71833333-0000-0000-0000-000000000003', 240, 10000, 2000, 16000, 4000),
  ('71855555-0000-0000-0000-000000000005', 240, 10000, 2000, 16000, 4000)
) as c (id, minutes, pay, on_cost, bill, margin) on c.id = t.id;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "18111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select places, active_workers from public.admin_report_summary('2020-03-01 00:00+11', '2020-04-01 00:00+11') $$,
  $$ values (0, 0) $$,
  'workers see no report'
);
select is(
  (select count(*) from public.admin_report_breakdown('2020-03-01 00:00+11', '2020-04-01 00:00+11')),
  0::bigint, 'or money'
);

select set_config('request.jwt.claims', '{"sub": "18444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);
select results_eq(
  $$ select places, filled from public.admin_report_summary('2020-03-01 00:00+11', '2020-04-01 00:00+11') $$,
  $$ values (3, 3) $$,
  'places on posted shifts the business didn''t cancel, and how many were booked'
);
select is(
  (select median_minutes_to_fill from public.admin_report_summary('2020-03-01 00:00+11', '2020-04-01 00:00+11')),
  120::numeric, 'the typical time from posting to booking'
);
select results_eq(
  $$ select started_bookings, no_shows, workers_worked from public.admin_report_summary('2020-03-01 00:00+11', '2020-04-01 00:00+11') $$,
  $$ values (3, 1, 1) $$,
  'no-shows among bookings that started, and who worked'
);
select ok(
  (select active_workers > 0 from public.admin_report_summary('2020-03-01 00:00+11', '2020-04-01 00:00+11')),
  'active workers are counted'
);
select results_eq(
  $$ select dimension, name, shifts, paid_minutes, bill_cents, cost_cents, margin_cents
     from public.admin_report_breakdown('2020-03-01 00:00+11', '2020-04-01 00:00+11') $$,
  $$ values
       ('business', 'Report One', 1, 480, 30000::bigint, 24000::bigint, 6000::bigint),
       ('business', 'Report Two', 1, 240, 16000::bigint, 12000::bigint, 4000::bigint),
       ('category', 'PGTAP report cleaner', 1, 480, 30000::bigint, 24000::bigint, 6000::bigint),
       ('category', 'PGTAP report labourer', 1, 240, 16000::bigint, 12000::bigint, 4000::bigint) $$,
  'approved hours as costed, by business and work type, biggest first'
);
select is(
  (select count(*) from public.admin_report_breakdown('2020-04-01 00:00+11', '2020-05-01 00:00+11')
   where name = 'Report One'),
  1::bigint, 'each period counts the shifts that start in it'
);

select * from finish();
rollback;
