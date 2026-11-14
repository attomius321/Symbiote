# Journal: Fix — npm's own update check does not stop an issue's writer

[Index](../JOURNAL.md) · [Plan](../plan/fix-writer-npm-update-check.md)

## Fix — the update check off, a `package.json` names npm (2026-11-14, branch `fix/writer-npm-update-check`)

Asked: HV12's two first writers passed `npm test` and committed in 19 and 26 s, and Hive stopped
both: "Claude Code's sandbox refused registry.npmjs.org:443". The repository had a `package.json`
and no lockfile, so the writer's sandbox allowed no npm host (1052). Every writer has a new
install cache (1053), and on a new cache npm checks its own version at the registry.

**Learned**:
- **The update check is the only request `npm test` makes.** With a new cache, npm 11.19.1 writes
  `_update-notifier-last-checked` after `npm test`; with `npm_config_update_notifier=false` the
  cache holds only `_logs`.
- **pnpm reads npm's variable, not its own prefix.** On pnpm 12.8.1,
  `npm_config_update_notifier=false` sets `update-notifier` to `false`;
  `pnpm_config_update_notifier=false` leaves it unset. `npm_config_store_dir` reaches pnpm the
  same way.
- **The plan's test did not pass lint.** Reading `.env` from `JSON.parse`'s `any` fails
  `no-unsafe-member-access`. The test now reads it from a typed cast.
- **npm warns about 1053's `npm_config_store_dir`** on every command: `Unknown env config
  "store-dir". This will stop working in the next major version of npm.` It is pnpm's setting.
  Not changed here.

**Fixed**: `writerEnv` (`packages/cli/src/writer-reach.ts`) sets
`npm_config_update_notifier: 'false'`, and the npm ecosystem matches a root `package.json`.
Settings' **The writer's network** reads the same table, so it shows npm for such a repository.
Decision 1082.

**Verification**: three tests in `writer-reach.test.ts`. The plan's two failed on `main` as it
says (`expected [] to deeply equal [ 'npm' ]`, `expected undefined to be 'false'`). A third checks
`hiveSandboxService`, the service behind Settings. The test that lists the writer's `env` gains
the variable. `pnpm check` and `pnpm build` pass.

A real writer ran three times in a scratch repository with a `package.json` and no lockfile:
Claude Code 2.1.325, `claude -p` on Haiku, the built `prepareWriter`'s settings, a new cache each
time. `npm test` passed in all three. Only `main`'s settings gave `deny network-outbound
registry.npmjs.org:443`, and Hive's `refusedHosts` named that host in the command's output. With
the branch's settings, or with only the variable and no host allowed, there was no deny line and
`refusedHosts` found nothing. A full Hive run from an issue was not repeated.
