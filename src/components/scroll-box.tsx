import { cn } from "@/lib/utils";

/**
 * Long text (an agreement or contract) in a box that scrolls on its own. It
 * takes keyboard focus, so people who don't use a mouse can scroll it too.
 */
export function ScrollBox({
  label,
  className,
  children,
}: {
  /** What's in the box, for screen readers. */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "overflow-y-auto outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {children}
    </div>
  );
}
