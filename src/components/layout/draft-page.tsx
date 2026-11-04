import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Container } from "./container";
import { PageBand } from "./page-band";

/** Public pages whose legal wording is still a draft (plan step 1.16). */
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
              We&apos;re finishing this wording before launch. Until then it
              isn&apos;t final.
            </AlertDescription>
          </Alert>
          {children}
        </div>
      </Container>
    </main>
  );
}
