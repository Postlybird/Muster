/**
 * Draws the demo images the seed uploads: placeholder face photos, a sample
 * photo ID and a sample certificate. All clearly marked as demo data.
 * Run `npm run seed:assets` to redraw them (they're committed).
 */
import { mkdirSync } from "node:fs";

import { chromium } from "@playwright/test";

const OUT = "scripts/seed/assets";

const PHOTO_COLOURS: [string, string][] = [
  ["#cfe3df", "#5f8f88"],
  ["#f6e3b5", "#a4823c"],
  ["#dcd6f0", "#6f63a3"],
  ["#f3d2c8", "#a8604b"],
  ["#d4e6f5", "#4d7aa3"],
  ["#e0ead0", "#6d8a45"],
  ["#eed6e6", "#9a5a83"],
  ["#e3e3e3", "#6b6b6b"],
];

function silhouette(bg: string, fg: string, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="${bg}"/>
  <circle cx="160" cy="130" r="62" fill="${fg}"/>
  <path d="M40 320 C40 238 96 204 160 204 C224 204 280 238 280 320 Z" fill="${fg}"/>
</svg>`;
}

const demoStamp = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
  <div style="transform:rotate(-18deg);border:4px solid #c0392b;color:#c0392b;font:700 30px Arial;padding:6px 18px;border-radius:8px;background:rgba(255,255,255,.7)">DEMO DATA · NOT A REAL DOCUMENT</div>
</div>`;

const idCard = `<div id="card" style="width:640px;height:404px;border-radius:24px;background:linear-gradient(135deg,#eef4f3,#d6e7e3);font-family:Arial,Helvetica,sans-serif;position:relative;overflow:hidden;color:#1f2d2b">
  <div style="position:absolute;top:26px;left:30px;font-weight:700;font-size:28px;color:#0b5d57">SAMPLE PHOTO ID</div>
  <div style="position:absolute;top:96px;left:30px;width:170px;height:210px;border-radius:12px;overflow:hidden">${silhouette("#c9d8d5", "#7d9894", 210).replace('width="210" height="210"', 'width="170" height="210" preserveAspectRatio="xMidYMid slice"')}</div>
  <div style="position:absolute;top:104px;left:230px;right:30px;font-size:20px;line-height:1.9">
    <div><b>Name</b> &nbsp; Demo Worker</div>
    <div><b>Date of birth</b> &nbsp; 01/01/1990</div>
    <div><b>Number</b> &nbsp; DEMO 000 000</div>
    <div><b>Expiry</b> &nbsp; 01/01/2030</div>
  </div>
  ${demoStamp}
</div>`;

const certificate = `<div id="card" style="width:640px;height:452px;background:#fffdf6;border:14px double #a4823c;box-sizing:border-box;font-family:Georgia,serif;position:relative;color:#3b3220;text-align:center">
  <div style="margin-top:44px;font-size:34px;font-weight:700;letter-spacing:1px">SAMPLE CERTIFICATE</div>
  <div style="margin-top:18px;font-size:20px">This certifies that</div>
  <div style="margin-top:10px;font-size:28px;font-style:italic">Demo Worker</div>
  <div style="margin-top:14px;font-size:20px">has completed a demonstration course</div>
  <div style="margin-top:22px;font-size:18px">Certificate number DEMO-0000 · Issued 01/01/2026</div>
  <div style="position:absolute;bottom:34px;right:44px;width:96px;height:96px;border-radius:50%;background:#e9d8a6;border:4px solid #a4823c"></div>
  ${demoStamp}
</div>`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const [index, [bg, fg]] of PHOTO_COLOURS.entries()) {
    await page.setContent(
      `<html><body style="margin:0">${silhouette(bg, fg, 320)}</body></html>`,
    );
    const path = `${OUT}/photo-${index + 1}.png`;
    await page.locator("svg").screenshot({ path });
    console.log("wrote", path);
  }

  for (const [name, html] of [
    ["photo-id", idCard],
    ["certificate", certificate],
  ] as const) {
    await page.setContent(
      `<html><body style="margin:0;background:#fff">${html}</body></html>`,
    );
    const path = `${OUT}/${name}.png`;
    await page.locator("#card").screenshot({ path });
    console.log("wrote", path);
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
