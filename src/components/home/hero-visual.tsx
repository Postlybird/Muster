import { CircleCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { brand } from "@/config/brand";

function Stars() {
  return (
    <span className="flex text-highlight" aria-hidden>
      {[0, 1, 2, 3, 4].map((star) => (
        <Star key={star} className="size-4 fill-current" />
      ))}
    </span>
  );
}

/**
 * What businesses see in the app, with made-up example people: a five-star
 * applicant with their note, and a call-out just accepted. Labelled as an
 * example, never shown as a real review.
 */
export function HeroVisual() {
  return (
    <figure
      aria-labelledby="hero-visual-caption"
      className="mx-auto w-full max-w-md lg:max-w-none"
    >
      <div className="rounded-3xl border bg-card p-5 pb-10 shadow-soft sm:p-6 sm:pb-12">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            New applicant for your shift
          </p>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Example
          </span>
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            SM
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-bold text-deep">Sam M.</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <Stars />
              <span>
                <span className="font-semibold text-foreground">5.0</span> from
                18 ratings
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              98% reliable · 42 shifts done
            </p>
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Sam's badges">
          <li>
            <Badge variant="success">Top rated</Badge>
          </li>
          <li>
            <Badge variant="success">Very reliable</Badge>
          </li>
          <li>
            <Badge variant="neutral">White Card</Badge>
          </li>
        </ul>
        <p className="mt-4 rounded-xl border-l-4 border-primary/40 bg-muted/60 px-4 py-3 text-sm">
          <span className="block text-xs text-muted-foreground">
            Why they&apos;re a good fit
          </span>
          Five years on flood and fire restoration jobs. I bring my own PPE and
          I&apos;m happy to start early.
        </p>
        <div aria-hidden className="mt-4 flex items-center gap-3">
          <span className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            Book Sam
          </span>
          <span className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold">
            See profile
          </span>
        </div>
      </div>

      <div className="relative -mt-5 ml-auto w-[90%] rounded-2xl bg-deep p-4 text-deep-foreground shadow-soft sm:-mt-7 lg:w-[82%]">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CircleCheck className="size-5 text-highlight" aria-hidden />
          Call-out accepted
        </p>
        <p className="mt-1 text-sm text-deep-foreground/85">
          Mia R. took your call-out: restoration labourer, today from 2:00 pm.
        </p>
      </div>
      <figcaption
        id="hero-visual-caption"
        className="mt-3 text-center text-xs text-muted-foreground"
      >
        Examples of what businesses see in {brand.name}. The people are made up.
      </figcaption>
    </figure>
  );
}
