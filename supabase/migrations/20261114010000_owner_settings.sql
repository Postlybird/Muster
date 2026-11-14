-- The owner's decisions of 14/11/2026, for a database seeded before them
-- (a new one gets them from the settings' defaults). Only values still at
-- the old defaults, and not set by an admin, change.

-- Pay and invoices run on Wednesday, so the weekend's approved hours are in.
update public.settings
set value = '"wednesday"'
where key = 'weekly_run_day'
  and value = '"monday"'
  and updated_by is null;

-- Businesses pay within 7 days, as workers are paid weekly.
update public.settings
set value = '7'
where key = 'invoice_payment_terms_days'
  and value = '14'
  and updated_by is null;

-- A worker who hadn't arrived is paid the hours a business is charged for
-- cancelling late.
update public.settings
set value = 'true'
where key = 'pay_worker_on_late_business_cancel'
  and value = 'false'
  and updated_by is null;

-- No payroll tax in prices until wages near NSW's threshold.
update public.settings
set value = jsonb_set(value, '{payroll_tax}', '0')
where key = 'on_costs_pct'
  and (value ->> 'payroll_tax')::numeric = 5.45
  and updated_by is null;
