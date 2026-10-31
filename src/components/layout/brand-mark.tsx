import Link from "next/link";

import { brand } from "@/config/brand";
import { logo } from "@/config/logo";
import { cn } from "@/lib/utils";

/** The logo mark on its own (decorative: the name sits next to it). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={logo.viewBox}
      aria-hidden
      focusable="false"
      className={cn("size-7 shrink-0", className)}
    >
      <rect width="32" height="32" rx={logo.radius} className="fill-primary" />
      <path
        d={logo.letter}
        fill="none"
        strokeWidth={logo.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
      <circle {...logo.dot} className="fill-highlight" />
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
  /** "light" for the name on a dark background. */
  tone?: "brand" | "light";
  /** "lg" for the website's header and footer. */
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center font-extrabold tracking-tight",
        size === "lg" ? "gap-2.5 text-2xl sm:text-3xl" : "gap-2 text-lg",
        tone === "light" ? "text-deep-foreground" : "text-deep",
        className,
      )}
    >
      <LogoMark className={size === "lg" ? "size-9 sm:size-11" : undefined} />
      {brand.name}
    </Link>
  );
}
