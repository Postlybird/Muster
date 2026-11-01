import Link from "next/link";

import { brand } from "@/config/brand";
import { wordmark } from "@/config/logo";
import { cn } from "@/lib/utils";

/**
 * The logo: the name in lower case with a hi-vis dot on the i (owner,
 * 01/11/2026). It takes the text colour, so it's deep blue on light pages
 * and white on dark ones. The S icon is only for app and browser-tab icons.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={wordmark.viewBox}
      role="img"
      aria-label={brand.name}
      focusable="false"
      className={cn("h-6 w-auto shrink-0", className)}
    >
      <path d={wordmark.letters} className="fill-current" />
      <circle {...wordmark.dot} className="fill-highlight" />
    </svg>
  );
}

export function BrandMark({
  href = "/",
  tone = "brand",
  size = "md",
  className,
}: {
  href?: string;
  /** "light" for the logo on a dark background. */
  tone?: "brand" | "light";
  /** "lg" for the website's header and footer. */
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center",
        tone === "light" ? "text-deep-foreground" : "text-deep",
        className,
      )}
    >
      <Wordmark className={size === "lg" ? "h-8 sm:h-9" : "h-6"} />
    </Link>
  );
}
