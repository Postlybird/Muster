-- The weekly pay and billing run (brief §4.8). Each week (Monday to Sunday,
-- Sydney dates) is run once, on the run day or by an admin: approved hours
-- not yet paid, from that week or before, become payroll lines and one
-- invoice per business with a line per worker per shift; late cancellation
-- charges are added. The server works the amounts out
-- (src/domain/pay-runs.ts) and saves the run in one go with save_pay_run().
-- Once run, the hours can't change. Invoices are on account terms and
-- marked paid by hand in v1.

create table public.pay_runs (
  id uuid primary key default gen_random_uuid(),
  -- A Monday, and the Sunday after.
  period_start date not null unique,
  period_end date not null,
  -- Empty when the scheduled run made it.
  run_by uuid references public.profiles (id),
  line_count integer not null,
  pay_cents integer not null,
  -- Excluding GST.
  bill_cents integer not null,
  gst_cents integer not null,
  created_at timestamptz not null default now(),
  check (extract(isodow from period_start) = 1 and period_end = period_start + 6)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  pay_run_id uuid not null references public.pay_runs (id),
  business_id uuid not null references public.businesses (id),
  number text not null unique,
  issued_on date not null,
  due_on date not null,
  -- Excluding GST.
  subtotal_cents integer not null,
  gst_cents integer not null,
  total_cents integer not null,
  status text not null default 'issued' check (status in ('issued', 'paid')),
  -- In the private invoices bucket: <business id>/<number>.pdf
  pdf_path text,
  emailed_to text,
  emailed_at timestamptz,
  paid_on date,
  payment_reference text check (char_length(payment_reference) <= 200),
  marked_paid_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pay_run_id, business_id),
  check (total_cents = subtotal_cents + gst_cents)
);

create type public.pay_line_kind as enum ('hours', 'cancellation');

-- One line per booking: its hours, or a late cancellation. Payroll reads
-- the raw times, work type, site and allowances (plan question 6); the
-- invoice reads the description and charge. Admin only: businesses see
-- their lines' description and charge through invoice_lines().
create table public.pay_run_lines (
  id uuid primary key default gen_random_uuid(),
  pay_run_id uuid not null references public.pay_runs (id),
  invoice_id uuid not null references public.invoices (id),
  kind public.pay_line_kind not null,
  assignment_id uuid not null unique references public.assignments (id),
  timesheet_id uuid unique references public.timesheets (id),
  worker_id uuid not null references public.workers (id),
  business_id uuid not null references public.businesses (id),
  -- The shift's Sydney date.
  work_date date not null,
  start_at timestamptz,
  finish_at timestamptz,
  break_minutes smallint,
  -- Paid hours, minimum engagement included.
  hours numeric(6, 2) not null,
  work_type text not null,
  site_name text not null,
  -- Urgent call-out loading (plan question 7), part of pay.
  allowance_cents integer not null default 0,
  pay_cents integer not null,
  -- Excluding GST.
  bill_cents integer not null,
  description text not null,
  detail text,
  created_at timestamptz not null default now(),
  check ((kind = 'hours') = (timesheet_id is not null))
);

create index pay_run_lines_run_idx on public.pay_run_lines (pay_run_id);
create index pay_run_lines_invoice_idx on public.pay_run_lines (invoice_id);

create sequence public.invoice_number_seq start 1001;

create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger invoices_audit after insert or update on public.invoices
  for each row execute function public.audit_row_change();
