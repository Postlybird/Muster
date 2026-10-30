import { check, type SeedClient } from "../client";
import { AGREEMENT_VERSION, AGREEMENTS } from "../data/agreements";
import { JURISDICTIONS } from "../data/compliance";
import {
  DEFAULT_BASE_RATES_CENTS,
  NSW_PUBLIC_HOLIDAYS,
  RATE_CARDS_EFFECTIVE_FROM,
} from "../data/rates";

/** Jurisdictions, public holidays, draft agreements and default rate cards. */
export async function seedCompliance(client: SeedClient) {
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
    (a) => !have.has(`${a.kind}|${a.jurisdiction ?? ""}|${AGREEMENT_VERSION}`),
  );
  for (const agreement of missingAgreements) {
    const current = check(
      await client
        .from("agreements")
        .select("id")
        .eq("kind", agreement.kind)
        .eq("is_current", true)
        .maybeSingle(),
      "current agreement",
    );
    check(
      await client.from("agreements").insert({
        kind: agreement.kind,
        jurisdiction: agreement.jurisdiction ?? null,
        version: AGREEMENT_VERSION,
        title: agreement.title,
        body_md: agreement.body,
        published_at: new Date().toISOString(),
        // Don't displace a version an admin has already published.
        is_current: !current,
      }),
      `agreement ${agreement.kind}`,
    );
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
    .filter((c) => !withCard.has(c.id) && DEFAULT_BASE_RATES_CENTS[c.code])
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

  return {
    jurisdictions: jurisdictions?.length ?? 0,
    publicHolidays: holidays?.length ?? 0,
    agreements: missingAgreements.length,
    rateCards: newCards.length,
  };
}
