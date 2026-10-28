import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

/**
 * Renders agreement text written in Markdown. Raw HTML is not rendered, so
 * a document can't inject scripts or styles.
 */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-warning [&_blockquote]:bg-warning-soft [&_blockquote]:px-4 [&_blockquote]:py-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc",
        className,
      )}
    >
      <ReactMarkdown skipHtml>{children}</ReactMarkdown>
    </div>
  );
}