create trigger pay_runs_audit after insert on public.pay_runs
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- What a run up to a moment can pay: approved hours not yet paid, and late
-- business cancellations owing a charge or pay (a worker who had arrived is
-- paid the minimum engagement), from shifts that started before then.
-- Service role only.
-- ---------------------------------------------------------------------------
create function public.pay_run_candidates(p_until timestamptz)
returns table (kind public.pay_line_kind, assignment_id uuid, timesheet_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select 'hours'::public.pay_line_kind, t.assignment_id, t.id
  from public.timesheets t
  join public.assignments x on x.id = t.assignment_id
  join public.shifts s on s.id = x.shift_id
  where t.status in ('approved', 'auto_approved', 'adjusted')
    and x.status in ('confirmed', 'completed')
    and s.starts_at < p_until
    and not exists (select 1 from public.pay_run_lines pl where pl.assignment_id = x.id)
  union all
  select 'cancellation'::public.pay_line_kind, x.id, null::uuid
  from public.assignments x
  join public.shifts s on s.id = x.shift_id
  where x.status = 'cancelled_by_business'
    and s.starts_at < p_until
    and (
      coalesce(x.cancellation_charge_hours, 0) > 0
      or coalesce(x.cancellation_pay_hours, 0) > 0
      or exists (
        select 1 from public.attendance_events e
        where e.assignment_id = x.id and e.kind in ('clock_in', 'arrival_confirmed')
      )
    )
    and not exists (select 1 from public.timesheets t where t.assignment_id = x.id)
    and not exists (select 1 from public.pay_run_lines pl where pl.assignment_id = x.id);
$$;

-- ---------------------------------------------------------------------------
-- Saving a run: the server works out the lines and invoices; this saves
-- them in one go, numbers the invoices, and checks nothing moved in the
-- meantime. Weeks are run once each, in order. Service role only (the
-- server passes the admin who ran it, or nobody for the scheduled run).
-- ---------------------------------------------------------------------------
create function public.save_pay_run(
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

  insert into public.pay_run_lines (
    pay_run_id, invoice_id, kind, assignment_id, timesheet_id, worker_id, business_id, work_date,
    start_at, finish_at, break_minutes, hours, work_type, site_name, allowance_cents, pay_cents,
    bill_cents, description, detail
  )
  select v_run, inv.id, l.kind, l.assignment_id, l.timesheet_id, l.worker_id, l.business_id,
    l.work_date, l.start_at, l.finish_at, l.break_minutes, l.hours, l.work_type, l.site_name,
    coalesce(l.allowance_cents, 0), l.pay_cents, l.bill_cents, l.description, l.detail
  from jsonb_to_recordset(p_lines) as l (
    kind public.pay_line_kind, assignment_id uuid, timesheet_id uuid, worker_id uuid,
    business_id uuid, work_date date, start_at timestamptz, finish_at timestamptz,
    break_minutes smallint, hours numeric, work_type text, site_name text,
    allowance_cents integer, pay_cents integer, bill_cents integer, description text, detail text
  )
  join public.invoices inv on inv.pay_run_id = v_run and inv.business_id = l.business_id;

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

-- Paid hours can't change.
create function public.timesheets_paid_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.pay_run_lines pl where pl.timesheet_id = old.id) then
    raise exception 'These hours have been paid. Contact us if something''s wrong'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger timesheets_paid_lock before update on public.timesheets
  for each row execute function public.timesheets_paid_lock();

-- Invoices are paid by bank transfer (account terms) and marked paid by
-- admins.
create function public.mark_invoice_paid(p_id uuid, p_paid_on date, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only our team marks invoices paid' using errcode = '42501';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Australia/Sydney')::date then
    raise exception 'Choose the day it was paid' using errcode = 'check_violation';
  end if;
  update public.invoices
  set status = 'paid', paid_on = p_paid_on,
    payment_reference = nullif(btrim(coalesce(p_reference, '')), ''),
    marked_paid_by = (select auth.uid())
  where id = p_id and status = 'issued';
  if not found then
    raise exception 'That invoice is already paid' using errcode = 'check_violation';
  end if;
end;
$$;

-- For a payment marked against the wrong invoice.
create function public.mark_invoice_unpaid(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only our team marks invoices paid' using errcode = '42501';
  end if;
  update public.invoices
  set status = 'issued', paid_on = null, payment_reference = null, marked_paid_by = null
  where id = p_id and status = 'paid';
  if not found then
    raise exception 'That invoice isn''t marked paid' using errcode = 'check_violation';
  end if;
end;
$$;

-- An invoice's lines for the business: what was done and the charge,
-- never the pay.
create function public.invoice_lines(p_invoice_id uuid)
returns table (
  line_id uuid,
  kind public.pay_line_kind,
  work_date date,
  description text,
  detail text,
  hours numeric,
  bill_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select pl.id, pl.kind, pl.work_date, pl.description, pl.detail, pl.hours, pl.bill_cents
  from public.pay_run_lines pl
  join public.invoices inv on inv.id = pl.invoice_id
  where inv.id = p_invoice_id
    and (public.is_business_manager(inv.business_id) or public.is_admin())
  order by pl.work_date, pl.description;
$$;

-- Invoice PDFs: the business's owners and managers, and admins.
create function public.can_read_invoice_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or (
      p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.is_business_manager(p_folder::uuid)
    );
$$;

-- ---------------------------------------------------------------------------
-- Grants, row level security and storage
-- ---------------------------------------------------------------------------
grant execute on function public.save_pay_run(date, uuid, jsonb, jsonb),
  public.pay_run_candidates(timestamptz) to service_role;
grant execute on function public.mark_invoice_paid(uuid, date, text),
  public.mark_invoice_unpaid(uuid), public.invoice_lines(uuid),
  public.can_read_invoice_folder(text) to authenticated;
grant usage on sequence public.invoice_number_seq to service_role;

alter table public.pay_runs enable row level security;
alter table public.invoices enable row level security;
alter table public.pay_run_lines enable row level security;
grant all on public.pay_runs, public.invoices, public.pay_run_lines to service_role;
grant select on public.pay_runs, public.invoices, public.pay_run_lines to authenticated;

create policy "pay_runs: admins" on public.pay_runs
  for select to authenticated using ((select public.is_admin()));
create policy "pay_run_lines: admins" on public.pay_run_lines
  for select to authenticated using ((select public.is_admin()));
create policy "invoices: owners and managers" on public.invoices
  for select to authenticated using ((select public.is_business_manager(business_id)));
create policy "invoices: admins" on public.invoices
  for select to authenticated using ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "invoices: owners, managers and admins read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and (select public.can_read_invoice_folder((storage.foldername(name))[1]))
  );
