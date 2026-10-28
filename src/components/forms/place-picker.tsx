"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Suggestion = { id: string; label: string };

/**
 * Type-ahead picker for a suburb or street address (ARIA combobox). The
 * chosen place's id goes in a hidden input called `name`; the typed text goes
 * in `${name}_text` so the server can tell an unchanged value from a new one.
 */
export function PlacePicker({
  id,
  name,
  kind,
  defaultLabel = "",
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  name: string;
  kind: "suburb" | "address";
  defaultLabel?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(defaultLabel);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchedFor, setSearchedFor] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  const query = text.trim();
  const searching = !chosen && query.length >= 2 && query !== defaultLabel;

  useEffect(() => {
    if (!searching) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/places?kind=${kind}&q=${encodeURIComponent(query)}`,
        );
        const body = response.ok
          ? ((await response.json()) as { suggestions: Suggestion[] })
          : { suggestions: [] };
        if (request === latest.current) {
          setSuggestions(body.suggestions);
          setSearchedFor(query);
          setActive(body.suggestions.length > 0 ? 0 : -1);
        }
      } catch {
        if (request === latest.current) setSuggestions([]);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searching, query, kind]);

  function choose(suggestion: Suggestion) {
    setChosen(suggestion);
    setText(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && suggestions[active]) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && searching && suggestions.length > 0;
  const noMatches =
    open &&
    searching &&
    !loading &&
    searchedFor === query &&
    suggestions.length === 0;

  return (
    <div className="relative">
      <Input
        id={id}
        name={`${name}_text`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setChosen(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <input type="hidden" name={name} value={chosen?.id ?? ""} />
      {loading ? (
        <Loader2
          className="absolute top-3 right-3 size-5 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        className={cn(
          "absolute z-40 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
          !showList && "hidden",
        )}
      >
        {suggestions.map((suggestion, i) => (
          <li
            key={suggestion.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(suggestion)}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-2 px-3 text-base",
              i === active && "bg-accent text-accent-foreground",
            )}
          >
            <MapPin
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            {suggestion.label}
          </li>
        ))}
      </ul>
      {noMatches ? (
        <p className="mt-1 text-sm text-muted-foreground">
          No matches. Check the spelling, or try the postcode.
        </p>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {showList
          ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}. Use the arrow keys to choose.`
          : ""}
      </span>
    </div>
  );
}
