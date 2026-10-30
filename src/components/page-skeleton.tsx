import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a signed-in area shows straight away while its next page loads: the
 * outline of a page header and its cards or rows. Screen readers hear
 * "Loading".
 */
export function PageSkeleton({
  variant = "cards",
}: {
  /** Cards for most pages; rows for admin lists. */
  variant?: "cards" | "rows";
}) {
  return (
    <div role="status" data-page-skeleton="" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full bg-foreground/10" />
        <Skeleton className="h-4 w-96 max-w-full bg-foreground/10" />
      </div>
      {variant === "cards" ? (
        <div aria-hidden="true" className="max-w-3xl space-y-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="space-y-3 rounded-xl border bg-card p-5">
              <Skeleton className="h-5 w-48 max-w-full bg-foreground/[0.08]" />
              <Skeleton className="h-4 w-full bg-foreground/[0.08]" />
              <Skeleton className="h-4 w-2/3 bg-foreground/[0.08]" />
            </div>
          ))}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="divide-y overflow-hidden rounded-lg border bg-card"
        >
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-1/4 bg-foreground/[0.08]" />
              <Skeleton className="h-4 w-1/3 bg-foreground/[0.08]" />
              <Skeleton className="ml-auto h-4 w-16 bg-foreground/[0.08]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
