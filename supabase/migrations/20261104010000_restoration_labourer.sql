-- Restoration labourer is back (owner, 04/11/2026), at the cleaning award's
-- level 1, for restoration labouring such as strip-outs and pack-outs.
-- Restoration technicians stay at level 2 for certified work. Its checked
-- rate card from 01/11/2026 was never archived (only placeholder cards were,
-- 20261102020000_focus_work_types.sql), so it can be posted again at once.
-- A new database gets the same from the seed.

update public.categories
set archived_at = null
where code = 'restoration_labourer'
  and archived_at is not null;

-- Wording that tells the two apart, where an admin hasn't changed it.
update public.categories
set description = 'General labour on water, fire and storm damage jobs: strip-outs, pack-outs, moving equipment and removing debris.'
where code = 'restoration_labourer'
  and description = 'General labour on water, fire and storm damage jobs: moving equipment, removing debris, setting up drying gear.';

update public.categories
set description = 'Skilled water, fire, mould and storm damage work: drying, moisture readings, and mould and fire clean-ups. Jobs can ask for IICRC tickets.'
where code = 'restoration_technician'
  and description = 'Water, fire, mould and storm damage work: strip-outs, setting up drying equipment, pack-outs and clean-ups. Jobs can ask for IICRC tickets.';

update public.industries
set summary = 'Restoration labourers and technicians for water, fire, mould and storm damage.'
where code = 'restoration'
  and summary = 'Restoration technicians for water, fire, mould and storm damage.';

update public.industries
set description = 'Restoration labourers and technicians for water, fire, mould and storm damage: strip-outs, drying equipment, pack-outs and clean-ups, including urgent call-outs. Ask for IICRC tickets on a job when you need certified technicians.'
where code = 'restoration'
  and description = 'Restoration technicians for water, fire, mould and storm damage: strip-outs, drying equipment, pack-outs and clean-ups, including urgent call-outs. Ask for IICRC tickets on a job when you need certified technicians.';
