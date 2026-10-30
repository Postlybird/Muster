import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Container } from "./container";
import { PageBand } from "./page-band";

/** Public pages with legal wording a lawyer hasn't checked yet (plan step 1.16). */
export function DraftPage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <PageBand title={title} />
      <Container className="py-12 sm:py-16">
        <div className="max-w-3xl space-y-6">
          <Alert variant="warning">
            <AlertTitle>Draft</AlertTitle>
            <AlertDescription>
              A lawyer will check this wording before launch. Until then it
              isn&apos;t final.
            </AlertDescription>
          </Alert>
          {children}
        </div>
      </Container>
    </main>
  );
}
