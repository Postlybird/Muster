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
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-lg font-extrabold tracking-tight text-primary",
        className,
      )}
    >
      <LogoMark />
      {brand.name}
    </Link>
  );
}
