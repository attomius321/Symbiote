// Each writer's transcript: its turns' times, tools, refused hosts, and its cost at list prices.
import { readFileSync, readdirSync } from 'node:fs';
const base = process.env.HOME + '/.claude/projects/';
const PRICE = { // $ per million tokens (claude-api skill, 2026-11-03): input, output, cache read
  sonnet: [2, 10, 0.1], opus: [4, 20, 0.2] };
for (const dir of readdirSync(base).filter((d) => d.startsWith('-tmp-hv12-real-loc-worktrees-'))) {
  for (const f of readdirSync(base + dir).filter((x) => x.endsWith('.jsonl'))) {
    const lines = readFileSync(base + dir + '/' + f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const seen = new Set(); let cost = 0; const tools = new Map(); const refused = []; const prompts = []; let model = '';
    const types = new Set();
    for (const j of lines) {
      types.add(j.type);
      const m = j.message;
      if (j.type === 'user' && typeof m?.content === 'string') prompts.push(j.timestamp);
      if (j.type === 'user' && Array.isArray(m?.content) && m.content.some((p) => p.type === 'text')) prompts.push(j.timestamp);
      if (m?.usage && m.id && !seen.has(m.id)) {
        seen.add(m.id); model = m.model ?? model;
        const p = PRICE[Object.keys(PRICE).find((k) => (m.model ?? '').includes(k)) ?? 'sonnet'];
        const u = m.usage;
        const c1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0; const c5m = (u.cache_creation_input_tokens ?? 0) - c1h;
        cost += ((u.input_tokens ?? 0) * p[0] + (u.output_tokens ?? 0) * p[1] + c5m * p[0] * 1.25 + c1h * p[0] * 2 + (u.cache_read_input_tokens ?? 0) * p[2]) / 1e6;
      }
      if (Array.isArray(m?.content)) for (const p of m.content) {
        if (p.type === 'tool_use') tools.set(p.name, (tools.get(p.name) ?? 0) + 1);
        if (p.type === 'tool_result') for (const x of JSON.stringify(p.content).matchAll(/deny network-outbound ([a-z0-9.:-]+)/g)) refused.push(x[1]);
      }
    }
    const ts = lines.map((j) => j.timestamp).filter(Boolean).sort();
    console.log(JSON.stringify({ writer: dir.replace('-tmp-hv12-real-loc-worktrees-', ''), model, first: ts[0], last: ts.at(-1), prompts: prompts.length, tools: Object.fromEntries(tools), refused, cost: Math.round(cost * 10000) / 10000, types: [...types] }));
  }
}
