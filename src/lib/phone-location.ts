import { inNativeApp } from "./native-app";

/** Where the phone is, for clocking in and out. */
export type Fix = { latitude: number; longitude: number; accuracy: number };

const OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15_000,
  // A fresh fix: a cached one could be from before they arrived.
  maximumAge: 0,
};

/**
 * Where the phone is, or null if it can't or won't say: the phone's own
 * location inside the app (docs/apps.md), asking once, or the browser's.
 */
export async function currentFix(): Promise<Fix | null> {
  if (inNativeApp()) {
    try {
      const { registerPlugin } = await import("@capacitor/core");
      const Geolocation = registerPlugin<{
        getCurrentPosition(options: typeof OPTIONS): Promise<{
          coords: Fix;
        }>;
      }>("Geolocation");
      const { coords } = await Geolocation.getCurrentPosition(OPTIONS);
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      };
    } catch {
      return null;
    }
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return null;
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      () => resolve(null),
      OPTIONS,
    ),
  );
}
