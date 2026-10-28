-- The expiry engine (brief §4.9) runs as a scheduled job with the
-- service-role key: it marks tickets and visas expired, warns workers
-- beforehand, and flags booked shifts that no longer pass the rules for
-- admins, alongside the other matters in the queues.
alter table public.admin_flags drop constraint admin_flags_kind_check;
alter table public.admin_flags add constraint admin_flags_kind_check check (
  kind in (
    'no_show', 'suspension', 'possible_no_show', 'outside_site', 'safety', 'work_limit',
    'timesheet_dispute', 'booking_at_risk'
  )
);
