/** A work type's industry, as read through `industries(name, sort_order)`. */
export type IndustryRef = { name: string; sort_order: number } | null;

export type IndustryGroup<T> = { name: string; items: T[] };

/** Work types with no industry (or one we can't see) are listed last. */
export const OTHER_WORK = "Other work";

/**
 * Groups work types by industry, in the industries' order, keeping the
 * order the work types came in within each group.
 */
export function groupByIndustry<T extends { industries: IndustryRef }>(
  items: T[],
): IndustryGroup<T>[] {
  const groups = new Map<string, IndustryGroup<T> & { order: number }>();
  for (const item of items) {
    const name = item.industries?.name ?? OTHER_WORK;
    const order = item.industries?.sort_order ?? Number.POSITIVE_INFINITY;
    const group = groups.get(name) ?? { name, items: [], order };
    group.items.push(item);
    groups.set(name, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(({ name, items: grouped }) => ({ name, items: grouped }));
}

/** A work type as read with its required tickets. */
export type WorkTypeNeedsRow = {
  police_check_required: boolean;
  category_credentials: {
    credential_types: {
      name: string;
      /** Shared by each state's version of a ticket issued state by state. */
      family?: string | null;
      sort_order: number;
      active: boolean;
    } | null;
  }[];
};

/**
 * What a work type needs, in the tickets' order: its active required
 * tickets (by family for one issued state by state, since each state asks
 * for its own), and a police check where one is required.
 */
export function workTypeNeeds(category: WorkTypeNeedsRow): string[] {
  const needs = category.category_credentials
    .map((link) => link.credential_types)
    .filter((type): type is NonNullable<typeof type> => !!type?.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((type) => type.family ?? type.name)
    .filter((need, i, all) => all.indexOf(need) === i);
  if (category.police_check_required && !needs.some((n) => /police/i.test(n))) {
    needs.push("National Police Check");
  }
  return needs;
}

/** "warehousing_logistics" → "warehousing-logistics", for page addresses. */
export function industrySlug(code: string): string {
  return code.replaceAll("_", "-");
}

/** The reverse of industrySlug(). */
export function industryCode(slug: string): string {
  return slug.replaceAll("-", "_");
}
