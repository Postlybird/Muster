-- Notifications (brief §5). Every message we send a person is kept here,
-- with where it went: push to the installed app, a text or an email. The
-- worker app lists them. Non-urgent messages wait out quiet hours. The
-- server (src/server/notifications.ts) writes and sends them; people only
-- read their own and mark them read.
--
-- Message wording lives in code (src/config/notifications.ts); admins'
-- changes to it are kept in notification_templates. Web push subscriptions
-- are kept per device.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  template text not null,
  -- Email subject, or the heading of a push notification.
  title text not null,
  -- As the app and push notifications show it, where tapping opens the link.
  body text not null,
  -- As texts and emails show it, with the link.
  message text not null,
  -- A page in the app, e.g. /worker/shifts/<job id>.
  url text check (url ~ '^/'),
  -- Where it goes. None: it's in the app only.
  channels text[] not null default '{}'
    check (channels <@ array['push', 'sms', 'email']::text[]),
  urgent boolean not null default false,
  -- Held until quiet hours end.
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  -- Channels that couldn't be reached when it was sent.
  failed_channels text[] not null default '{}',
  read_at timestamptz,
  -- One message per event, e.g. "ticket_expiring:<ticket id>:14".
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create index notifications_inbox_idx on public.notifications (profile_id, created_at desc);
create index notifications_due_idx on public.notifications (send_after) where sent_at is null;

create table public.notification_templates (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 4000),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_templates_set_updated_at before update on public.notification_templates
  for each row execute function public.set_updated_at();
create trigger notification_templates_audit after insert or update or delete on public.notification_templates
  for each row execute function public.audit_row_change();

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- ---------------------------------------------------------------------------
-- What people do themselves
-- ---------------------------------------------------------------------------

-- Marks the person's own messages read: these, or all of them.
create function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where profile_id = (select auth.uid())
    and read_at is null
    and (p_ids is null or id = any (p_ids));
$$;

-- This device gets push notifications for the signed-in person. A device
-- someone else used before moves to them.
create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 500))
  on conflict (endpoint) do update
  set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth,
    user_agent = excluded.user_agent;
end;
$$;

-- This device stops getting them.
create function public.remove_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and profile_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------
grant execute on function public.mark_notifications_read(uuid[]),
  public.save_push_subscription(text, text, text, text),
  public.remove_push_subscription(text) to authenticated;

alter table public.notifications enable row level security;
alter table public.notification_templates enable row level security;
alter table public.push_subscriptions enable row level security;
grant all on public.notifications, public.notification_templates, public.push_subscriptions
  to service_role;
grant select on public.notifications, public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.notification_templates to authenticated;

create policy "notifications: own" on public.notifications
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "notifications: admins" on public.notifications
  for select to authenticated using ((select public.is_admin()));
create policy "push_subscriptions: own" on public.push_subscriptions
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "notification_templates: admins read" on public.notification_templates
  for select to authenticated using ((select public.is_admin()));
create policy "notification_templates: admins add" on public.notification_templates
  for insert to authenticated with check ((select public.is_admin()));
create policy "notification_templates: admins change" on public.notification_templates
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "notification_templates: admins reset" on public.notification_templates
  for delete to authenticated using ((select public.is_admin()));
