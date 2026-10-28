/**
 * Generates the app icons from the brand (first letter on the brand colour).
 * Run `npm run icons` after changing the name or colours in src/config/brand.ts.
 */
import { writeFileSync } from "node:fs";

import { chromium } from "@playwright/test";

import { brand } from "../src/config/brand";

const letter = brand.name.trim().charAt(0).toUpperCase();

/** maskable icons keep the letter inside the central "safe zone". */
function svg(size: number, { maskable = false, rounded = true } = {}): string {
  const radius = rounded && !maskable ? size * 0.22 : 0;
  const fontSize = size * (maskable ? 0.42 : 0.58);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${brand.colours.primary}"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="${brand.colours.primaryForeground}">${letter}</text>
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
