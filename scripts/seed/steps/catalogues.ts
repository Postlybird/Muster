import { check, type SeedClient } from "../client";
import {
  CATEGORIES,
  CREDENTIAL_TYPES,
  HAZARDS,
  PPE_ITEMS,
} from "../data/catalogues";

/** Adds missing catalogue entries (by code). Admin edits are left alone. */
export async function seedCatalogues(client: SeedClient) {
  const credentialRows = CREDENTIAL_TYPES.map((c, i) => ({
    code: c.code,
    name: c.name,
    description: c.description ?? "",
    kind: c.kind,
    issuer: c.issuer ?? null,
    has_number: c.hasNumber,
    has_expiry: c.hasExpiry,
    needs_document: true,
    verification_method: c.verification ?? "manual",
    sort_order: (i + 1) * 10,
  }));
  const credentials = check(
    await client
      .from("credential_types")
      .upsert(credentialRows, { onConflict: "code", ignoreDuplicates: true })
      .select("id"),
    "credential types",
  );

  const hazards = check(
    await client
      .from("hazards")
      .upsert(
        HAZARDS.map((h, i) => ({
          code: h.code,
          name: h.name,
          sort_order: (i + 1) * 10,
        })),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("id"),
    "hazards",
  );

  const ppe = check(
    await client
      .from("ppe_items")
      .upsert(
        PPE_ITEMS.map((p, i) => ({
          code: p.code,
          name: p.name,
          sort_order: (i + 1) * 10,
        })),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("id"),
    "PPE",
  );

  const categories = check(
    await client
      .from("categories")
      .upsert(
        CATEGORIES.map((c, i) => ({
          code: c.code,
          name: c.name,
          description: c.description,
          police_check_required: c.policeCheckRequired,
          min_engagement_hours: c.minEngagementHours,
          sort_order: (i + 1) * 10,
        })),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("id"),
    "categories",
  );

  // Look up ids by code to link categories to their tickets and PPE.
  const ids = async (table: "credential_types" | "ppe_items" | "categories") =>
    new Map(
      (check(await client.from(table).select("id, code"), table) ?? []).map(
        (r) => [r.code, r.id],
      ),
    );
  const [credentialIds, ppeIds, categoryIds] = await Promise.all([
    ids("credential_types"),
    ids("ppe_items"),
    ids("categories"),
  ]);
  const idFor = (map: Map<string, string>, code: string) => {
    const id = map.get(code);
    if (!id) throw new Error(`Unknown catalogue code "${code}"`);
    return id;
  };

  const categoryCredentials = CATEGORIES.flatMap((c) =>
    c.requiredCredentials.map((code) => ({
      category_id: idFor(categoryIds, c.code),
      credential_type_id: idFor(credentialIds, code),
    })),
  );
  check(
    await client.from("category_credentials").upsert(categoryCredentials, {
      onConflict: "category_id,credential_type_id",
      ignoreDuplicates: true,
    }),
    "category tickets",
  );

  const categoryPpe = CATEGORIES.flatMap((c) =>
    c.defaultPpe.map((code) => ({
      category_id: idFor(categoryIds, c.code),
      ppe_item_id: idFor(ppeIds, code),
    })),
  );
  check(
    await client.from("category_ppe").upsert(categoryPpe, {
      onConflict: "category_id,ppe_item_id",
      ignoreDuplicates: true,
    }),
    "category PPE",
  );

  return {
    credentialTypes: credentials?.length ?? 0,
    hazards: hazards?.length ?? 0,
    ppe: ppe?.length ?? 0,
    categories: categories?.length ?? 0,
  };
}
