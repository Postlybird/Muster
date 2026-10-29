import {
  CalendarDays,
  Check,
  HardHat,
  MapPin,
  TriangleAlert,
  Wallet,
} from "lucide-react";

/**
 * What a worker sees on their phone: an example shift offer drawn with the
 * app's own styles (not a screenshot), and the business's "booked" note.
 * Decorative, so it's hidden from screen readers; the page says the same.
 */
export function ShiftPreview() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden w-full max-w-sm select-none sm:block"
    >
      <div className="rounded-[2.75rem] border-[10px] border-[#14243d] bg-background shadow-[0_24px_60px_-20px_rgb(23_32_51/0.35)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground">
          <span>7:41</span>
          <span className="h-1.5 w-14 rounded-full bg-[#14243d]/80" />
          <span>4G</span>
        </div>
        <div className="space-y-3 px-4 pb-6">
          <p className="text-lg font-bold text-foreground">Shifts for you</p>
          <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  Restoration labourer
                </p>
                <p className="text-sm text-muted-foreground">
                  Flood strip-out · 4 shifts
                </p>
              </div>
              <span className="rounded-full bg-highlight-soft px-2 py-0.5 text-xs font-semibold text-foreground">
                Example
              </span>
            </div>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                Tue to Fri, 7:00 am – 3:30 pm
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                Granville, 6 km from home
              </li>
              <li className="flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" />
                $33.13 an hour, paid weekly
              </li>
              <li className="flex items-center gap-2">
                <HardHat className="size-4 text-muted-foreground" />
                White Card
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <TriangleAlert className="size-4" />
                Mould, wet carpet, heavy lifting
              </li>
            </ul>
            <div className="flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              Accept 4 shifts
            </div>
          </div>
          <div className="rounded-2xl border bg-card/70 p-4">
            <p className="font-semibold text-foreground/70">
              Commercial cleaner
            </p>
            <p className="text-sm text-muted-foreground">
              Parramatta · Sat, 6:00 – 10:00 am
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-14 -left-12 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-[0_12px_30px_-12px_rgb(23_32_51/0.3)]">
        <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Liam O. is booked</p>
          <p className="text-muted-foreground">Tue, 7:00 am · White Card</p>
        </div>
      </div>
    </div>
  );
}
