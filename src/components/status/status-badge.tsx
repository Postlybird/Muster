import { Badge } from "@/components/ui/badge";
import type { StatusInfo, Tone } from "@/lib/statuses";

const variantForTone: Record<
  Tone,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusInfo;
  className?: string;
}) {
  return (
    <Badge variant={variantForTone[status.tone]} className={className}>
      {status.label}
    </Badge>
  );
}
