import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Public pages whose final wording is still to come (plan step 1.16). */
export function DraftPage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <Alert variant="warning">
        <AlertTitle>Draft</AlertTitle>
        <AlertDescription>
          This page is being written and will be checked by a lawyer before
          launch.
        </AlertDescription>
      </Alert>
      {children}
    </main>
  );
}
