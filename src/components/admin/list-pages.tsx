import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Previous and next links under a long list, and where you're up to. */
export function ListPages({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1 && page === 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={href(Math.min(page - 1, pages))}>Previous</Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Button asChild variant="outline">
          <Link href={href(page + 1)}>Next</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
