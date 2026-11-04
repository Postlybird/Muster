-- Invoices show a row for each rate (hours, rate and amount), with the job
-- and PO numbers, the site, and the award and level (owner, 04/11/2026), as
-- businesses already get from other agencies. Invoices that have gone out
-- keep the lines they were sent with.

-- ---------------------------------------------------------------------------
-- 1. The award and level a rate card pays under, as invoices show it. Filled
-- in for the launch work types' checked cards; admins set it on others.
-- ---------------------------------------------------------------------------
alter table public.rate_cards
  add column award text check (char_length(award) <= 120);

update public.rate_cards rc
set award = case c.code
    when 'restoration_technician' then 'Cleaning Services Award 2020, level 2'
    when 'general_labourer' then 'Building and Construction General On-site Award 2020, CW/ECW 1'
    when 'removalist_offsider' then 'Road Transport and Distribution Award 2020, grade 1'
    else 'Cleaning Services Award 2020, level 1'
  end
from public.categories c
where c.id = rc.category_id
  and c.code in (
    'commercial_cleaner', 'builders_cleaner', 'restoration_labourer', 'contents_packout',
    'strip_out_demolition', 'mould_remediation_assistant', 'restoration_technician',
    'general_labourer', 'removalist_offsider'
  )
  and rc.business_id is null
  and rc.effective_from = '2026-11-01'
  and rc.checked_on is not null
  and rc.award is null;

-- ---------------------------------------------------------------------------
-- 2. Job numbers, given in order and never changed, and the business's PO or
-- reference number for the job.
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column number integer,
  add column po_number text check (char_length(po_number) <= 50);

-- Existing jobs are numbered in the order they were made, without touching
-- their last-changed times or the audit log.
alter table public.jobs disable trigger user;
update public.jobs j
set number = n.number
from (
  select id, 1000 + row_number() over (order by created_at, id) as number
  from public.jobs
) n
where n.id = j.id;
alter table public.jobs enable trigger user;

-- New jobs take the next number, and nobody can set or change one.
alter table public.jobs alter column number set not null;
alter table public.jobs alter column number add generated always as identity (start with 1001);
alter table public.jobs add constraint jobs_number_key unique (number);
do $$
begin
  execute format(
    'alter table public.jobs alter column number restart with %s',
    (select coalesce(max(number), 1000) + 1 from public.jobs)
  );
end;
$$;

