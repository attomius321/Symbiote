# Journal: Fix — a stopped workspace that goes on says so on its issue

[Index](../JOURNAL.md) · [Plan](../plan/fix-issue-resumed-answer.md)

## Fix — "working on this again" after a stop (2026-11-14, branch `fix/issue-resumed-answer`)

Found by HV12's real run: Hive stopped the workspaces of issues 1 and 2 (a refused host), and each
issue got "Symbiote stopped work on this…" and `symbiote: stopped`. The person allowed the host
and messaged each agent; Hive's rounds went on, a request opened and merged. For 6 to 7 minutes
each issue said Symbiote had stopped while it worked.

**Learned**:
- **The rounds' event is the one place that knows the step before.** `roundsAgain` moves any
  record to `writing`; its `rounds-again` event said only when the person's prompt came. Of its five
  callers, only `waiting` (`hive-landing.ts`) runs on a stopped record, so `record.step === 'stuck'`
  in `roundsAgain` is the whole test, and the event now carries `after: 'stuck'`.
- **A message in the middle of the rounds has nothing to say.** At `landing`, `checking`,
  `reviewing` or a paused `writing`, the issue's label is `symbiote: working` already, or a
  request's comment left it as it was (decision 1020).
- **Each restart is its own step**, as each stop is: the key holds the event's time
  (`resumed:<branch>:<at>`). A workspace stopped and messaged twice gets two answers, within the 6
  comments an issue (decision 1022).

**Fixed**: a `rounds-again` with `after: 'stuck'` becomes the step `resumed`: "Symbiote's Hive is
working on this again in `<branch>`.", `symbiote: working` added, the other three removed.
Decision 1084. `docs/reference/configuration.md`'s table of answers has its row.

**Verification**: the plan's failing test red on `main` with the plan's message (`expected null to
deeply equal { step: 'resumed', branch: 'b', …(1) }`), green now; its second test green before and
after. A runner test of its own (`hive-runner.test.ts`): a workspace from issue #12 stopped, a
message, one `resumed` due; stopped and messaged again, a second with its own key. Red before the
fix (`expected [ 'stopped' ] to deeply equal [ 'stopped', 'resumed' ]`). A message at `landing`
gives `rounds-again` and nothing due. HV11's answer tests unchanged. `pnpm check` (3,873 tests)
and `pnpm build` pass; `issues-answered.spec.ts` 3 of 3. Not verified: a real run on a forge.
