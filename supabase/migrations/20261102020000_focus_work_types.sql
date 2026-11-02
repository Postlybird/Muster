-- Focus (owner, 02/11/2026): four industries and eight work types.
-- - Construction and labouring: general labourers.
-- - Cleaning: commercial and builders cleaners.
-- - Restoration: restoration technicians, who cover all restoration work.
-- - Warehousing and logistics: pick-packers, storepersons, forklift drivers
--   and removalist offsiders.
--
-- Everything else is archived, never deleted, and admins can bring any of it
-- back in Admin → Catalogues. The seed only adds what's missing, so this
-- brings an existing database (the hosted one) into line; a new database
-- gets the same from the seed.

-- 1. Industries and work types outside the focus are archived.
update public.industries
set archived_at = now()
where archived_at is null
  and code not in ('construction', 'cleaning', 'restoration', 'warehousing_logistics');

update public.categories
set archived_at = now()
where archived_at is null
  and code not in (
    'general_labourer',
    'commercial_cleaner',
    'builders_cleaner',
    'restoration_technician',
    'pick_packer',
    'storeperson',
    'forklift_driver',
    'removalist_offsider'
  );

-- 2. The four industries in the order the website lists them, and wording
-- that matches their work types (where an admin hasn't changed it).
update public.industries
set sort_order = case code
    when 'construction' then 10
    when 'cleaning' then 20
    when 'restoration' then 30
    when 'warehousing_logistics' then 40
    when 'hospitality' then 50
    when 'events' then 60
    when 'manufacturing' then 70
    when 'retail' then 80
    when 'office_admin' then 90
  end
where code in (
  'construction', 'cleaning', 'restoration', 'warehousing_logistics',
  'hospitality', 'events', 'manufacturing', 'retail', 'office_admin'
);

update public.industries
set summary = 'General labourers with a White Card, for building sites, fit-outs and clean-ups.',
    description = 'General labourers for building sites, civil works, fit-outs and clean-ups: carrying materials, loading skips and helping the trades. Every worker holds a White Card.'
where code = 'construction'
  and summary = 'Labourers, trades assistants and traffic controllers with the right tickets.';

update public.industries
set summary = 'Restoration technicians for water, fire, mould and storm damage.',
    description = 'Restoration technicians for water, fire, mould and storm damage: strip-outs, drying equipment, pack-outs and clean-ups, including urgent call-outs. Ask for IICRC tickets on a job when you need certified technicians.'
where code = 'restoration'
  and summary = 'Labourers and technicians for water, fire and storm damage.';

-- 3. Restoration technicians cover all restoration work (owner, 02/11/2026),
-- so the work type asks for a White Card, and a business ticks IICRC
-- tickets on the jobs that need them.
update public.categories
set description = 'Water, fire, mould and storm damage work: strip-outs, setting up drying equipment, pack-outs and clean-ups. Jobs can ask for IICRC tickets.'
where code = 'restoration_technician'
  and description = 'Qualified technician for water damage and drying: moisture mapping, equipment placement and monitoring.';

delete from public.category_credentials cc
using public.categories c, public.credential_types t
where cc.category_id = c.id
  and cc.credential_type_id = t.id
  and c.code = 'restoration_technician'
  and t.code = 'iicrc_wrt';

-- 4. Workers keep the work they chose: the restoration work types merged into
-- restoration technician, and trades assistant into general labourer, with
-- their most years in any of them.
insert into public.worker_categories (worker_id, category_id, years_experience)
select wc.worker_id, target.id, max(wc.years_experience)
from public.worker_categories wc
join public.categories old on old.id = wc.category_id
join public.categories target on target.code = case
    when old.code in (
      'restoration_labourer',
      'contents_packout',
      'strip_out_demolition',
      'mould_remediation_assistant'
    ) then 'restoration_technician'
    when old.code = 'trades_assistant' then 'general_labourer'
  end
group by wc.worker_id, target.id
on conflict (worker_id, category_id) do nothing;

-- 5. New work is priced only with rates a payroll professional has checked
-- (the other focus work types' placeholders were replaced from 01/11/2026).
-- The placeholder standard rate cards of the archived work types, and of the
-- warehouse work types still waiting for their award's rates, are archived:
-- until a checked card is added, that work can't be posted.
update public.rate_cards rc
set archived_at = now()
from public.categories c
where rc.category_id = c.id
  and rc.business_id is null
  and rc.checked_on is null
  and rc.archived_at is null
  and (
    c.archived_at is not null
    or c.code in ('pick_packer', 'storeperson', 'forklift_driver')
  );

-- 6. Templates for work that can no longer be posted are archived too.
update public.job_templates t
set archived_at = now()
from public.jobs j, public.categories c
where t.job_id = j.id
  and c.id = j.category_id
  and t.archived_at is null
  and c.archived_at is not null;
