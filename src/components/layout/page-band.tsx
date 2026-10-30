import { Container } from "./container";

/** The top of a public page: a full-width light blue band with a big title. */
export function PageBand({
  title,
  children,
}: {
  title: string;
  /** A line or two under the title. */
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b bg-primary-soft">
      <Container className="space-y-4 py-14 sm:py-20">
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-balance text-deep sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {children ? (
          <div className="max-w-2xl text-lg text-muted-foreground">
            {children}
          </div>
        ) : null}
      </Container>
    </div>
  );
}
