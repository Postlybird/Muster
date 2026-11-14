/**
 * Generates the icons from the logo mark and brand colours: the website's,
 * and the phone apps' (docs/apps.md) once their projects exist.
 * Run `npm run icons` after changing src/config/logo.ts or the colours in
 * src/config/brand.ts.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { chromium, type Page } from "@playwright/test";
import sharp from "sharp";

import { brand } from "../src/config/brand";
import { logo } from "../src/config/logo";

const { primary, primaryForeground, accent } = brand.colours;

/** The mark on the 32 grid, without its square. */
function mark(stroke = primaryForeground, dot = accent): string {
  return `<path d="${logo.letter}" fill="none" stroke="${stroke}" stroke-width="${logo.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${logo.dot.cx}" cy="${logo.dot.cy}" r="${logo.dot.r}" fill="${dot}"/>`;
}

/** The mark shrunk around the centre of the 32 grid. */
function scaled(scale: number, shapes = mark()): string {
  const offset = 16 * (1 - scale);
  return `<g transform="translate(${offset} ${offset}) scale(${scale})">${shapes}</g>`;
}

/**
 * Maskable icons fill the square and keep the mark inside the central
 * "safe zone"; Apple rounds its own icons, so those are square too.
 */
function svg(
  size: number,
  { maskable = false, rounded = true, round = false } = {},
): string {
  const radius = round ? 16 : rounded && !maskable ? logo.radius : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${logo.viewBox}">
  <rect width="32" height="32" rx="${radius}" fill="${primary}"/>
  ${scaled(maskable ? 0.72 : 1)}
</svg>`;
}

/** Android's adaptive icon layer: the mark alone, inside its safe zone. */
function foreground(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${logo.viewBox}">
  ${scaled(66 / 108)}
</svg>`;
}

/** An opening screen: the brand colour with the mark in the middle. */
function splash(width: number, height: number, markSize: number): string {
  const x = (width - markSize) / 2;
  const y = (height - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${primary}"/>
  <g transform="translate(${x} ${y}) scale(${markSize / 32})">${mark()}</g>
</svg>`;
}

async function render(
  page: Page,
  path: string,
  markup: string,
  { opaque = false } = {},
) {
  const width = Number(/width="(\d+)"/.exec(markup)?.[1]);
  const height = Number(/height="(\d+)"/.exec(markup)?.[1]);
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup}</body></html>`,
  );
  const png = await page.locator("svg").screenshot({ omitBackground: !opaque });
  mkdirSync(dirname(path), { recursive: true });
  // Apple refuses app icons with an alpha channel, even a fully opaque one.
  await (
    opaque
      ? sharp(png).flatten({ background: primary }).removeAlpha()
      : sharp(png)
  )
    .png()
    .toFile(path);
  console.log("wrote", path);
}

const ANDROID_RES = "android/app/src/main/res";
const DENSITIES = [
  { name: "mdpi", scale: 1 },
  { name: "hdpi", scale: 1.5 },
  { name: "xhdpi", scale: 2 },
  { name: "xxhdpi", scale: 3 },
  { name: "xxxhdpi", scale: 4 },
] as const;
/** The template's opening screen sizes, portrait (landscape swaps them). */
const SPLASH_SIZES: Record<(typeof DENSITIES)[number]["name"], number[]> = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};

async function android(page: Page) {
  for (const { name, scale } of DENSITIES) {
    const dir = `${ANDROID_RES}/mipmap-${name}`;
    await render(page, `${dir}/ic_launcher.png`, svg(48 * scale));
    await render(
      page,
      `${dir}/ic_launcher_round.png`,
      svg(48 * scale, { round: true }),
    );
    await render(
      page,
      `${dir}/ic_launcher_foreground.png`,
      foreground(108 * scale),
    );
    const [w, h] = SPLASH_SIZES[name];
    const markSize = Math.round(Math.min(w!, h!) * 0.3);
    await render(
      page,
      `${ANDROID_RES}/drawable-port-${name}/splash.png`,
      splash(w!, h!, markSize),
      { opaque: true },
    );
    await render(
      page,
      `${ANDROID_RES}/drawable-land-${name}/splash.png`,
      splash(h!, w!, markSize),
      { opaque: true },
    );
  }
  await render(
    page,
    `${ANDROID_RES}/drawable/splash.png`,
    splash(480, 320, 96),
    {
      opaque: true,
    },
  );

  writeFileSync(
    `${ANDROID_RES}/values/ic_launcher_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${primary}</color>
    <color name="brand_primary">${primary}</color>
</resources>
`,
  );
  // Android draws notification icons in one colour, so the mark is white.
  const dot = `M${logo.dot.cx - logo.dot.r},${logo.dot.cy}a${logo.dot.r},${logo.dot.r} 0 1,0 ${logo.dot.r * 2},0a${logo.dot.r},${logo.dot.r} 0 1,0 ${-logo.dot.r * 2},0`;
  writeFileSync(
    `${ANDROID_RES}/drawable/ic_stat_notify.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by npm run icons from src/config/logo.ts. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="32"
    android:viewportHeight="32">
    <path
        android:pathData="${logo.letter}"
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="${logo.strokeWidth}"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="${dot}"
        android:fillColor="#FFFFFFFF" />
</vector>
`,
  );
  console.log("wrote the Android colours and notification icon");
}

const IOS_ASSETS = "ios/App/App/Assets.xcassets";

async function ios(page: Page) {
  await render(
    page,
    `${IOS_ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`,
    svg(1024, { rounded: false }),
    { opaque: true },
  );
  for (const file of [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
  ]) {
    await render(
      page,
      `${IOS_ASSETS}/Splash.imageset/${file}`,
      splash(2732, 2732, 600),
      { opaque: true },
    );
  }
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
    await render(page, out.path, svg(out.size, out));
  }
  writeFileSync("src/app/icon.svg", svg(64));
  console.log("wrote src/app/icon.svg");

  if (existsSync(ANDROID_RES)) await android(page);
  if (existsSync(IOS_ASSETS)) await ios(page);
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
