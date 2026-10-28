import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DAY_TYPES,
  dayTypeLabels,
  hourlyPayTable,
  rateCardFromRow,
} from "@/domain/rates";
import { requireRole } from "@/lib/auth";
import { formatCalendarDate, formatCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pay rate cards" };

export default async function RateCardsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("rate_cards")
    .select("*, categories(name)")
    .is("archived_at", null)
    .order("effective_from", { ascending: false });

  const sorted = (cards ?? []).sort(
    (a, b) =>
      (a.categories?.name ?? "").localeCompare(b.categories?.name ?? "") ||
      a.level - b.level ||
      b.effective_from.localeCompare(a.effective_from),
  );
  const unchecked = sorted.filter((card) => !card.checked_by).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted-foreground">
          Hourly pay by work category and level. The base rate excludes casual
          loading; each multiplier includes it. For a shift, the card with the
          latest start date on or before the shift date applies.
        </p>
        <Button asChild>
          <Link href="/admin/rates/rate-cards/new">
            <Plus aria-hidden />
            Add rate card
          </Link>
        </Button>
      </div>

      {unchecked > 0 ? (
        <Alert variant="warning">
          <AlertDescription className="text-foreground">
            {unchecked} rate {unchecked === 1 ? "card hasn't" : "cards haven't"}{" "}
            been checked by a payroll professional yet.
          </AlertDescription>
        </Alert>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="text-right">Base</TableHead>
            {DAY_TYPES.map((day) => (
              <TableHead key={day} className="text-right">
                {dayTypeLabels[day]}
              </TableHead>
            ))}
            <TableHead>From</TableHead>
            <TableHead>Checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((card) => {
            const rates = hourlyPayTable(rateCardFromRow(card));
            return (
              <TableRow key={card.id}>
                <TableCell>
                  <Link
                    href={`/admin/rates/rate-cards/${card.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {card.categories?.name}
                  </Link>
                  {card.business_id ? (
                    <Badge variant="info" className="ml-2">
                      Business rate
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{card.level}</TableCell>
                <TableCell className="text-right">
                  {formatCents(card.base_rate_cents)}
                </TableCell>
                {DAY_TYPES.map((day) => (
                  <TableCell key={day} className="text-right">
                    {formatCents(rates[day])}
                  </TableCell>
                ))}
                <TableCell>{formatCalendarDate(card.effective_from)}</TableCell>
                <TableCell>
                  {card.checked_by ? (
                    <span className="text-sm">{card.checked_by}</span>
                  ) : (
                    <Badge variant="warning">Not checked</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
