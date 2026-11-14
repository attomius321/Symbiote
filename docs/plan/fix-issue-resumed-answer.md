# Fix — A stopped workspace that goes on says so on its issue

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** built, ready for review (2026-11-14). Planned by the spike `spike/hv12-issue-loop-real-run`.

**Kind** fix · **Branch** `fix/issue-resumed-answer` · **Size** S · **Depends on** none

## The brief

**What happens**: Hive stopped the workspaces of issues 1 and 2 (a refused host). The issues got
"Symbiote stopped work on this: the writer needed a host it may not reach." and
`symbiote: stopped`. The person allowed the host and sent each agent a message, and Hive's rounds
went on (`rounds-again`, 13:01:10). A request opened ("A pull request is open: …", the label left
as it was, decision 1020) and merged. For 6 to 7 minutes each issue said Symbiote had stopped
while it worked, until the landing removed the label.

**How to reproduce**: a workspace from an issue stopped by Hive (any stop kind), then a message to
its agent. The issue keeps its stop's comment as the last word and its `symbiote: stopped` label.

**Where to look**:
- `packages/cli/src/hive-round.ts:132-156` (`answered`): only `request-opened`, `landed` and
  `stuck` become steps.
- `hive-round.ts:446-468` (`roundsAgain`): the `rounds-again` event, which does not say what the
  workspace was before.
- `packages/cli/src/issue-answering.ts:61` (`answerOfHiveEvent`) and
  `packages/cli/src/issue-answer.ts:16-30` (`AnswerStep`), `answerOf` (the sentence and labels).

**Out of scope**: a message in the middle of the rounds (the workspace never stopped): nothing to
say. The 6-comment limit (decision 1022) holds; past it, the label still moves.

**Done when**: a `rounds-again` that follows a stop carries `after: 'stuck'`. It becomes a step,
`resumed`, with the comment "Symbiote's Hive is working on this again in `<branch>`." Its label is
`symbiote: working`, and the other three are removed. Each such restart has its own key.

## The failing test

Added to `packages/cli/test/issue-answering.test.ts`; run red on HV12's branch: `expected null to
deeply equal { step: 'resumed', branch: 'b', …(1) }` (the second test passes today and must stay
so).

```ts
describe('a stopped workspace that goes on (HV12)', () => {
  const at = '2026-11-14T13:01:10Z';

  it('is said on its issue: working again, after a stop', () => {
    expect(
      answerOfHiveEvent('rounds-again', { prompt: at, after: 'stuck' }, { branch: 'b', at }),
    ).toEqual({ step: 'resumed', branch: 'b', at });
  });

  it('a message in the middle of the rounds says nothing', () => {
    expect(answerOfHiveEvent('rounds-again', { prompt: at }, { branch: 'b', at })).toBeNull();
  });
});
```

Then the runner's: a workspace from an issue stopped, a message to its agent, and one `resumed`
due in the issue's events.

## Verification

The tests above; HV11's answer tests unchanged; `pnpm check`, `pnpm build`;
`issues-answered.spec.ts`.

## Decisions

1084 was free on `main` and every branch on 2026-11-14 (the brief set aside 1084–1085).

| # | Question | Decision | Why |
|---|---|---|---|
| 1084 | What does an issue say when Hive's rounds go on after Hive stopped its workspace? (extends 1020's steps and 1072's stops) | **A step, `resumed`: "Symbiote's Hive is working on this again in `<branch>`.", `symbiote: working` added, the other three removed. Only a `rounds-again` that follows a stop (`after: 'stuck'` in its event) is one; its key is `resumed:<branch>:<at>`, one answer a restart. Rounds that start again in their middle say nothing** | The last word on the issue was "stopped" while Hive worked (HV12: 6 to 7 minutes on issues 1 and 2). The rounds' event is what knows the step before; a message in the middle of the rounds leaves the issue right already. A workspace can stop and go on more than once, as a stop can (1072's `stopped:<branch>:<at>`) |

## As built

As planned. `roundsAgain` (`packages/cli/src/hive-round.ts`) adds `after: 'stuck'` to its event
when the record it leaves is at `stuck`; Hive's `answered` takes `rounds-again` among the events it
may answer (`ANSWERED`). `answerOfHiveEvent` (`issue-answering.ts`) makes a `resumed` step of it,
and `issue-answer.ts` gives the step its key, sentence and label. Of `roundsAgain`'s five callers,
only `waiting` (`hive-landing.ts`) runs at `stuck`: the person's message to a stopped workspace.
The others run at `landing`, `checking`, `reviewing` or a paused `writing`, in the middle of the
rounds.

The step counts toward the 6 comments an issue (decision 1022): past them, its labels still move.

## Results

- The plan's two tests (`issue-answering.test.ts`): the first red on `main` as the plan says
  (`expected null to deeply equal { step: 'resumed', branch: 'b', …(1) }`), the second green
  before and after.
- `issue-answer.test.ts`: the sentence and labels, and two restarts' keys apart.
- `hive-runner.test.ts`, its own describe block: a workspace from issue #12 stopped (no forge to
  open a request), the person's message, `resumed` due once; stopped and messaged again, a second
  `resumed` with its own key (4 due steps, 4 keys). A message at `landing` (in the middle of the
  rounds): `rounds-again`, nothing due. The first was red before the fix (`expected [ 'stopped' ]
  to deeply equal [ 'stopped', 'resumed' ]`).
- HV11's answer tests unchanged and green.
