import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const a = j.answer ?? {};
  console.log(`#${j.number} ${j.decision}${j.refusal ? ' ' + j.refusal : ''}${j.refusedBy ? ' by ' + j.refusedBy : ''}${j.hold ? ' HOLD ' + JSON.stringify(j.hold) : ''} | kind=${a.kind} size=${a.size} model=${a.model}/${a.effort} | flags model=${JSON.stringify(a.flags)} snapshot=${JSON.stringify(j.snapshot?.flags)} | run=${JSON.stringify({ ms: j.run?.ms ?? j.run?.duration, cost: j.run?.cost, ...(j.run ?? {}) })}`);
  if (a.question) console.log(`   question: ${a.question}`);
  console.log(`   reasons: ${(a.reasons ?? []).join(' / ')}`);
}
