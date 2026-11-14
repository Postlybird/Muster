import type { CapacitorConfig } from "@capacitor/cli";

import { brand } from "./src/config/brand";

/**
 * The App Store and Google Play apps (owner, 14/11/2026; docs/apps.md): the
 * live website inside a native app, with the phone's own notifications,
 * location and camera. Builds can open another site, like the demo, with
 * APP_SERVER_URL. After changing this file, the plugins or the brand, run
 * `npm run app:sync`.
 */
const website = process.env.APP_SERVER_URL || brand.website;

const config: CapacitorConfig = {
  appId: brand.appId,
  appName: brand.name,
  // Only the "no connection" page is in the app; everything else is the site.
  webDir: "mobile/www",
  appendUserAgent: `${brand.name}App`,
  backgroundColor: "#f4f7fb",
  server: {
    url: website,
    errorPath: "offline.html",
  },
  ios: {
    // Keeps the site clear of the notch and the home bar.
    contentInset: "always",
  },
  plugins: {
    // Hides itself, so it can't stay up when the site doesn't load; the
    // site hides it sooner once it's ready (NativeBridge).
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      launchFadeOutDuration: 200,
      backgroundColor: brand.colours.primary,
      showSpinner: false,
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  experimental: {
    ios: {
      spm: {
        // The plugin's own advice, against a Swift package name clash.
        packageOptions: {
          "@capacitor-firebase/messaging": { symlink: true },
        },
      },
    },
  },
};

export default config;
