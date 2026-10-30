-- Jobs: managers build drafts and post them; supervisors see jobs at their
-- sites; posting checks approval, account terms, licences, dates and the
-- hazard section; posted jobs can't be changed by the business.
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- Catalogue and compliance rows (demo data loads the real ones; CI tests run before it).
-- Both states open for work, so QLD is blocked only by the missing licence.
insert into public.jurisdictions (code, name, open_for_work) values ('NSW', 'New South Wales', true)
on conflict (code) do update set open_for_work = true;
insert into public.jurisdictions (code, name, licence_required, open_for_work) values ('QLD', 'Queensland', true, true)
on conflict (code) do update set licence_required = true, open_for_work = true;
update public.licences set archived_at = now() where jurisdiction = 'QLD';

insert into public.categories (id, code, name, default_level) values
  ('e1111111-0000-0000-0000-000000000001', 'pgtap_cleaner', 'PGTAP cleaner', 2);
insert into public.credential_types (id, code, name) values
  ('e2222222-0000-0000-0000-000000000002', 'pgtap_card', 'PGTAP card');
insert into public.hazards (id, code, name) values
  ('e3333333-0000-0000-0000-000000000003', 'pgtap_mould', 'PGTAP mould');
insert into public.ppe_items (id, code, name) values
  ('e4444444-0000-0000-0000-000000000004', 'pgtap_gloves', 'PGTAP gloves');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'worker@pgtap.test', now(), '{}'),
  ('61111111-1111-1111-1111-111111111111', 'owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('62222222-2222-2222-2222-222222222222', 'manager@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('63333333-3333-3333-3333-333333333333', 'supervisor@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('65555555-5555-5555-5555-555555555555', 'other.owner@pgtap.test', now(), '{"signup_role": "business_user"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@pgtap.test', now(), '{}');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.businesses (id, abn, legal_name, abn_status, abr_checked_at, status,
  account_terms_approved, payment_terms_days, approved_at, created_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111111', 'PGTAP ONE PTY LTD', 'active', now(),
   'approved', true, 14, now(), '61111111-1111-1111-1111-111111111111'),
  ('b2222222-0000-0000-0000-000000000002', '22222222222', 'PGTAP TWO PTY LTD', 'active', now(),
   'approved', false, null, now(), '65555555-5555-5555-5555-555555555555');
insert into public.business_users (id, business_id, profile_id, role, accepted_at) values
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '61111111-1111-1111-1111-111111111111', 'owner', now()),
  ('c2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001', '62222222-2222-2222-2222-222222222222', 'manager', now()),
  ('c3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001', '63333333-3333-3333-3333-333333333333', 'supervisor', now()),
  ('c5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002', '65555555-5555-5555-5555-555555555555', 'owner', now());
insert into public.sites (id, business_id, name, address_line1, suburb, state, postcode, lat, lng) values
  ('d1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Depot', '1 Test St', 'Parramatta', 'NSW', '2150', -33.81, 151.00),
  ('d2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001', 'Job site', '2 Test St', 'Penrith', 'NSW', '2750', -33.75, 150.69),
  ('d3333333-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001', 'Brisbane', '3 Test St', 'Brisbane', 'QLD', '4000', -27.47, 153.03),
  ('d5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002', 'Theirs', '5 Test St', 'Ryde', 'NSW', '2112', -33.81, 151.10);
insert into public.business_user_sites (business_user_id, site_id)
values ('c3333333-0000-0000-0000-000000000003', 'd2222222-0000-0000-0000-000000000002');

-- Both have accepted whatever services agreement is current.
insert into public.agreement_acceptances (agreement_id, profile_id, business_id)
select a.id, b.created_by, b.id
from public.agreements a cross join public.businesses b
where a.kind = 'labour_hire_services' and a.is_current and a.jurisdiction is null
  and b.id in ('b1111111-0000-0000-0000-000000000001', 'b2222222-0000-0000-0000-000000000002');

set local role authenticated;

-- Manager builds a draft
select set_config('request.jwt.claims', '{"sub": "62222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.jobs (id, business_id, site_id, category_id, level, headcount)
     values ('f1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001',
             'd2222222-0000-0000-0000-000000000002', 'e1111111-0000-0000-0000-000000000001', 5, 2) $$,
  'a manager can start a draft job'
);

select is(
  (select level from public.jobs where id = 'f1111111-0000-0000-0000-000000000001'),
  2::smallint,
  'the work type sets the level, not the business'
);

select lives_ok(
  $$ insert into public.shifts (job_id, starts_at, ends_at, break_minutes, headcount)
     values ('f1111111-0000-0000-0000-000000000001', now() + interval '2 days',
             now() + interval '2 days 8 hours', 30, 2) $$,
  'a manager can add shifts to a draft'
);

select throws_ok(
  $$ insert into public.shifts (job_id, starts_at, ends_at, break_minutes, headcount)
     values ('f1111111-0000-0000-0000-000000000001', now() + interval '3 days',
             now() + interval '3 days 15 hours', 30, 2) $$,
  '23514', null,
  'a shift can''t be longer than 14 hours'
);

select lives_ok(
  $$ insert into public.job_hazards (job_id, hazard_id)
     values ('f1111111-0000-0000-0000-000000000001', 'e3333333-0000-0000-0000-000000000003');
     insert into public.job_credentials (job_id, credential_type_id)
     values ('f1111111-0000-0000-0000-000000000001', 'e2222222-0000-0000-0000-000000000002');
     insert into public.job_ppe (job_id, ppe_item_id)
     values ('f1111111-0000-0000-0000-000000000001', 'e4444444-0000-0000-0000-000000000004') $$,
  'a manager can tick hazards, tickets and PPE'
);

select throws_ok(
  $$ insert into public.jobs (business_id, site_id)
     values ('b1111111-0000-0000-0000-000000000001', 'd5555555-0000-0000-0000-000000000005') $$,
  '23514', 'Choose one of your sites',
  'a job can''t use another business''s site'
);

select throws_ok(
  $$ update public.jobs set status = 'posted', posted_at = now()
     where id = 'f1111111-0000-0000-0000-000000000001' $$,
  '42501', null,
  'a job can''t be marked posted directly'
);

select throws_ok(
  $$ select public.post_job('f1111111-0000-0000-0000-000000000001') $$,
  '23514', 'Describe the controls in place',
  'hazards need their controls described before posting'
);

update public.jobs set hazard_controls = 'Mould remediation contractor has cleared the area.'
where id = 'f1111111-0000-0000-0000-000000000001';

select lives_ok(
  $$ select public.post_job('f1111111-0000-0000-0000-000000000001') $$,
  'a complete job can be posted'
);

select is(
  (select status::text || '/' || posted_by::text from public.jobs
   where id = 'f1111111-0000-0000-0000-000000000001'),
  'posted/62222222-2222-2222-2222-222222222222',
  'posting records who posted it'
);

select is_empty(
  $$ update public.jobs set instructions = 'Changed'
     where id = 'f1111111-0000-0000-0000-000000000001' returning id $$,
  'a posted job can''t be changed by the business'
);

select throws_ok(
  $$ insert into public.shifts (job_id, starts_at, ends_at, headcount)
     values ('f1111111-0000-0000-0000-000000000001', now() + interval '4 days',
             now() + interval '4 days 4 hours', 1) $$,
  '42501', null,
  'shifts can''t be added to a posted job'
);

-- A draft with no hazard answer, a past shift and a blocked state.
insert into public.jobs (id, business_id, site_id, category_id)
values ('f2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001',
        'd1111111-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001');
insert into public.shifts (job_id, starts_at, ends_at, headcount)
values ('f2222222-0000-0000-0000-000000000002', now() + interval '1 day', now() + interval '1 day 4 hours', 1);

select throws_ok(
  $$ select public.post_job('f2222222-0000-0000-0000-000000000002') $$,
  '23514', 'Complete the hazards section',
  'a job can''t be posted until the hazard section is answered'
);

update public.jobs set no_known_hazards = true where id = 'f2222222-0000-0000-0000-000000000002';
update public.shifts set starts_at = now() - interval '1 hour', ends_at = now() + interval '3 hours'
where job_id = 'f2222222-0000-0000-0000-000000000002';

select throws_ok(
  $$ select public.post_job('f2222222-0000-0000-0000-000000000002') $$,
  '23514', 'A shift has already started',
  'shifts in the past can''t be posted'
);

update public.shifts set starts_at = now() + interval '1 day', ends_at = now() + interval '1 day 4 hours'
where job_id = 'f2222222-0000-0000-0000-000000000002';
update public.jobs set site_id = 'd3333333-0000-0000-0000-000000000003'
where id = 'f2222222-0000-0000-0000-000000000002';

select throws_ok(
  $$ select public.post_job('f2222222-0000-0000-0000-000000000002') $$,
  '23514', 'We can''t place workers in QLD yet',
  'work can''t be posted in a state where we need a licence we don''t hold'
);

select ok(
  (select public.duplicate_job('f1111111-0000-0000-0000-000000000001')) is not null,
  'a posted job can be copied into a new draft'
);

select is(
  (select array[count(*) filter (where s.id is not null), count(distinct h.hazard_id)]::bigint[]
   from public.jobs j
   left join public.shifts s on s.job_id = j.id
   left join public.job_hazards h on h.job_id = j.id
   where j.copied_from = 'f1111111-0000-0000-0000-000000000001'),
  array[0, 1]::bigint[],
  'the copy keeps the hazards but not the dates'
);

select lives_ok(
  $$ insert into public.job_templates (business_id, job_id, name)
     values ('b1111111-0000-0000-0000-000000000001', 'f1111111-0000-0000-0000-000000000001', 'Mould clean-up') $$,
  'a manager can save a job as a template'
);

-- Supervisor
select set_config('request.jwt.claims', '{"sub": "63333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select ok(
  exists (select 1 from public.jobs where id = 'f1111111-0000-0000-0000-000000000001'),
  'a supervisor sees jobs at their sites'
);

select is_empty(
  $$ select id from public.jobs where id = 'f2222222-0000-0000-0000-000000000002' $$,
  'a supervisor doesn''t see jobs at other sites'
);

select throws_ok(
  $$ insert into public.jobs (business_id, site_id)
     values ('b1111111-0000-0000-0000-000000000001', 'd2222222-0000-0000-0000-000000000002') $$,
  '42501', null,
  'supervisors can''t post work'
);

-- Another business
select set_config('request.jwt.claims', '{"sub": "65555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);

select is_empty($$ select id from public.jobs $$, 'other businesses can''t see the jobs');

insert into public.jobs (id, business_id, site_id, category_id, no_known_hazards)
values ('f5555555-0000-0000-0000-000000000005', 'b2222222-0000-0000-0000-000000000002',
        'd5555555-0000-0000-0000-000000000005', 'e1111111-0000-0000-0000-000000000001', true);
insert into public.shifts (job_id, starts_at, ends_at, headcount)
values ('f5555555-0000-0000-0000-000000000005', now() + interval '1 day', now() + interval '1 day 4 hours', 1);

select throws_ok(
  $$ select public.post_job('f5555555-0000-0000-0000-000000000005') $$,
  '23514', 'The business can''t post work yet',
  'a business without account terms can''t post'
);

-- A worker
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is_empty($$ select id from public.jobs $$, 'workers can''t see draft or posted jobs yet');

-- An admin
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select is(
  (select count(*) from public.jobs
   where business_id in ('b1111111-0000-0000-0000-000000000001', 'b2222222-0000-0000-0000-000000000002')),
  4::bigint,
  'an admin sees every job'
);

select * from finish();
rollback;
