// HV12's screenshots of the scratch run's view (port 4812): the Issues page and a Hive
// workspace's Run tab (the Review tab before V92), dark and light, 1440 × 1000 at 1x.
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:4812';
const out = new URL('.', import.meta.url).pathname;
const run = `${process.env.HOME}/.cache/symbiote-hv12/running/`;
const bridge = JSON.parse(readFileSync(run + readdirSync(run).find((f) => f.endsWith('.json')), 'utf8')).key;

async function token() {
  const res = await fetch(`${BASE}/api/session/open`, {
    method: 'POST',
    headers: { 'x-symbiote': '1', 'content-type': 'application/json', 'x-symbiote-key': bridge },
    body: '{}',
  });
  return (await res.json()).token;
}

const browser = await chromium.launch();
const errors = [];
for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript((t) => localStorage.setItem('symbiote.viewer.theme', t), theme);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
  const shot = async (name) => {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}${name}-${theme}.png` });
    console.log(`${name}-${theme}.png`);
  };
  // The Issues page: every issue, issue #3 (asked, answered, taken, landed through a request).
  await page.goto(`${BASE}/issues?number=3#k=${await token()}`);
  await page.getByRole('tab', { name: 'All', exact: true }).click().catch((e) => errors.push('All tab: ' + e.message));
  await page.waitForLoadState('networkidle');
  await shot('issues-3');
  // #6: refused as unsafe by Symbiote's rules.
  await page.goto(`${BASE}/issues?number=6`);
  await page.waitForLoadState('networkidle');
  await shot('issues-6');
  // #8: closed and landed; does its card still offer Start in Hive?
  await page.goto(`${BASE}/issues?number=8`);
  await page.waitForLoadState('networkidle');
  await shot('issues-8-closed');
  // The Run tab of #1's queue landing: a conflict, the writer's merge, landed.
  await page.goto(`${BASE}/?branch=${encodeURIComponent('fix/1-parse-1h-30m-throws-a-2')}&run`);
  await page.waitForLoadState('networkidle');
  await shot('run-fix-1-queue');
  // The Run tab of #2's request landing (stopped by the sandbox, restarted, landed by #10).
  await page.goto(`${BASE}/?branch=${encodeURIComponent('feature/2-support-days-d-in-parse')}&run`);
  await page.waitForLoadState('networkidle');
  await shot('run-feature-2-request');
  await context.close();
}
await browser.close();
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