-- Owners and managers add or change a job's PO or reference number at any
-- time, even after posting: the next pay run's invoice lines take it.
create function public.set_job_po_number(p_job_id uuid, p_po_number text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_po text := nullif(btrim(coalesce(p_po_number, '')), '');
begin
  select j.business_id into v_business
  from public.jobs j
  where j.id = p_job_id and j.archived_at is null;
  if v_business is null
    or not (public.is_business_manager(v_business) or public.is_admin()) then
    raise exception 'Job not found' using errcode = 'no_data_found';
  end if;
  if char_length(v_po) > 50 then
    raise exception 'Keep the PO or reference number to 50 characters'
      using errcode = 'check_violation';
  end if;
  update public.jobs set po_number = v_po where id = p_job_id;
end;
$$;

grant execute on function public.set_job_po_number(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Each invoice line keeps its job and PO numbers, the award and level of
-- the booking's rate card, and a part for each rate, adding up to its charge:
-- [{ "label", "minutes", "rate_cents", "amount_cents" }], with no minutes or
-- rate for an allowance or a call-out loading. Lines saved before have none.
-- ---------------------------------------------------------------------------
alter table public.pay_run_lines
  add column job_number integer,
  add column po_number text,
  add column award text,
  add column parts jsonb check (parts is null or jsonb_typeof(parts) = 'array');

create or replace function public.save_pay_run(
  p_period_start date,
  p_run_by uuid,
  p_invoices jsonb,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run uuid;
  v_until timestamptz := (p_period_start + 7)::timestamp at time zone 'Australia/Sydney';
  v_prefix text := coalesce(
    (select s.value #>> '{}' from public.settings s where s.key = 'invoice_prefix'), 'INV-'
  );
begin
  -- One run at a time.
  perform pg_advisory_xact_lock(hashtext('public.save_pay_run'));
  if extract(isodow from p_period_start) <> 1 then
    raise exception 'A run starts on a Monday' using errcode = 'check_violation';
  end if;
  if v_until > now() then
    raise exception 'That week isn''t over yet' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.pay_runs r where r.period_start >= p_period_start) then
    raise exception 'That week has already been run' using errcode = 'unique_violation';
  end if;
  if jsonb_array_length(coalesce(p_lines, '[]')) = 0 then
    raise exception 'There''s nothing to pay or invoice' using errcode = 'check_violation';
  end if;
  if (
    select count(distinct l.business_id) from jsonb_to_recordset(p_lines) as l (business_id uuid)
  ) <> jsonb_array_length(coalesce(p_invoices, '[]')) then
    raise exception 'Each business with lines needs one invoice' using errcode = 'check_violation';
  end if;
  -- A line's parts add up to its charge. (A site version from before parts
  -- sends none.)
  if exists (
    select 1
    from jsonb_to_recordset(p_lines) as l (bill_cents integer, parts jsonb)
    where l.parts is not null
      and (
        jsonb_typeof(l.parts) <> 'array'
        or l.bill_cents is distinct from (
          select coalesce(sum((p ->> 'amount_cents')::integer), 0)
          from jsonb_array_elements(
            case when jsonb_typeof(l.parts) = 'array' then l.parts else '[]' end
          ) p
        )
      )
  ) then
    raise exception 'A line''s rates don''t add up to its charge' using errcode = 'check_violation';
  end if;
  -- Hold the hours still while they're checked and saved; approving or
  -- changing them waits, then finds them paid.
  perform 1 from public.timesheets t
  where t.id in (
    select (x ->> 'timesheet_id')::uuid from jsonb_array_elements(p_lines) x
    where x ->> 'timesheet_id' is not null
  )
  for update;
  -- Every line is owed (and not yet paid), belongs to its booking's worker
  -- and business, and hours are paid as approved and costed.
  if exists (
    select 1
    from jsonb_to_recordset(p_lines) as l (
      kind public.pay_line_kind, assignment_id uuid, timesheet_id uuid, worker_id uuid,
      business_id uuid, pay_cents integer, bill_cents integer
    )
    left join public.pay_run_candidates(v_until) c
      on c.kind = l.kind and c.assignment_id = l.assignment_id
      and c.timesheet_id is not distinct from l.timesheet_id
    left join public.assignments x on x.id = l.assignment_id
    left join public.shifts s on s.id = x.shift_id
    left join public.jobs j on j.id = s.job_id
    left join public.timesheets t on t.id = l.timesheet_id
    left join public.timesheet_costs k on k.timesheet_id = l.timesheet_id
    where c.assignment_id is null
      or x.worker_id is distinct from l.worker_id
      or j.business_id is distinct from l.business_id
      or (l.kind = 'hours' and (
        k.timesheet_id is null
        or (k.start_at, k.finish_at, k.break_minutes)
          is distinct from (t.start_at, t.finish_at, t.break_minutes)
        or k.pay_cents is distinct from l.pay_cents
        or k.bill_cents is distinct from l.bill_cents
      ))
  ) then
    raise exception 'Some hours changed while the run was being worked out. Try again'
      using errcode = 'check_violation';
  end if;

  insert into public.pay_runs (period_start, period_end, run_by, line_count, pay_cents, bill_cents, gst_cents)
  values (
    p_period_start, p_period_start + 6, p_run_by, jsonb_array_length(p_lines),
    (select coalesce(sum((x ->> 'pay_cents')::integer), 0) from jsonb_array_elements(p_lines) x),
    (select coalesce(sum((x ->> 'subtotal_cents')::integer), 0) from jsonb_array_elements(p_invoices) x),
    (select coalesce(sum((x ->> 'gst_cents')::integer), 0) from jsonb_array_elements(p_invoices) x)
  )
  returning id into v_run;

  insert into public.invoices (
    pay_run_id, business_id, number, issued_on, due_on, subtotal_cents, gst_cents, total_cents
  )
  select v_run, i.business_id, v_prefix || nextval('public.invoice_number_seq'), i.issued_on,
    i.due_on, i.subtotal_cents, i.gst_cents, i.total_cents
  from jsonb_to_recordset(p_invoices) as i (
    business_id uuid, issued_on date, due_on date, subtotal_cents integer, gst_cents integer,
    total_cents integer
  )
  order by i.business_id;

  -- The job and PO numbers and the award come from the job and the
  -- booking's rate card as they are now.
  insert into public.pay_run_lines (
    pay_run_id, invoice_id, kind, assignment_id, timesheet_id, worker_id, business_id, work_date,
    start_at, finish_at, break_minutes, hours, work_type, site_name, allowance_cents, pay_cents,
    bill_cents, description, detail, job_number, po_number, award, parts
  )
  select v_run, inv.id, l.kind, l.assignment_id, l.timesheet_id, l.worker_id, l.business_id,
    l.work_date, l.start_at, l.finish_at, l.break_minutes, l.hours, l.work_type, l.site_name,
    coalesce(l.allowance_cents, 0), l.pay_cents, l.bill_cents, l.description, l.detail,
    j.number, j.po_number, rc.award, l.parts
  from jsonb_to_recordset(p_lines) as l (
    kind public.pay_line_kind, assignment_id uuid, timesheet_id uuid, worker_id uuid,
    business_id uuid, work_date date, start_at timestamptz, finish_at timestamptz,
    break_minutes smallint, hours numeric, work_type text, site_name text,
    allowance_cents integer, pay_cents integer, bill_cents integer, description text, detail text,
    parts jsonb
  )
  join public.invoices inv on inv.pay_run_id = v_run and inv.business_id = l.business_id
  join public.assignments x on x.id = l.assignment_id
  join public.shifts s on s.id = x.shift_id
  join public.jobs j on j.id = s.job_id
  left join public.assignment_rates ar on ar.assignment_id = l.assignment_id
  left join public.rate_cards rc on rc.id = ar.rate_card_id;

  if (select count(*) from public.pay_run_lines pl where pl.pay_run_id = v_run)
    <> jsonb_array_length(p_lines) then
    raise exception 'Every line needs its business''s invoice' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.invoices inv
    where inv.pay_run_id = v_run
      and inv.subtotal_cents <> (
        select coalesce(sum(pl.bill_cents), 0) from public.pay_run_lines pl where pl.invoice_id = inv.id
      )
  ) then
    raise exception 'An invoice doesn''t add up to its lines' using errcode = 'check_violation';
  end if;
  return v_run;
end;
$$;

-- An invoice's lines for the business: what was done and the charge, by
-- rate, never the pay.
drop function public.invoice_lines(uuid);
create function public.invoice_lines(p_invoice_id uuid)
returns table (
  line_id uuid,
  kind public.pay_line_kind,
  work_date date,
  description text,
  detail text,
  hours numeric,
  bill_cents integer,
  job_number integer,
  po_number text,
  site_name text,
  award text,
  parts jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select pl.id, pl.kind, pl.work_date, pl.description, pl.detail, pl.hours, pl.bill_cents,
    pl.job_number, pl.po_number, pl.site_name, pl.award, pl.parts
  from public.pay_run_lines pl
  join public.invoices inv on inv.id = pl.invoice_id
  where inv.id = p_invoice_id
    and (public.is_business_manager(inv.business_id) or public.is_admin())
  order by pl.work_date, pl.description;
$$;

grant execute on function public.invoice_lines(uuid) to authenticated;
