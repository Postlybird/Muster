import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * What a business sees of a worker (brief §4.4): photo, name, rating,
 * reliability, shifts completed and verified ticket names. Never documents,
 * date of birth or visa details.
 */
export function WorkerCard({
  name,
  photoUrl,
  rating,
  reliability,
  shiftsCompleted,
  tickets,
  children,
}: {
  name: string;
  photoUrl: string | null;
  rating: number | null;
  reliability: number | null;
  shiftsCompleted: number;
  tickets?: string[];
  children?: React.ReactNode;
}) {
  const facts = [
    rating === null ? "Not rated yet" : `${rating.toFixed(1)} stars`,
    reliability === null ? "New" : `${Math.round(reliability)}% reliable`,
    shiftsCompleted === 0
      ? "No shifts with us yet"
      : shiftsCompleted === 1
        ? "1 shift done"
        : `${shiftsCompleted} shifts done`,
  ];
  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-14">
        {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
        </div>
        {tickets && tickets.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label={`${name}'s tickets`}>
            {tickets.map((ticket) => (
              <li key={ticket}>
                <Badge variant="neutral">{ticket}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </div>
  );
}
