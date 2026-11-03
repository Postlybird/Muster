-- The launch rate cards' allowances (owner, 03/11/2026), from the Fair Work
-- pay guides effective 1 July 2026, for databases whose cards came before
-- allowances did. A new database gets them from the seed
-- (scripts/seed/data/rates.ts). Only the checked standard cards starting
-- 01/11/2026, and only while they have none, so an admin's own are kept.

-- Building and Construction General On-site Award: fares and travel, a day worked.
update public.rate_cards rc
set allowances = '[{"name": "Fares and travel allowance", "pay_cents": 2241, "when": "each_shift", "after_hours": null}]'::jsonb
from public.categories c
where c.id = rc.category_id
  and c.code = 'general_labourer'
  and rc.business_id is null
  and rc.effective_from = date '2026-11-01'
  and rc.allowances = '[]'::jsonb;

-- Cleaning Services Award: a meal allowance for more than 2 hours of
-- overtime without notice the day before.
update public.rate_cards rc
set allowances = '[{"name": "Meal allowance", "pay_cents": 1753, "when": "late_overtime", "after_hours": 2}]'::jsonb
from public.categories c
where c.id = rc.category_id
  and c.code in (
    'commercial_cleaner', 'builders_cleaner', 'restoration_technician', 'restoration_labourer',
    'contents_packout', 'strip_out_demolition', 'mould_remediation_assistant'
  )
  and rc.business_id is null
  and rc.effective_from = date '2026-11-01'
  and rc.allowances = '[]'::jsonb;
