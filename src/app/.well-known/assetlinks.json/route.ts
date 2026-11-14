import { assetLinks } from "@/lib/app-links";

/** Lets Android open the website's links in the app (docs/apps.md). */
export function GET() {
  const links = assetLinks();
  return links
    ? Response.json(links)
    : new Response("Not set up yet", { status: 404 });
}
