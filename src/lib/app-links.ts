import { brand } from "@/config/brand";

/**
 * The files Android and the iPhone read from the website before they open
 * its links in the app (docs/apps.md). Each needs a detail that comes with
 * the owner's store accounts, so until it's set there's no file and links
 * open in the browser.
 */

/** Android: the app's signing certificate fingerprints, from Google Play. */
export function assetLinks(
  fingerprints = process.env.ANDROID_CERT_SHA256,
): object[] | null {
  const prints = (fingerprints ?? "")
    .split(",")
    .map((print) => print.trim().toUpperCase())
    .filter((print) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(print));
  if (prints.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: brand.appId,
        sha256_cert_fingerprints: prints,
      },
    },
  ];
}

/** iPhone: the Apple Team ID, from the developer account. */
export function appleAppSiteAssociation(
  teamId = process.env.APPLE_TEAM_ID,
): object | null {
  const team = teamId?.trim().toUpperCase();
  if (!team || !/^[0-9A-Z]{10}$/.test(team)) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${brand.appId}`],
          // Every page, but not the API the scheduled jobs and hooks use.
          components: [{ "/": "/api/*", exclude: true }, { "/": "*" }],
        },
      ],
    },
  };
}
