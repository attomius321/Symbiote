// Each Hive workspace of the scratch clone: its steps' times and its reviews' cost, from its
// events (`symbiote/hive/<branch>.jsonl`), and its request's merge read on GitHub.
// HV12_CLONE and HV12_REPO as in the other scripts.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const clone = process.env.HV12_CLONE ?? '/tmp/hv12-real/loc';
const repo = process.env.HV12_REPO ?? 'attomius321/symbiote-hv12-scratch';
const root = join(clone, 'symbiote', 'hive');
const s = (ms) => (ms === undefined ? '' : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'logs' ? [] : files(p);
    return name.endsWith('.jsonl') ? [p] : [];
  });
}

const merged = new Map();
for (const f of files(root)) {
  const events = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const at = (e) => Date.parse(e.at);
  const first = (kind, after = 0) => events.find((e) => e.kind === kind && at(e) >= after);
  const start = at(events[0]);
  const turns = events.filter((e) => e.kind === 'turn-ended');
  const checks = events.filter((e) => e.kind === 'check').map((e) => `${(e.ms / 1000).toFixed(2)} s`);
  const reviews = events.filter((e) => e.kind === 'review').map((e) => `${s(e.ms)}, $${e.cost.toFixed(3)}`);
  const cost = events.filter((e) => e.kind === 'review').reduce((sum, e) => sum + e.cost, 0);
  const landed = events.find((e) => e.kind === 'landed');
  const opened = events.filter((e) => e.kind === 'request-opened').at(-1);
  const queued = events.filter((e) => e.kind === 'land-queued').at(-1);
  const toLanding = events.filter((e) => e.kind === 'landing');
  let then = '';
  if (landed?.request) {
    if (!merged.has(landed.request)) {
      merged.set(landed.request, execFileSync('gh', ['api', `repos/${repo}/pulls/${landed.request}`, '--jq', '.merged_at']).toString().trim());
    }
    const m = Date.parse(merged.get(landed.request));
    then = `#${landed.request} merged ${s(m - at(opened))} after it opened; seen ${s(at(landed) - m)} later`;
  } else if (landed && queued) {
    then = `queued to landed and pushed ${s(at(landed) - at(queued))}`;
  }
  const writer = turns.length ? s(at(turns[0]) - start) : '';
  const out = {
    branch: f.slice(root.length + 1, -'.jsonl'.length),
    writer,
    turns: turns.length,
    checks: checks.join(', '),
    reviews: reviews.join('; '),
    reviewCost: Number(cost.toFixed(4)),
    toRequestOrQueue: toLanding.map((l) => {
      const next = events.find((e) => (e.kind === 'request-opened' || e.kind === 'land-queued' || e.kind === 'pushed') && at(e) >= at(l));
      return next ? `${s(at(next) - at(l))} (${next.kind})` : '';
    }).join(', '),
    then,
    startedToLanded: landed ? s(at(landed) - start) : '',
    stops: events.filter((e) => e.kind === 'stuck').map((e) => e.stop),
  };
  console.log(JSON.stringify(out));
}
