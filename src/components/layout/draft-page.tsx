import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { LegalPage } from "./legal-page";

/** Public pages whose legal wording is still a draft (plan step 1.16). */
export function DraftPage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <LegalPage title={title}>
      <Alert variant="warning">
        <AlertTitle>Draft</AlertTitle>
        <AlertDescription>
          We&apos;re finishing this wording before launch. Until then it
          isn&apos;t final.
        </AlertDescription>
      </Alert>
      {children}
    </LegalPage>
  );
}
