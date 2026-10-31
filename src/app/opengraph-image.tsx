import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";
import { logo } from "@/config/logo";

/** The picture shown when someone shares a link to the site. */
export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Figtree, the site's font, as static instances (the image renderer can't
// read variable or woff2 fonts). OFL-licensed: see fonts/OFL.txt.
const fonts = Promise.all(
  ["Figtree-Medium.ttf", "Figtree-ExtraBold.ttf"].map((file) =>
    readFile(join(process.cwd(), "src/app/fonts", file)),
  ),
);

export default async function OpenGraphImage() {
  const [medium, extraBold] = await fonts;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#eaf2fd",
        color: "#123a6e",
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width={96} height={96} viewBox={logo.viewBox}>
          <rect
            width="32"
            height="32"
            rx={logo.radius}
            fill={brand.colours.primary}
          />
          <path
            d={logo.letter}
            fill="none"
            stroke={brand.colours.primaryForeground}
            strokeWidth={logo.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={logo.dot.cx}
            cy={logo.dot.cy}
            r={logo.dot.r}
            fill={brand.colours.accent}
          />
        </svg>
        <div style={{ fontSize: 60, fontWeight: 800 }}>{brand.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 112,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          {brand.tagline}
        </div>
        <div style={{ fontSize: 38, fontWeight: 500, color: "#526072" }}>
          {brand.strapline}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Figtree", data: medium, weight: 500, style: "normal" },
        { name: "Figtree", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
