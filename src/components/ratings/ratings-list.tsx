import { SITE_TAGS, WORKER_TAGS } from "@/domain/ratings";
import { formatDate } from "@/lib/format";

export type RatingForAdmin = {
  id: string;
  score: number;
  tags: string[];
  private_note: string | null;
  created_at: string;
  /** Who gave it: a business and site, or a worker. */
  from: string;
};

/**
 * Ratings with their private comments, for admins only (brief §4.7:
 * written comments go privately to admin).
 */
export function RatingsList({
  ratings,
  about,
}: {
  ratings: RatingForAdmin[];
  about: "worker" | "site";
}) {
  if (ratings.length === 0) {
    return <p className="text-sm text-muted-foreground">No ratings yet.</p>;
  }
  const labels: Readonly<Record<string, string>> =
    about === "worker" ? WORKER_TAGS : SITE_TAGS;
  return (
    <ul className="divide-y text-sm">
      {ratings.map((rating) => (
        <li key={rating.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
          <p>
            <span className="font-medium">
              {rating.score} {rating.score === 1 ? "star" : "stars"}
            </span>{" "}
            from {rating.from}, {formatDate(rating.created_at)}
          </p>
          {rating.tags.length > 0 ? (
            <p className="text-muted-foreground">
              {rating.tags.map((tag) => labels[tag] ?? tag).join(", ")}
            </p>
          ) : null}
          {rating.private_note ? (
            <p className="[overflow-wrap:anywhere]">
              &ldquo;{rating.private_note}&rdquo;
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
