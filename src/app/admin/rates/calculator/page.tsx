import { fromZonedTime } from "date-fns-tz";
import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATE_TIME_ZONES, type StateCode } from "@/domain/pay";
import { dayTypeLabels } from "@/domain/rates";
import { requireAdmin } from "@/lib/auth";
import {
  formatCalendarDate,
  formatCents,
  formatHours,
  sydneyDateKey,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { businessOptions } from "@/server/businesses";
import { loadPricing, type ShiftQuote } from "@/server/pricing";

export const metadata: Metadata = { title: "Rate calculator" };

const STATES = Object.keys(STATE_TIME_ZONES) as StateCode[];

type CalculatorForm = {
  business: string;
  category: string;
  level: string;
  state: StateCode;
  date: string;
  start: string;
  end: string;
  breakMinutes: string;
  urgent: boolean;
};

/** Prices the shift described by the form, for one worker. */
async function priceShift(form: CalculatorForm): Promise<ShiftQuote> {
  const level = Number(form.level);
  const breakMinutes = Number(form.breakMinutes || "0");
  if (!Number.isInteger(level) || level < 1 || level > 10) {
    return { ok: false, problem: "Choose a level from 1 to 10." };
  }
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    return { ok: false, problem: "Enter the break in whole minutes." };
  }
  const timeZone = STATE_TIME_ZONES[form.state];
  const start = fromZonedTime(`${form.date}T${form.start}:00`, timeZone);
  let end = fromZonedTime(`${form.date}T${form.end}:00`, timeZone);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, problem: "Check the date and times." };
  }
  // A finish at or before the start is the next morning.
  if (end <= start) end = new Date(end.getTime() + 86_400_000);
  const pricing = await loadPricing({
    businessId: form.business || null,
    categoryId: form.category,
    level,
    state: form.state,
  });
  return pricing.quote({ start, end, breakMinutes, urgent: form.urgent });
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default async function RateCalculatorPage({
  searchParams,
}: PageProps<"/admin/rates/calculator">) {
  await requireAdmin();
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : "";
  };

  const supabase = await createClient();
  const [{ data: categories }, businesses] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
    businessOptions(),
  ]);

  const state = value("state");
  const form: CalculatorForm = {
    business: value("business"),
    category: value("category") || categories?.[0]?.id || "",
    level: value("level") || "1",
    state: STATES.includes(state as StateCode) ? (state as StateCode) : "NSW",
    date: value("date") || sydneyDateKey(new Date()),
    start: value("start") || "07:00",
    end: value("end") || "15:30",
    breakMinutes: value("break") || "30",
    urgent: value("urgent") === "on",
  };
  const result = value("category") ? await priceShift(form) : null;
  const businessName = businesses.find((b) => b.id === form.business)?.name;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-muted-foreground">
        Try a shift to see how it&apos;s paid and billed with today&apos;s rate
        cards, bill rules, public holidays and settings. Nothing is saved.
      </p>

      <form
        action="/admin/rates/calculator"
        className="grid max-w-3xl gap-4 sm:grid-cols-2"
      >
        <Field id="business" label="Business">
          <NativeSelect
            id="business"
            name="business"
            defaultValue={form.business}
          >
            <option value="">Any business (standard rates)</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="category" label="Work category">
          <NativeSelect
            id="category"
            name="category"
            defaultValue={form.category}
          >
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="level" label="Level">
          <Input
            id="level"
            name="level"
            type="number"
            min="1"
            max="10"
            defaultValue={form.level}
            className="w-28"
          />
        </Field>
        <Field id="state" label="State">
          <NativeSelect id="state" name="state" defaultValue={form.state}>
            {STATES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="date" label="Date">
          <Input id="date" name="date" type="date" defaultValue={form.date} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="start" label="Start">
            <Input
              id="start"
              name="start"
              type="time"
              defaultValue={form.start}
            />
          </Field>
          <Field id="end" label="Finish">
            <Input id="end" name="end" type="time" defaultValue={form.end} />
          </Field>
        </div>
        <Field id="break" label="Unpaid break (minutes)">
          <Input
            id="break"
            name="break"
            inputMode="numeric"
            defaultValue={form.breakMinutes}
            className="w-28"
          />
        </Field>
        <div className="flex min-h-11 items-center gap-3 sm:self-end">
          <Checkbox id="urgent" name="urgent" defaultChecked={form.urgent} />
          <Label htmlFor="urgent">Urgent call-out</Label>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Work it out</Button>
        </div>
      </form>

      {result && !result.ok ? (
        <Alert variant="destructive" className="max-w-3xl">
          <AlertDescription className="text-foreground">
            {result.problem}
          </AlertDescription>
        </Alert>
      ) : null}

      {result?.ok ? (
        <section aria-labelledby="result" className="max-w-4xl space-y-4">
          <h2 id="result" className="text-lg font-semibold">
            One worker on {formatCalendarDate(result.date)}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Pay:{" "}
              {result.card.businessOwn
                ? `${businessName}'s own rate card`
                : "the standard rate card"}{" "}
              from {formatCalendarDate(result.card.effectiveFrom)}.
            </li>
            <li>
              Bill:{" "}
              {result.billRule
                ? result.billRule.businessOwn
                  ? `${businessName}'s bill rule`
                  : "the work category's bill rule"
                : "the default margin"}
              .
            </li>
          </ul>
          <Table label="Pay and bill by rate">
            <TableHeader>
              <TableRow>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Pay rate</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead className="text-right">Bill rate</TableHead>
                <TableHead className="text-right">Bill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.cost.lines.map((line) => (
                <TableRow key={`${line.type}-${line.kind}`}>
                  <TableCell>
                    {dayTypeLabels[line.type]}
                    {line.kind === "minimum" ? " (minimum engagement)" : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatHours(line.minutes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(line.payRateCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(line.payCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(line.billRateCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(line.billCents)}
                  </TableCell>
                </TableRow>
              ))}
              {result.cost.urgentPayCents || result.cost.urgentBillCents ? (
                <TableRow>
                  <TableCell>Urgent call-out loading</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right">
                    {formatCents(result.cost.urgentPayCents)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">
                    {formatCents(result.cost.urgentBillCents)}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatHours(result.cost.paidMinutes)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  {formatCents(result.cost.payCents)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  {formatCents(result.cost.billCents)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
            <dt>Pay</dt>
            <dd className="text-right">{formatCents(result.cost.payCents)}</dd>
            <dt>On-costs</dt>
            <dd className="text-right">
              {formatCents(result.cost.onCostCents)}
            </dd>
            <dt>Bill, excluding GST</dt>
            <dd className="text-right">{formatCents(result.cost.billCents)}</dd>
            <dt>GST</dt>
            <dd className="text-right">{formatCents(result.cost.gstCents)}</dd>
            <dt className="font-medium">Bill, including GST</dt>
            <dd className="text-right font-medium">
              {formatCents(result.cost.totalCents)}
            </dd>
            <dt className="font-medium">Our margin</dt>
            <dd className="text-right font-medium">
              {formatCents(result.cost.marginCents)}
              {result.cost.billCents > 0
                ? ` (${((result.cost.marginCents / result.cost.billCents) * 100).toFixed(1)}%)`
                : ""}
            </dd>
          </dl>
          <p className="text-sm text-muted-foreground">
            An estimate: payroll does the final award interpretation, and weekly
            overtime isn&apos;t included.
          </p>
        </section>
      ) : null}
    </div>
  );
}
