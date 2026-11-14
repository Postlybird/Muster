/**
 * The phone apps (docs/apps.md) are the website inside a Capacitor app,
 * which adds `window.Capacitor` and the phone's own features. These helpers
 * run only in the browser, and only reach for Capacitor inside the app, so
 * the website itself loads none of it.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

/** Whether this page is open in one of the phone apps. */
export function inNativeApp(): boolean {
  return (
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

/** "ios" or "android" in the apps, "web" in a browser. */
export function nativePlatform(): "ios" | "android" | "web" {
  if (!inNativeApp()) return "web";
  const platform = window.Capacitor?.getPlatform?.();
  return platform === "ios" || platform === "android" ? platform : "web";
}

/**
 * A path on this site from a link the app was opened with, like a call-out's
 * text, or null for anywhere else.
 */
export function appLinkPath(url: string, origin: string): string | null {
  try {
    const target = new URL(url);
    if (target.origin !== origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
