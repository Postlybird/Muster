import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";
import { wordmark } from "@/config/logo";

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

/** The logo, as on the site: the wordmark (owner, 01/11/2026). */
const WORDMARK_HEIGHT = 88;
const [, , viewWidth, viewHeight] = wordmark.viewBox.split(" ").map(Number);
const wordmarkWidth = Math.round((WORDMARK_HEIGHT * viewWidth!) / viewHeight!);

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
      <svg
        width={wordmarkWidth}
        height={WORDMARK_HEIGHT}
        viewBox={wordmark.viewBox}
      >
        <path d={wordmark.letters} fill="#123a6e" />
        <circle
          cx={wordmark.dot.cx}
          cy={wordmark.dot.cy}
          r={wordmark.dot.r}
          fill={brand.colours.accent}
        />
      </svg>
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
