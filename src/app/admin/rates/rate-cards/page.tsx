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
  awardRulesSummary,
  CORE_DAY_TYPES,
  dayTypeLabels,
  hourlyPayTable,
  rateCardFromRow,
} from "@/domain/rates";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/server/businesses";

export const metadata: Metadata = { title: "Pay rate cards" };

export default async function RateCardsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("rate_cards")
    .select("*, categories(name), businesses(legal_name, trading_name)")
    .is("archived_at", null)
    .order("effective_from", { ascending: false });

  // Standard cards first, then each business's own.
  const sorted = (cards ?? []).sort(
    (a, b) =>
      Number(!!a.businesses) - Number(!!b.businesses) ||
      (a.businesses ? businessName(a.businesses) : "").localeCompare(
        b.businesses ? businessName(b.businesses) : "",
      ) ||
      (a.categories?.name ?? "").localeCompare(b.categories?.name ?? "") ||
      a.level - b.level ||
      b.effective_from.localeCompare(a.effective_from),
  );
  // A card stops applying once a later one for the same business, work type
  // and level has started, or on its end date.
  const today = sydneyDateKey(new Date());
  const replacedFrom = (card: (typeof sorted)[number]) =>
    sorted
      .filter(
        (other) =>
          other.business_id === card.business_id &&
          other.category_id === card.category_id &&
          other.level === card.level &&
          other.effective_from > card.effective_from &&
          other.effective_from <= today,
      )
      .map((other) => other.effective_from)
      .sort()[0] ?? null;
  const inUse = (card: (typeof sorted)[number]) =>
    !replacedFrom(card) && !(card.effective_to && card.effective_to < today);
  const unchecked = sorted.filter(
    (card) => !card.checked_by && inUse(card),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted-foreground">
          Hourly pay by work category and level. The base rate excludes casual
          loading; each multiplier includes it. For a shift, the card with the
          latest start date on or before the shift date applies, and a
          business&apos;s own card wins over the standard one. A card&apos;s
          award rules (overtime, later Saturday hours, early, late and night
          shifts) are paid at the highest rate that applies.
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
            been checked against the award&apos;s pay guide yet.
          </AlertDescription>
        </Alert>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="text-right">Base</TableHead>
            {CORE_DAY_TYPES.map((day) => (
              <TableHead key={day} className="text-right">
                {dayTypeLabels[day]}
              </TableHead>
            ))}
            <TableHead>Award rules</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((card) => {
            const rateCard = rateCardFromRow(card);
            const rates = hourlyPayTable(rateCard);
            const rules = awardRulesSummary(rateCard, formatCents);
            const replaced = replacedFrom(card);
            const ended =
              !replaced && card.effective_to && card.effective_to < today
                ? card.effective_to
                : null;
            return (
              <TableRow key={card.id}>
                <TableCell>
                  <Link
                    href={`/admin/rates/rate-cards/${card.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {card.categories?.name}
                  </Link>
                  {card.businesses ? (
                    <Badge variant="info" className="ml-2">
                      {businessName(card.businesses)}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{card.level}</TableCell>
                <TableCell className="text-right">
                  {formatCents(card.base_rate_cents)}
                </TableCell>
                {CORE_DAY_TYPES.map((day) => (
                  <TableCell key={day} className="text-right">
                    {formatCents(rates[day])}
                  </TableCell>
                ))}
                <TableCell className="min-w-64 text-sm whitespace-normal">
                  {rules.length > 0 ? (
                    <ul className="space-y-1">
                      {rules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell>
                  {formatCalendarDate(card.effective_from)}
                  {replaced ? (
                    <Badge variant="neutral" className="mt-1 block w-fit">
                      Replaced {formatCalendarDate(replaced)}
                    </Badge>
                  ) : ended ? (
                    <Badge variant="neutral" className="mt-1 block w-fit">
                      Ended {formatCalendarDate(ended)}
                    </Badge>
                  ) : null}
                </TableCell>
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
