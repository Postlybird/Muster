import type { MetadataRoute } from "next";

import { isDemoMode } from "@/lib/env";
import { requestOrigin } from "@/server/request";

/**
 * Search engines see the public pages only, never the signed-in areas. While
 * the site is a demo, every page also asks not to be listed (the root
 * layout's metadata), so there's no sitemap to offer.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin", "/business", "/worker", "/dev", "/api", "/auth"],
  };
  if (isDemoMode()) return { rules };
  return { rules, sitemap: `${await requestOrigin()}/sitemap.xml` };
}
