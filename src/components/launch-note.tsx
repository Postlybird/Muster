import { Alert, AlertDescription } from "@/components/ui/alert";
import { launchWords } from "@/domain/launch";
import { launchNotice } from "@/server/launch";

type Kind = "signUp" | "business";

/**
 * The launch notice's words for this page, while it's on (owner,
 * 20/11/2026): on the sign-up pages, and on a business's dashboard.
 */
export async function LaunchNote({
  kind,
  className,
}: {
  kind: Kind;
  className?: string;
}) {
  const when = await launchNotice();
  if (when === null) return null;
  return (
    <Alert variant="info" className={className}>
      <AlertDescription>{launchWords(when)[kind]}</AlertDescription>
    </Alert>
  );
}
