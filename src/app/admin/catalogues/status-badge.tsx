import { Badge } from "@/components/ui/badge";

/** Active, hidden (not offered for new work) or archived. */
export function CatalogueStatus({
  active,
  archivedAt,
}: {
  active: boolean;
  archivedAt: string | null;
}) {
  if (archivedAt) return <Badge variant="neutral">Archived</Badge>;
  return active ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="warning">Hidden</Badge>
  );
}
