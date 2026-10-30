import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server's HTML and until the page's JavaScript has loaded.
 * Forms that only work with JavaScript wait for it, so an early tap can't
 * fall back to a plain page reload that puts what was typed in the URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
