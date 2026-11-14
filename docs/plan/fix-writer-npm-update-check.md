# Fix — npm's own update check does not stop an issue's writer

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** planned (2026-11-14) by the spike `spike/hv12-issue-loop-real-run`. Not started.

**Kind** fix · **Branch** `fix/writer-npm-update-check` · **Size** S · **Depends on** none

## The brief

**What happens**: HV12's two first writers did their work in 19 and 26 s: test first, the fix,
`npm test` passing, a commit. Hive then stopped both: "Claude Code's sandbox refused
registry.npmjs.org:443: add it to hive.sandbox.allowedDomains". `npm test` itself needs no
network. npm checks its own version on a fresh cache, and every writer has a fresh cache
(decision 1053). The repository has a `package.json` and no lockfile, so the writer's sandbox
allows no npm host (decision 1052). Each refused host stops the workspace (decision 1064), even
when the command that hit it passed. The person allowed the host and restarted both, 6.5 minutes
later.

**How to reproduce**: a repository with a `package.json`, no dependencies and no lockfile,
`npm test` as its check; any issue's writer that runs `npm test`. Measured on npm 11.19.1: with a
new cache, `npm test --loglevel silly` names the update check and writes
`_update-notifier-last-checked`. With `npm_config_update_notifier=false` it does neither.

**Where to look**:
- `packages/cli/src/writer-reach.ts:33-45` (`ECOSYSTEMS`, npm: lockfiles only, not
  `package.json`).
- `writer-reach.ts:186-196`, the writer's `env` (the install caches, no update setting).
- `packages/cli/src/hive-writing.ts:25` (`refusedHosts` read from the turn's outputs, decision
  1064).

**Out of scope**: decision 1064 itself (a host the work needs still stops the workspace); other
tools' telemetry (`NEXT_TELEMETRY_DISABLED` and the like) until a run meets one.

**Done when**:
- An issue's writer runs with npm's and pnpm's update check off (`npm_config_update_notifier`
  set to `false` in its settings' `env`).
- A root `package.json` names the npm ecosystem, so `npm install` in a repository with no lockfile
  reaches its registry.
- Settings' **The writer's network** shows npm for such a repository.

## The failing tests

Added to `packages/cli/test/writer-reach.test.ts`; run red on HV12's branch: `expected [] to
deeply equal [ 'npm' ]` and `expected undefined to be 'false'`.

```ts
describe("npm's own update check (HV12)", () => {
  it('a package.json alone names npm', () => {
    expect(ecosystemsAt(['package.json']).map((e) => e.name)).toEqual(['npm']);
  });

  it("turns npm's and pnpm's update check off in the writer's env", () => {
    const env = JSON.parse(
      issueWriterSettings({
        hooks: HOOKS,
        folder: writerFolder('/c/symbiote', '/w/fix-1'),
        cacheDir: '/c/symbiote',
        hosts: [],
        secrets: [],
        protect: [],
      }),
    ).env as Record<string, string>;
    expect(env.npm_config_update_notifier).toBe('false');
  });
});
```

The existing test of the writer's `env` ("sets the variables in env…") lists every variable and
gains the new one.

## Verification

The tests above; `pnpm check`, `pnpm build`. Then a real writer in a repository with a
`package.json` and no lockfile: `npm test` runs with no `deny network-outbound` line, and the
workspace is not stopped.
