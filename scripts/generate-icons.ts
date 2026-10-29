/**
 * Generates the app icons from the logo mark and brand colours.
 * Run `npm run icons` after changing src/config/logo.ts or the colours in
 * src/config/brand.ts.
 */
import { writeFileSync } from "node:fs";

import { chromium } from "@playwright/test";

import { brand } from "../src/config/brand";
import { logo } from "../src/config/logo";

/**
 * Maskable icons fill the square and keep the mark inside the central
 * "safe zone"; Apple rounds its own icons, so those are square too.
 */
function svg(size: number, { maskable = false, rounded = true } = {}): string {
  const radius = rounded && !maskable ? logo.radius : 0;
  // Shrink the mark around the centre to fit a maskable icon's safe zone.
  const scale = maskable ? 0.72 : 1;
  const offset = 16 * (1 - scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${logo.viewBox}">
  <rect width="32" height="32" rx="${radius}" fill="${brand.colours.primary}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${logo.letter}" fill="none" stroke="${brand.colours.primaryForeground}" stroke-width="${logo.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${logo.dot.cx}" cy="${logo.dot.cy}" r="${logo.dot.r}" fill="${brand.colours.accent}"/>
  </g>
</svg>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const outputs: {
    path: string;
    size: number;
    maskable?: boolean;
    rounded?: boolean;
  }[] = [
    { path: "public/icons/icon-192.png", size: 192 },
    { path: "public/icons/icon-512.png", size: 512 },
    { path: "public/icons/maskable-512.png", size: 512, maskable: true },
    { path: "src/app/apple-icon.png", size: 180, rounded: false },
    { path: "src/app/icon.png", size: 64 },
  ];

  for (const out of outputs) {
    await page.setViewportSize({ width: out.size, height: out.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(out.size, out)}</body></html>`,
    );
    await page
      .locator("svg")
      .screenshot({ path: out.path, omitBackground: true });
    console.log("wrote", out.path);
  }
  await browser.close();

  writeFileSync("src/app/icon.svg", svg(64));
  console.log("wrote src/app/icon.svg");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
