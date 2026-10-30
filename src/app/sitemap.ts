import type { MetadataRoute } from "next";

import { listIndustries } from "@/server/industries";
import { listLocations } from "@/server/locations";
import { requestOrigin } from "@/server/request";

/** The public pages, for search engines, at whatever address we're served. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestOrigin();
  const [industries, locations] = await Promise.all([
    listIndustries(),
    listLocations(),
  ]);
  const pages = [
    "/",
    "/industries",
    "/locations",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ];
  return [
    ...pages.map((path) => ({
      url: `${origin}${path === "/" ? "" : path}`,
      priority: path === "/" ? 1 : 0.6,
    })),
    ...industries.map((industry) => ({
      url: `${origin}/industries/${industry.slug}`,
      priority: 0.8,
    })),
    ...locations.map((location) => ({
      url: `${origin}/locations/${location.slug}`,
      priority: location.open ? 0.8 : 0.5,
    })),
  ];
}
