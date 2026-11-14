// Prints each new line of the scratch clone's Hive and issue event files, shortened.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = `${process.env.HV12_CLONE ?? '/tmp/hv12-real/loc'}/symbiote`;
const seen = new Map();
const quiet = new Set((process.env.QUIET ?? '').split(',').filter(Boolean));
function files(dir) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'logs') out = out.concat(files(p));
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}
function tick(first) {
  for (const f of [...files(join(root, 'hive')), ...files(join(root, 'issues'))]) {
    const size = statSync(f).size;
    const from = seen.get(f) ?? (first ? size : 0);
    if (size > from) {
      const text = readFileSync(f, 'utf8').slice(from);
      for (const line of text.split('\n').filter(Boolean)) {
        let j; try { j = JSON.parse(line); } catch { continue; }
        const kind = j.kind ?? j.event ?? j.step;
        if (quiet.has(kind)) continue;
        const name = f.replace(root + '/', '');
        console.log(`${name} ${line}`.slice(0, 260));
      }
    }
    seen.set(f, size);
  }
}
tick(process.argv[2] !== 'all');
setInterval(() => tick(false), 2000);
