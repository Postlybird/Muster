import { Container } from "./container";
import { PageBand } from "./page-band";

/** Public pages of legal wording: a title band and a readable column. */
export function LegalPage({
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
        <div className="max-w-3xl space-y-6">{children}</div>
      </Container>
    </main>
  );
}
