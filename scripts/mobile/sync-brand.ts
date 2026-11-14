/**
 * Writes what the phone apps take from src/config/brand.ts, so the name and
 * colours live only there: the "no connection" page, and the app's name on
 * Android and iPhone. `npm run app:sync` runs it before `cap sync`. Builds
 * can open another site, like the demo, with APP_SERVER_URL.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { brand } from "../../src/config/brand";

const website = process.env.APP_SERVER_URL || brand.website;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const offline = `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>No connection</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f4f7fb;
        color: #172033;
        font: 17px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        text-align: center;
      }
      main { padding: 24px; max-width: 22rem; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { margin: 0 0 1.5rem; }
      a {
        display: inline-block;
        min-height: 44px;
        padding: 10px 24px;
        box-sizing: border-box;
        border-radius: 999px;
        background: ${brand.colours.primary};
        color: ${brand.colours.primaryForeground};
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>No connection</h1>
      <p>${escapeHtml(brand.name)} needs the internet. Check your connection, then try again.</p>
      <a href="${escapeHtml(website)}">Try again</a>
    </main>
  </body>
</html>
`;
writeFileSync("mobile/www/offline.html", offline);
console.log("wrote mobile/www/offline.html");

/** Replaces a value in a native file, if the project is there. */
function patch(path: string, pattern: RegExp, replacement: string) {
  if (!existsSync(path)) return;
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);
  if (after !== before) {
    writeFileSync(path, after);
    console.log("updated", path);
  }
}

// Links to the website open the app, on the host it opens.
const host = new URL(website).host;
patch(
  "android/app/src/main/AndroidManifest.xml",
  /(<data android:scheme="https" android:host=")[^"]*(")/,
  `$1${host}$2`,
);
patch(
  "ios/App/App/App.entitlements",
  /<string>applinks:[^<]*<\/string>/,
  `<string>applinks:${host}</string>`,
);

// The app's ID in both stores.
patch(
  "android/app/build.gradle",
  /applicationId "[^"]*"/,
  `applicationId "${brand.appId}"`,
);
patch(
  "ios/App/App.xcodeproj/project.pbxproj",
  /PRODUCT_BUNDLE_IDENTIFIER = [^;]*;/g,
  `PRODUCT_BUNDLE_IDENTIFIER = ${brand.appId};`,
);

const name = escapeHtml(brand.name);
patch(
  "android/app/src/main/res/values/strings.xml",
  /<string name="app_name">[^<]*<\/string>/,
  `<string name="app_name">${name}</string>`,
);
patch(
  "android/app/src/main/res/values/strings.xml",
  /<string name="title_activity_main">[^<]*<\/string>/,
  `<string name="title_activity_main">${name}</string>`,
);
patch(
  "ios/App/App/Info.plist",
  /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${name}$2`,
);
