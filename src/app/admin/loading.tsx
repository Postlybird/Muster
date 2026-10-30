import { PageSkeleton } from "@/components/page-skeleton";

/** Shown straight away while an admin page loads. */
export default function Loading() {
  return <PageSkeleton variant="rows" />;
}
