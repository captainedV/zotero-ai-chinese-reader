#!/usr/bin/env node
/**
 * Renders the brand SVG to the PNG sizes the add-on manifest needs.
 * Firefox/Zotero do not render SVG add-on icons reliably, so the installed
 * package ships raster copies.
 *
 * Usage: node test/make-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const iconsDir = path.join(ROOT, 'content/icons');
const svg = fs.readFileSync(path.join(iconsDir, 'moonlit.svg'), 'utf8');

const CHROME = path.join(
  process.env.HOME,
  'Library/Caches/ms-playwright/chromium-1247/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
);

const browser = await chromium.launch({ executablePath: CHROME });
try {
  for (const size of [32, 48, 96, 128]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">
         <div style="width:${size}px;height:${size}px">${svg}</div>
       </body></html>`,
      { waitUntil: 'load' }
    );
    await page.locator('svg').evaluate((element, s) => {
      element.setAttribute('width', String(s));
      element.setAttribute('height', String(s));
    }, size);
    const file = path.join(iconsDir, `moonlit-${size}.png`);
    await page.screenshot({ path: file, omitBackground: true });
    const stat = fs.statSync(file);
    console.log(`wrote ${path.relative(ROOT, file)} (${stat.size} bytes)`);
    await page.close();
  }
}
finally {
  await browser.close();
}
