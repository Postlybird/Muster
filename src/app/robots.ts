import type { MetadataRoute } from "next";

import { requestOrigin } from "@/server/request";

/** Search engines see the public pages only, never the signed-in areas. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/business", "/worker", "/dev", "/api", "/auth"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
