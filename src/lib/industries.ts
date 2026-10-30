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

/** "warehousing_logistics" → "warehousing-logistics", for page addresses. */
export function industrySlug(code: string): string {
  return code.replaceAll("_", "-");
}

/** The reverse of industrySlug(). */
export function industryCode(slug: string): string {
  return slug.replaceAll("-", "_");
}
