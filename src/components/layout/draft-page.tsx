import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Public pages with legal wording a lawyer hasn't checked yet (plan step 1.16). */
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
          A lawyer will check this wording before launch. Until then it
          isn&apos;t final.
        </AlertDescription>
      </Alert>
      {children}
    </main>
  );
}
