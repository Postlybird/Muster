-- Overdue invoice reminders (owner, 03/11/2026: invoicing stays in Shifta).
-- The day after an invoice falls due, and then every few days (the
-- invoice_reminder_days setting) while it's unpaid, its business's accounts
-- email gets a reminder with the invoice attached, up to four times. Each
-- invoice records how many it's had and when, so none goes twice in a day.

alter table public.invoices
  add column reminders_sent smallint not null default 0 check (reminders_sent >= 0),
  add column last_reminder_on date;

comment on column public.invoices.reminders_sent is 'Overdue reminders emailed to the business (src/server/invoice-reminders.ts).';
comment on column public.invoices.last_reminder_on is 'The Sydney date of the last overdue reminder.';

-- Each morning in Sydney (08:05 to 10:05, depending on daylight saving):
-- the second call sends nothing new, as each invoice has a reminder at most
-- once a day.
select cron.schedule('invoice-reminders', '5 22,23 * * *',
  $$select public.call_scheduled_job('invoice-reminders')$$);
