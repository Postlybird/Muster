/** A titled card on an admin detail page, linkable by its id. */
export function Section({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** One labelled fact in a <dl>. */
export function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value ?? "—"}</dd>
    </div>
  );
}
