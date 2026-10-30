import type { MetadataRoute } from "next";

import { listIndustries } from "@/server/industries";
import { requestOrigin } from "@/server/request";

/** The public pages, for search engines, at whatever address we're served. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestOrigin();
  const industries = await listIndustries();
  const pages = ["/", "/industries", "/faq", "/contact", "/privacy", "/terms"];
  return [
    ...pages.map((path) => ({
      url: `${origin}${path === "/" ? "" : path}`,
      priority: path === "/" ? 1 : 0.6,
    })),
    ...industries.map((industry) => ({
      url: `${origin}/industries/${industry.slug}`,
      priority: 0.8,
    })),
  ];
}
