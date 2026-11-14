# Fix — npm's own update check does not stop an issue's writer

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** built, ready for review (2026-11-14). Planned by the spike `spike/hv12-issue-loop-real-run`.

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

## Decisions

1082 was free on `main` and every branch on 2026-11-14 (the other HV12 fixes were given other numbers).

| # | Question | Decision | Why |
|---|---|---|---|
| 1082 | What of npm's own network does an issue's writer get, beyond its installs? (extends 1052's table and 1053's `env`) | **A root `package.json` names the npm ecosystem, lockfile or not; the writer's `env` sets `npm_config_update_notifier=false`, which turns npm's and pnpm's update check off** | `npm install` with no lockfile reaches the registry, and `npm test` on a fresh cache checks npm's version there: HV12's two writers passed their tests and were stopped (1064). npm 11.19.1 and pnpm 12.8.1 both read the variable |

## As built

As planned, with three additions:

- **The plan's second test did not lint.** `JSON.parse(…).env` reads a member of `any`, which the
  typed ESLint refuses. The test reads `env` from a typed cast; it checks the same value.
- **Settings is tested at the service.** A third test reads `hiveSandboxService` on a folder with
  only a `package.json`: npm with `registry.npmjs.org`, the list Settings' **The writer's
  network** draws.
- **A Yarn or Deno repository with a `package.json` now also lists npm.** `registry.npmjs.org` is
  one more host for it, and its commands can run `npm` too. A lockfile-only rule could not cover
  the HV12 repository.

pnpm reads the npm variable: `pnpm config get update-notifier` gives `false` with
`npm_config_update_notifier=false` and `undefined` with `pnpm_config_update_notifier=false`
(pnpm 12.8.1).

## Results

The plan's two tests failed before the fix for the planned reasons (`expected [] to deeply equal
[ 'npm' ]`, `expected undefined to be 'false'`). They pass now, with the Settings test that was
written after the fix. `writer-reach.test.ts` has 16 tests. `pnpm check` and `pnpm build` pass.

A real writer: Claude Code 2.1.325, `claude -p` on Haiku, with the settings file the built
`prepareWriter` makes, in a scratch repository with a `package.json`, a `test.js` and no
lockfile. Each run had a new install cache, and each ran `npm test` (npm 11.19.1):

| Settings | `npm test` | `deny network-outbound` | Hive's `refusedHosts` | Cache after |
|---|---|---|---|---|
| `main`'s (no host, no variable) | passed | `registry.npmjs.org:443` | `registry.npmjs.org:443`: stopped | — |
| This branch's (`registry.npmjs.org`, variable off) | passed | none | none | — |
| The variable alone, no host | passed | none | none | `_logs` only |

The last row shows the variable alone is enough: npm made no request. The first row reproduces
HV12. A full Hive run from an issue was not repeated: `refusedHosts` is the step that stopped
HV12's writers, and it finds nothing in the branch's output.

Seen, not changed: npm 11 warns `Unknown env config "store-dir"` on every command, because 1053's
`npm_config_store_dir` is pnpm's setting. The warning says it "will stop working in the next major
version of npm". pnpm 12.8.1 still reads it, and it reads no `pnpm_config_store_dir`. A later
npm may need the store set another way.
