import { FileText } from "lucide-react";

/** A worker's uploaded document beside the details (brief §6). Links expire in minutes. */
export function DocumentView({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  if (!url) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No file.
      </p>
    );
  }
  const isPdf = new URL(url).pathname.toLowerCase().endsWith(".pdf");
  return (
    <figure className="space-y-2">
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border bg-card p-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <FileText className="size-5" aria-hidden />
          Open {label} (PDF)
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private file */}
          <img
            src={url}
            alt={label}
            className="max-h-80 w-full rounded-md border bg-muted object-contain"
          />
        </a>
      )}
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}
