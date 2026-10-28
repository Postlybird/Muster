import { DEMO_ABNS } from "../../../src/adapters/abn/mock";
import { MockGeocoder } from "../../../src/adapters/geocode/mock";
import { check, must, type SeedClient } from "../client";
import { ADMINS, BUSINESSES } from "../data/people";

/** Documentation address range (RFC 5737): never a real person's IP. */
const DEMO_IP = "203.0.113.10";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/**
 * The demo businesses: ABN details from the mock register, their people,
 * sites (placed by the mock address lookup) and the services agreement.
 * Businesses that already exist are left alone.
 */
export async function seedBusinesses(client: SeedClient) {
  const geocoder = new MockGeocoder();
  const [existing, profiles, admin, agreement, paymentTerms] =
    await Promise.all([
      client.from("businesses").select("abn"),
      client
        .from("profiles")
        .select("id, email")
        .in(
          "email",
          BUSINESSES.flatMap((b) => b.people.map((p) => p.email)),
        ),
      client
        .from("profiles")
        .select("id")
        .eq("email", ADMINS[0]!.email)
        .single(),
      client
        .from("agreements")
        .select("id")
        .eq("kind", "labour_hire_services")
        .is("jurisdiction", null)
        .eq("is_current", true)
        .maybeSingle(),
      client
        .from("settings")
        .select("value")
        .eq("key", "invoice_payment_terms_days")
        .maybeSingle(),
    ]);
  const have = new Set(must(existing, "businesses").map((b) => b.abn));
  const profileByEmail = new Map(
    must(profiles, "business people").map((p) => [p.email, p.id]),
  );
  const adminId = must(admin, "admin").id;
  const termsDays =
    typeof paymentTerms.data?.value === "number" ? paymentTerms.data.value : 14;

  let added = 0;
  for (const [index, business] of BUSINESSES.entries()) {
    if (have.has(business.abn)) continue;
    const abr = DEMO_ABNS[business.abn];
    if (!abr) throw new Error(`No demo ABN details for ${business.abn}`);
    const owner = business.people.find((p) => p.role === "owner");
    const ownerId = owner ? profileByEmail.get(owner.email) : undefined;
    if (!owner || !ownerId)
      throw new Error(`No owner for ${business.tradingName}`);
    const approved = business.status === "approved";

    const created = must(
      await client
        .from("businesses")
        .insert({
          abn: abr.abn,
          legal_name: abr.entityName,
          entity_type_code: abr.entityTypeCode,
          entity_type: abr.entityTypeName,
          abn_status: abr.status,
          abn_status_from: abr.statusEffectiveFrom,
          gst_registered: !!abr.gstRegisteredFrom,
          gst_registered_from: abr.gstRegisteredFrom,
          acn: abr.acn,
          abr_state: abr.state,
          abr_postcode: abr.postcode,
          abr_checked_at: daysAgo(60 + index),
          trading_name: business.tradingName,
          billing_contact_name: owner.fullName,
          billing_contact_phone: business.phone,
          accounts_email: business.accountsEmail,
          onboarding_steps: ["abn", "details", "sites", "team", "agreement"],
          status: business.status,
          submitted_at: daysAgo(approved ? 58 + index : 2),
          approved_at: approved ? daysAgo(56 + index) : null,
          approved_by: approved ? adminId : null,
          account_terms_approved: approved,
          payment_terms_days: approved ? termsDays : null,
          created_by: ownerId,
        })
        .select("id")
        .single(),
      `business ${business.tradingName}`,
    );

    const members = must(
      await client
        .from("business_users")
        .insert(
          business.people.map((person) => ({
            business_id: created.id,
            profile_id: profileByEmail.get(person.email) ?? null,
            role: person.role,
            invited_by: person.role === "owner" ? null : ownerId,
            invited_at: daysAgo(57 + index),
            accepted_at: daysAgo(57 + index),
          })),
        )
        .select("id, profile_id"),
      "business people",
    );

    const siteIds = new Map<string, string>();
    for (const site of business.sites) {
      const [suggestion] = await geocoder.suggest(site.address);
      const place = suggestion ? await geocoder.resolve(suggestion.id) : null;
      if (!place?.line1) throw new Error(`Can't place ${site.address}`);
      const row = must(
        await client
          .from("sites")
          .insert({
            business_id: created.id,
            name: site.name,
            address_line1: place.line1,
            suburb: place.suburb,
            state: place.state,
            postcode: place.postcode,
            lat: place.lat,
            lng: place.lng,
            access_notes: site.accessNotes ?? null,
            parking_notes: site.parkingNotes ?? null,
            report_to_name: owner.fullName,
            report_to_phone: business.phone,
          })
          .select("id")
          .single(),
        `site ${site.name}`,
      );
      siteIds.set(site.name, row.id);
    }

    const assignments = business.people.flatMap((person) => {
      const member = members.find(
        (m) => m.profile_id === profileByEmail.get(person.email),
      );
      return (person.sites ?? []).map((name) => ({
        business_user_id: member!.id,
        site_id: siteIds.get(name)!,
      }));
    });
    if (assignments.length > 0) {
      check(
        await client.from("business_user_sites").insert(assignments),
        "supervisor sites",
      );
    }

    if (agreement.data) {
      check(
        await client.from("agreement_acceptances").insert({
          agreement_id: agreement.data.id,
          profile_id: ownerId,
          business_id: created.id,
          accepted_at: daysAgo(58 + index),
          ip: DEMO_IP,
          user_agent: "Demo data (seed script)",
        }),
        "services agreement",
      );
    }
    if (business.marginPct !== undefined) {
      check(
        await client.from("bill_rate_rules").insert({
          business_id: created.id,
          method: "markup",
          margin_pct: business.marginPct,
          effective_from: "2026-07-01",
          notes: "Volume discount (demo data)",
          created_by: adminId,
        }),
        "business margin",
      );
    }
    added++;
  }

  return { businesses: BUSINESSES.length, added };
}
