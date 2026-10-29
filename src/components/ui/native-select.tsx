import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A styled native <select>. Phones show their own picker, and the chosen
 * value shows before the page's scripts load. Preferred in the worker app.
 * `className` sizes the wrapper.
 */
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        data-slot="native-select"
        className={cn(
          "flex h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-card py-2 pr-10 pl-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-60"
        aria-hidden
      />
    </div>
  );
}

export { NativeSelect };
