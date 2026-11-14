import { allowancesToRow } from "../../../src/domain/rates";
import { check, must, type SeedClient } from "../client";
import { AGREEMENT_VERSION, AGREEMENTS } from "../data/agreements";
import { JURISDICTIONS } from "../data/compliance";
import {
  AWARD_RATE_CARDS,
  AWARD_RATE_CARDS_CHECKED,
  AWARD_RATE_CARDS_EFFECTIVE_FROM,
  DEFAULT_BASE_RATES_CENTS,
  NSW_PUBLIC_HOLIDAYS,
  RATE_CARDS_EFFECTIVE_FROM,
} from "../data/rates";

/**
 * Jurisdictions, public holidays, draft agreements, default rate cards and
 * the launch work types' award rate cards.
 */
export async function seedCompliance(
  client: SeedClient,
  {
    placeholderRates = true,
  }: {
    /**
     * The demo's placeholder rate cards, for shifts dated before the
     * checked ones. The live site has only checked rates.
     */
    placeholderRates?: boolean;
  } = {},
) {
  const jurisdictions = check(
    await client
      .from("jurisdictions")
      .upsert(
        JURISDICTIONS.map((j) => ({
          code: j.code,
          name: j.name,
          licence_required: j.licenceRequired,
          licensing_body: j.licensingBody ?? null,
          worker_notice_required: j.workerNoticeRequired ?? false,
          show_licence_on_invoice: j.licenceRequired,
          // We start in NSW; admins open other states (Admin → Licences).
          open_for_work: j.code === "NSW",
          notes: j.notes ?? "",
        })),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("code"),
    "jurisdictions",
  );

  const holidays = check(
    await client
      .from("public_holidays")
      .upsert(
        NSW_PUBLIC_HOLIDAYS.map((h) => ({
          state: "NSW",
          date: h.date,
          name: h.name,
        })),
        { onConflict: "state,date", ignoreDuplicates: true },
      )
      .select("id"),
    "public holidays",
  );

  // Agreements: insert the draft versions once, published and current.
  const existing = check(
    await client.from("agreements").select("kind, jurisdiction, version"),
    "agreements",
  );
  const have = new Set(
    (existing ?? []).map(
      (a) => `${a.kind}|${a.jurisdiction ?? ""}|${a.version}`,
    ),
  );
  const missingAgreements = AGREEMENTS.filter(
    (a) =>
      !have.has(
        `${a.kind}|${a.jurisdiction ?? ""}|${a.version ?? AGREEMENT_VERSION}`,
      ),
  );
  const isDraft = (version: string) => version.endsWith("-draft");
  for (const agreement of missingAgreements) {
    const version = agreement.version ?? AGREEMENT_VERSION;
    const current = check(
      await client
        .from("agreements")
        .select("id, version")
        .eq("kind", agreement.kind)
        .eq("is_current", true)
        .maybeSingle(),
      "current agreement",
    );
    const inserted = must(
      await client
        .from("agreements")
        .insert({
          kind: agreement.kind,
          jurisdiction: agreement.jurisdiction ?? null,
          version,
          title: agreement.title,
          body_md: agreement.body,
          published_at: new Date().toISOString(),
          // Don't displace a version an admin has already published.
          is_current: !current,
        })
        .select("id")
        .single(),
      `agreement ${agreement.kind}`,
    );
    // A version the owner approved (no "-draft") takes over from a current
    // draft, the way an admin makes a version current.
    if (current && isDraft(current.version) && !isDraft(version)) {
      check(
        await client.rpc("set_current_agreement", {
          p_agreement_id: inserted.id,
        }),
        `current ${agreement.kind}`,
      );
    }
  }

  // Default rate cards: one per category at level 1, if none exists yet.
  const categories =
    check(await client.from("categories").select("id, code"), "categories") ??
    [];
  const cards = check(
    await client
      .from("rate_cards")
      .select("category_id")
      .is("business_id", null),
    "rate cards",
  );
  const withCard = new Set((cards ?? []).map((c) => c.category_id));
  const newCards = categories
    .filter(
      (c) =>
        placeholderRates &&
        !withCard.has(c.id) &&
        DEFAULT_BASE_RATES_CENTS[c.code],
    )
    .map((c) => ({
      category_id: c.id,
      level: 1,
      base_rate_cents: DEFAULT_BASE_RATES_CENTS[c.code],
      effective_from: RATE_CARDS_EFFECTIVE_FROM,
      notes:
        "PLACEHOLDER rates for the demo. To be set and checked by a payroll professional.",
    }));
  if (newCards.length > 0) {
    check(await client.from("rate_cards").insert(newCards), "rate cards");
  }

  // The launch work types' award rate cards (owner, 01/11/2026), once each.
  // A standard card already starting that day, even an archived one, is an
  // admin's to keep, so it's never replaced or added again.
  const starting = check(
    await client
      .from("rate_cards")
      .select("category_id, level")
      .is("business_id", null)
      .eq("effective_from", AWARD_RATE_CARDS_EFFECTIVE_FROM),
    "award rate cards",
  );
  const startingKeys = new Set(
    (starting ?? []).map((card) => `${card.category_id}|${card.level}`),
  );
  const categoryIds = new Map(categories.map((c) => [c.code, c.id]));
  const awardCards = AWARD_RATE_CARDS.flatMap((card) =>
    card.codes.flatMap((code) => {
      const categoryId = categoryIds.get(code);
      if (!categoryId || startingKeys.has(`${categoryId}|${card.level}`)) {
        return [];
      }
      return [
        {
          category_id: categoryId,
          level: card.level,
          base_rate_cents: card.baseRateCents,
          ...card.columns,
          allowances: allowancesToRow(card.allowances ?? []),
          award: card.award,
          effective_from: AWARD_RATE_CARDS_EFFECTIVE_FROM,
          checked_by: AWARD_RATE_CARDS_CHECKED.by,
          checked_on: AWARD_RATE_CARDS_CHECKED.on,
          notes: card.notes,
        },
      ];
    }),
  );
  if (awardCards.length > 0) {
    check(
      await client.from("rate_cards").insert(awardCards),
      "award rate cards",
    );
  }

  return {
    jurisdictions: jurisdictions?.length ?? 0,
    publicHolidays: holidays?.length ?? 0,
    agreements: missingAgreements.length,
    rateCards: newCards.length + awardCards.length,
  };
}
