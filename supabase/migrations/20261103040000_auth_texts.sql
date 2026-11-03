-- Code texts on the live site (security review, 03/11/2026). Supabase Auth
-- hands each code it sends to the app (src/server/auth-hooks.ts), which
-- stops at a few texts a day for each person. This records when each
-- person was texted a code: only the person and the time, not the number
-- or the code, and only for two days. The service role reads and writes it.

create table public.auth_texts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);

comment on table public.auth_texts is
  'When each person was texted a sign-up or confirmation code, for the daily limit (src/domain/auth-messages.ts).';

create index auth_texts_user_id_sent_at_idx on public.auth_texts (user_id, sent_at);

alter table public.auth_texts enable row level security;
grant all on public.auth_texts to service_role;
