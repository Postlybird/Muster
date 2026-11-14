-- A long service levy on a work type's ordinary wages (owner, 14/11/2026):
-- NSW's contract cleaning scheme charges employers 1% of cleaners' ordinary
-- wages. It's an on-cost priced into the work type's charge, and like super
-- it's left off overtime and allowances (src/domain/pay.ts ordinaryOnlyPct).
-- Restoration work waits for the Long Service Corporation to say whether
-- the scheme covers it. A new database gets the same from the seed.

alter table public.categories
  add column long_service_levy_pct numeric(5, 2) not null default 0
    check (long_service_levy_pct between 0 and 10);

comment on column public.categories.long_service_levy_pct is
  'Long service levy on ordinary wages, as a percent, priced in like super (1% for NSW contract cleaning).';

update public.categories
set long_service_levy_pct = 1
where code in ('commercial_cleaner', 'builders_cleaner')
  and long_service_levy_pct = 0;
