// The PNGs as WebP (quality 0.8), encoded by Chromium's canvas: no image tool is installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const [from, to, ...names] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of names) {
  const png = readFileSync(`${from}/${name}.png`).toString('base64');
  const data = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.8).split(',')[1];
  }, png);
  writeFileSync(`${to}/${name}.webp`, Buffer.from(data, 'base64'));
}
await browser.close();
