// HV12 again's screenshots: a Hive workspace's Run tab, dark and light, 1440 × 1000 at 1x.
// `node shots-again.mjs <out folder> <branch>…`, with HV12_PORT and HV12_CACHE set. Copied into
// packages/viewer/coverage/ to run, where @playwright/test resolves; no WAYLAND_DISPLAY.
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [out, ...branches] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${process.env.HV12_PORT ?? 4813}`;
const run = `${process.env.HV12_CACHE}/running/`;
const bridge = JSON.parse(readFileSync(run + readdirSync(run).find((f) => f.endsWith('.json')), 'utf8')).key;

async function token() {
  const res = await fetch(`${BASE}/api/session/open`, {
    method: 'POST',
    headers: { 'x-symbiote': '1', 'content-type': 'application/json', 'x-symbiote-key': bridge },
    body: '{}',
  });
  return (await res.json()).token;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const errors = [];
for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript((t) => localStorage.setItem('symbiote.viewer.theme', t), theme);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
  let first = true;
  for (const branch of branches) {
    const key = first ? `#k=${await token()}` : '';
    first = false;
    await page.goto(`${BASE}/?branch=${encodeURIComponent(branch)}&run${key}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const name = `run-${branch.replaceAll('/', '-')}-${theme}`;
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name);
  }
  await context.close();
}
await browser.close();
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
