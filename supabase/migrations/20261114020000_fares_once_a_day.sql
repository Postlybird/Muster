-- The fares and travel allowance is paid once a day (owner, 14/11/2026), as
-- the building award pays it for each day worked: on a worker's first
-- shift with us that day, in the order their shifts were booked
-- (src/domain/pay.ts shiftAllowances). Bookings made before keep the rates
-- they were priced with. A new database gets the same from the seed.

comment on column public.rate_cards.allowances is
  'The award''s allowances (src/domain/rates.ts allowancesFrom): name, pay_cents, when (each_shift, each_day or late_overtime) and after_hours.';

update public.rate_cards rc
set allowances = (
      select jsonb_agg(
        case
          when a ->> 'name' = 'Fares and travel allowance' and a ->> 'when' = 'each_shift'
            then jsonb_set(a, '{when}', '"each_day"')
          else a
        end
        order by t.ord
      )
      from jsonb_array_elements(rc.allowances) with ordinality as t (a, ord)
    ),
    notes = replace(
      rc.notes,
      'Fares and travel allowance, $22.41 a day worked: an allowance on every shift.',
      'Fares and travel allowance, $22.41 a day worked: paid once a day, on the worker''s first shift with us that day.'
    )
where rc.allowances @> '[{"name": "Fares and travel allowance", "when": "each_shift"}]';
