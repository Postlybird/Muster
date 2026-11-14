import { appleAppSiteAssociation } from "@/lib/app-links";

/** Lets the iPhone open the website's links in the app (docs/apps.md). */
export function GET() {
  const association = appleAppSiteAssociation();
  return association
    ? Response.json(association)
    : new Response("Not set up yet", { status: 404 });
}
