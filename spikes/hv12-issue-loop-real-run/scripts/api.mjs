// The scratch view's API for HV12's run: the page key traded once from the printed token and kept
// in a file (never printed); `link` mints a one-time address for a browser with the bridge key.
// The second run sets HV12_PORT, HV12_CACHE and HV12_RUN (where `view.log` and `key` are kept).
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const dir = process.env.HV12_RUN ? `${process.env.HV12_RUN}/` : new URL('.', import.meta.url).pathname;
const BASE = `http://127.0.0.1:${process.env.HV12_PORT ?? 4812}`;
const keyFile = dir + 'key';
const page = { 'x-symbiote': '1', 'content-type': 'application/json' };

async function pageKey() {
  if (existsSync(keyFile)) return readFileSync(keyFile, 'utf8').trim();
  const token = /#k=([A-Za-z0-9_-]+)/.exec(readFileSync(dir + 'view.log', 'utf8'))[1];
  const res = await fetch(BASE + '/api/session', { method: 'POST', headers: page, body: JSON.stringify({ k: token }) });
  if (!res.ok) throw new Error(`trade: ${res.status} ${await res.text()}`);
  const { key } = await res.json();
  writeFileSync(keyFile, key, { mode: 0o600 });
  return key;
}

function bridgeKey() {
  const run = (process.env.HV12_CACHE ?? process.env.HOME + '/.cache/symbiote-hv12') + '/running/';
  const file = readdirSync(run).find((f) => f.endsWith('.json'));
  return JSON.parse(readFileSync(run + file, 'utf8')).key;
}

const [cmd, path = '/', body] = process.argv.slice(2);
if (cmd === 'link') {
  const res = await fetch(BASE + '/api/session/open', { method: 'POST', headers: { ...page, 'x-symbiote-key': bridgeKey() }, body: '{}' });
  const { token } = await res.json();
  console.log(`${BASE}${path}#k=${token}`);
} else {
  const started = Date.now();
  const res = await fetch(BASE + path, {
    method: cmd,
    headers: { ...page, 'x-symbiote-key': await pageKey() },
    ...(cmd === 'GET' ? {} : { body: body ?? '{}' }),
  });
  const text = await res.text();
  console.error(`${cmd} ${path} -> ${res.status} in ${Date.now() - started} ms`);
  console.log(text);
}
