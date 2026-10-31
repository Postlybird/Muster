-- Call-outs: owners and managers turn open work starting within 48 hours
-- into a call-out (once there are no applicants to pick from), businesses
-- see how many workers were told, and a call-out nobody has taken after
-- the wait is flagged once, for the business and our team to hear.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into public.jurisdictions (code, name) values ('NSW', 'New South Wales')
on conflict (code) do nothing;
insert into public.categories (id, code, name) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner');

insert into auth.users (id, email, phone, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker.a@pgtap.test', '61400000001', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', null, now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', null, now(), '{"signup_role": "business_user"}');
select id as worker_a from public.workers where profile_id = '11111111-1111-1111-1111-111111111111' \gset

insert into public.businesses (id, abn, legal_name, trading_name, abn_status, abr_checked_at, status,
  account_terms_approved, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'One', 'active', now(),
   'approved', true, '61111111-1111-1111-1111-111111111111'),
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP TWO PTY LTD', null, 'active', now(),
   'approved', true, '65555555-5555-5555-5555-555555555555');
insert into public.business_users (id, business_id, profile_id, role, accepted_at) values
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('c5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot',
   '1 Secret St', 'Parramatta', 'NSW', '2150', -33.81, 151.00);

-- J1: open, starts in 3 hours. J2: starts in 3 days. J3: starts in 3 hours,
-- with an applicant. J4: a call-out posted 30 minutes ago that nobody has
-- taken. J5: a call-out posted 5 minutes ago.
insert into public.jobs (id, business_id, site_id, category_id, status, posted_at, no_known_hazards,
  fill_mode, type) values
  ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted',
   now() - interval '1 day', true, 'pick', 'single'),
  ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted',
   now() - interval '1 day', true, 'pick', 'single'),
  ('f3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted',
   now() - interval '1 day', true, 'pick', 'single'),
  ('f4444444-0000-0000-0000-000000000004', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted',
   now() - interval '30 minutes', true, 'auto', 'urgent'),
  ('f5555555-0000-0000-0000-000000000005', 'b1111111-0000-0000-0000-000000000001',
   'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'posted',
   now() - interval '5 minutes', true, 'auto', 'urgent');
insert into public.shifts (id, job_id, starts_at, ends_at, headcount) values
  ('a1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001',
   now() + interval '3 hours', now() + interval '7 hours', 1),
  ('a2222222-0000-0000-0000-000000000002', 'f2222222-0000-0000-0000-000000000002',
   now() + interval '3 days', now() + interval '3 days 4 hours', 1),
  ('a3333333-0000-0000-0000-000000000003', 'f3333333-0000-0000-0000-000000000003',
   now() + interval '3 hours', now() + interval '7 hours', 1),
  ('a4444444-0000-0000-0000-000000000004', 'f4444444-0000-0000-0000-000000000004',
   now() + interval '2 hours', now() + interval '6 hours', 1),
  ('a5555555-0000-0000-0000-000000000005', 'f5555555-0000-0000-0000-000000000005',
   now() + interval '2 hours', now() + interval '6 hours', 1);
insert into public.applications (shift_id, worker_id)
values ('a3333333-0000-0000-0000-000000000003', :'worker_a');
insert into public.shift_matches (shift_id, worker_id, eligible, visible_from, notified_at)
values ('a4444444-0000-0000-0000-000000000004', :'worker_a', true, now() - interval '30 minutes',
        now() - interval '29 minutes');

set local role authenticated;

-- Another business can't touch it
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.make_callout('f1111111-0000-0000-0000-000000000001') $$,
  '42501', null, 'only the business''s owners and managers make call-outs'
);
select is(
  public.job_callout_reach('f4444444-0000-0000-0000-000000000004'), null,
  'or see how many workers one reached'
);

-- The owner
select set_config('request.jwt.claims', '{"sub": "61111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.make_callout('f2222222-0000-0000-0000-000000000002') $$,
  '23514', 'Call-outs are for work in the next 48 hours', 'call-outs are for work starting soon'
);
select throws_ok(
  $$ select public.make_callout('f3333333-0000-0000-0000-000000000003') $$,
  '23514', 'Pick from your applicants first', 'not while applicants are waiting to be picked'
);
select is(
  public.make_callout('f1111111-0000-0000-0000-000000000001'), 1,
  'open work starting soon becomes a call-out'
);
select is(
  (select row(type, fill_mode, callout_started_at is not null)::text
   from public.jobs where id = 'f1111111-0000-0000-0000-000000000001'),
  row('urgent'::public.job_type, 'auto'::public.fill_mode, true)::text,
  'first in, from now'
);
select throws_ok(
  $$ select public.make_callout('f1111111-0000-0000-0000-000000000001') $$,
  '23514', 'It''s already a call-out', 'once'
);
select is(
  public.job_callout_reach('f4444444-0000-0000-0000-000000000004'), 1,
  'the business sees how many workers a call-out reached'
);
select throws_ok(
  $$ select * from public.flag_unfilled_callouts() $$,
  '42501', null, 'only the scheduled job flags call-outs nobody has taken'
);

-- The scheduled job
reset role;
select results_eq(
  $$ select job_id, waited_minutes >= 30, reach from public.flag_unfilled_callouts() $$,
  $$ values ('f4444444-0000-0000-0000-000000000004'::uuid, true, 1) $$,
  'a call-out nobody has taken after 20 minutes is flagged, with how many it reached'
);
select is_empty(
  $$ select * from public.flag_unfilled_callouts() $$,
  'once'
);

select * from finish();
rollback;
