import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";

/** Lets workers install the app on their phone (brief §8: PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    // Signed-in users are sent from here to their own area.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f1",
    theme_color: brand.colours.primary,
    lang: "en-AU",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
