import { SITE_TAGS, WORKER_TAGS } from "@/domain/ratings";

/** "You gave 5 stars: Punctual, Would rehire." */
export function ratingGiven(
  rating: { score: number; tags: string[] },
  about: "worker" | "site",
): string {
  const labels: Readonly<Record<string, string>> =
    about === "worker" ? WORKER_TAGS : SITE_TAGS;
  const tags = rating.tags.map((tag) => labels[tag]).filter(Boolean);
  const stars = `${rating.score} ${rating.score === 1 ? "star" : "stars"}`;
  return tags.length > 0
    ? `You gave ${stars}: ${tags.join(", ")}.`
    : `You gave ${stars}.`;
}
