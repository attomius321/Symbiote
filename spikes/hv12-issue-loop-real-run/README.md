# HV12's real run: the scratch project, the issues, the scripts

What HV12 ran on a private scratch GitHub repository on 2026-11-14 (the answer:
`docs/journal/hv12-issue-loop-real-run.md`). Kept for HV12b (GitLab) and for the run after the
fixes.

- `seed/` — the scratch repository's first commit: `durations`, a small library and CLI with no
  dependencies, two real bugs (issues 1 and 8), `npm test`, and its `symbiote/config.json`
  (`merge.checks`, `hive.budget`, `hive.issues.about`).
- `issues/<n>.md` — the 8 issues' texts, the title on the first line. Open 7 only after 6 is
  refused.
- `scripts/` — what drove and measured the run:
  - `api.mjs` — the scratch view's API on port 4812: `node api.mjs GET|POST <path> [json]`
    trades the token printed in `view.log` (beside it) once and keeps the key in `key`; `node
    api.mjs link <path>` makes a one-time address for a browser with the bridge key.
  - `watch.mjs` — each new line of the clone's `symbiote/hive/` and `symbiote/issues/` events.
  - `mergeable.sh` — each new pull request read every second until GitHub knows `mergeable`.
  - `summary.mjs` — a classification's decision, flags, question, time and cost.
  - `writers.mjs` — each writer's transcript: its turns, tools, refused hosts and cost at list
    price.
  - `shots.mjs`, `webp.mjs` — the screenshots (run from `packages/viewer`, no `WAYLAND_DISPLAY`).
  - `timings.mjs` — each workspace's steps' times and reviews' cost, and its request's merge.
  - `shots-again.mjs` — the run again's Run tabs: `node shots-again.mjs <out> <branch>…`, copied
    into `packages/viewer/coverage/` (where `@playwright/test` resolves).
- `red-tests/` — each fix's failing test as it was run red, to append to the named test file
  (`fix7-test.ts`: the run again's, for `fix-request-merged-while-pushing`).

The run: the branch's `packages/cli/dist/bin.js view --no-open --port 4812`, started in the clone
(`/tmp/hv12-real/loc`) with `SYMBIOTE_CACHE_DIR=~/.cache/symbiote-hv12` and no `WAYLAND_DISPLAY`.
The cache is not under `/tmp`, because a writer's install cache must be writable inside its
sandbox, whose `/tmp` is its own. The person trusts the clone in Claude Code and turns Hive on.

The run again (2026-11-14, after the five fixes): the same, on `attomius321/symbiote-hv12-again`,
port 4813, the clone in `/tmp/hv12-again/loc`, the cache in `~/.cache/symbiote-hv12-again`. The
scripts take these as `HV12_PORT`, `HV12_CLONE`, `HV12_CACHE` and `HV12_REPO` (`api.mjs` also
`HV12_RUN`, where it keeps `view.log` and `key`); without them, the first run's.
