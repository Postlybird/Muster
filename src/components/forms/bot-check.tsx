"use client";

import { useCallback, useEffect, useRef } from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("The bot check didn't load"));
    script.onerror = () => {
      loading = null;
      reject(new Error("The bot check didn't load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** How long to wait for the check's script, then for its answer. */
const LOAD_WAIT_MS = 10_000;
const ANSWER_WAIT_MS = 60_000;

/**
 * The bot check on forms that send a code (Cloudflare Turnstile), so bots
 * can't run up our email and text costs. It's on only where
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (the live site), whose sign-in
 * settings refuse a code request without its token. Usually invisible: a
 * challenge shows only when Cloudflare needs one. Render `element` in a
 * place that stays on screen while codes can be sent again.
 */
export function useBotCheck(): {
  element: React.ReactNode;
  getToken: () => Promise<string | undefined>;
} {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const answer = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        const id = api.render(container.current, {
          sitekey: siteKey,
          execution: "execute",
          appearance: "interaction-only",
          callback: (token: string) => answer.current?.(token),
          "error-callback": () => answer.current?.(""),
        });
        widget.current = { api, id };
      })
      .catch(() => {
        // Without the check the request is refused, with a message to try again.
      });
    return () => {
      cancelled = true;
      widget.current?.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [siteKey]);

  const getToken = useCallback(async () => {
    if (!siteKey) return undefined;
    const started = Date.now();
    while (!widget.current && Date.now() - started < LOAD_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const ready = widget.current;
    if (!ready) return "";
    return new Promise<string>((resolve) => {
      const timer = setTimeout(() => {
        answer.current = null;
        resolve("");
      }, ANSWER_WAIT_MS);
      answer.current = (token) => {
        clearTimeout(timer);
        answer.current = null;
        resolve(token);
      };
      // Each token works once, so every request gets a fresh one.
      ready.api.reset(ready.id);
      ready.api.execute(ready.id);
    });
  }, [siteKey]);

  return {
    element: siteKey ? <div ref={container} className="empty:hidden" /> : null,
    getToken,
  };
}
