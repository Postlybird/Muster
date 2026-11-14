-- The app stores' reviewers sign in with a fixed code (owner, 14/11/2026),
-- the one exception to "no passwords", and only while an admin has switched
-- review sign-in on. Each try is recorded: ten wrong codes since it was
-- switched on switch it off again, and our team can see when reviewers
-- signed in. Written only by the app's server (src/server/app-review.ts).

create table public.app_review_sign_ins (
  id uuid primary key default gen_random_uuid(),
  ok boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.app_review_sign_ins is
  'Each try of the app reviewers'' fixed code: whether it was right, and when.';

create index app_review_sign_ins_created_idx on public.app_review_sign_ins (created_at);

alter table public.app_review_sign_ins enable row level security;

create policy "app review sign-ins: admins read" on public.app_review_sign_ins
  for select to authenticated using ((select public.is_admin()));

grant select on public.app_review_sign_ins to authenticated;
grant all on public.app_review_sign_ins to service_role;
