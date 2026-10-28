import Link from "next/link";

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

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
      className={cn("text-lg font-bold tracking-tight text-primary", className)}
    >
      {brand.name}
    </Link>
  );
}
