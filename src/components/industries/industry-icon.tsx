import { createElement } from "react";

import { industryIcon } from "@/config/industry-icons";

/** An industry's icon, by its name (decorative: the industry is named too). */
export function IndustryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return createElement(industryIcon(name), { className, "aria-hidden": true });
}
