# Fix — A queue landing's push is recorded as it went: landed after its push, landed once

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** built, ready for review (2026-11-14). Planned by the spike `spike/hv12-issue-loop-real-run`.

**Kind** fix · **Branch** `fix/queue-landing-push` · **Size** M · **Depends on** none

## The brief

**What happens**: both of HV12's landings through Hive's queue pushed `main` to GitHub (`git
ls-remote`, and GitHub closed each issue by the merge commit's `Closes #n`). Both recorded
`pushed: false`. So did all 4 landings through the queue in this repository on 2026-11-02. Two
causes:

1. **`landed` before the push.** The queue sets the entry `landed` after the fast-forward, then
   pushes. Issue 2's queue log has the fast-forward at 13:11:34.395 and `Pushed to origin` at
   13:11:36.601. Hive read the entry at 13:11:34.467 and recorded `pushed: entry.pushed?.ok ??
   false`.
2. **Hive lands the queue's own `ready`.** After its check passes, the queue sets the entry
   `ready`, then lands it. The write wakes Hive, which reads `ready` as "the person's checkout
   refused the fast-forward" (decision 770). Never having tried, it calls `land` at once. Issue 1's
   log has "Land in main" twice, 9 ms apart, and two fast-forwards. It also has two pushes:
   `Pushed to origin` (13:12:31.428), then `Not pushed …[remote rejected]… cannot lock ref
   'refs/heads/main': is at 713ac19… but expected d170b82…` (13:12:31.827). The second's words are
   the entry's `pushed`, and the Run tab shows them.

**How to reproduce**: the two tests below. On a real forge: any Hive queue landing with a check
under a second; the second cause showed on 1 of 2.

**Where to look**:
- `packages/cli/src/merge-land.ts:77-94` (`landEntry`: `state: 'landed'`, then `push`, then
  `set(id, { pushed })`).
- `packages/cli/src/merge-run.ts:253-264` (`checkMerge`: `ready`, then `landEntry`).
- `packages/cli/src/hive-landing.ts:288-303` (a `landed` entry read once, its `pushed` copied) and
  `:318-323` (a `ready` entry landed again when never tried).

**Out of scope**: a person's own landing with `merge.push` (the same order, but nothing reads its
`pushed` early); Hive's push of a workspace's branch after a turn.

**Done when**:
- A Hive entry reads `landed` only with its push answered: `pushed` set in the same write, ok or
  with git's words.
- Hive lands again only an entry the person's checkout refused (one with the queue's "was not
  moved" message), never the queue's own `ready` before it lands.
- One landing makes one fast-forward and one push: the queue's log has one "Land in" step.

## The failing tests

Both run red on HV12's branch. The first is added to `packages/cli/test/merges.test.ts` (a
`pre-receive` hook that sleeps 1 s holds the push):

```ts
describe("a Hive entry's push, before it reads as landed (HV12)", () => {
  it('is landed only with its push answered', async () => {
    const { repo, shas } = setup();
    const remote = origin(repo);
    writeFileSync(join(remote, 'hooks', 'pre-receive'), '#!/bin/sh\nsleep 1\n', { mode: 0o755 });
    review(repo, 'topic', { head: shas.T, into: 'main' });
    const m = await make(repo);
    await m.enqueue({ branch: 'topic', into: 'main', by: 'hive' });
    let first: Awaited<ReturnType<typeof m.list>>['merges'][number] | undefined;
    while (!first) {
      const [entry] = (await m.list()).merges;
      if (entry?.state === 'landed') first = entry;
      else await new Promise((done) => setTimeout(done, 10));
    }
    expect(first.pushed).toEqual({ ok: true, remote: 'origin' });
    await m.idle();
  }, 20_000);
});
```

Red: `expected undefined to deeply equal { ok: true, remote: 'origin' }`.

The second is added to `packages/cli/test/hive-runner.test.ts`. The window is held open: the
queue does not run, and its entry reads as the queue writes it at its check's end.

```ts
describe("the queue's own ready, a moment before it lands (HV12)", () => {
  it('is not a refused checkout: Hive lands nothing itself', async () => {
    const repo = repository(['true']);
    const s = await setup(repo, { land: true });
    const queue = s.merges!;
    const enqueue = queue.enqueue.bind(queue);
    queue.enqueue = (request) => enqueue(request, { start: false });
    const list = queue.list.bind(queue);
    queue.list = async () => {
      const read = await list();
      return {
        ...read,
        merges: read.merges.map((e) => (e.state === 'queued' ? { ...e, state: 'ready' as const } : e)),
      };
    };
    const land = vi.spyOn(queue, 'land');
    await s.turn(true);
    const worktree = await s.start('feature/once');
    const runner = s.runner();
    await s.fake.endTurn(worktree, { files: { 'once.txt': 'once\n' } });
    await settle(
      runner,
      s,
      async () => (await readHive(s.where, 'feature/once'))?.landings?.at(-1)?.entry !== undefined,
      'queued',
    );
    await runner.tick();
    await runner.idle();
    expect(land).not.toHaveBeenCalled();
  }, 60_000);
});
```

Red: `expected "land" to not be called at all, but actually been called 1 times`. HV4's test
"the person's checkout in the way: Hive lands again until it can" must still pass.

## Verification

The tests above; the merger's and Hive's landing tests unchanged; `pnpm check`, `pnpm build`, the
merges and Hive e2e specs. Then a real queue landing to a GitHub remote records `pushed: true`,
and its log has one "Land in" step.

## Decisions

1088 and 1089 were set aside for this fix by the brief (HV12's other fixes take other numbers).

| # | Question | Decision | Why |
|---|---|---|---|
| 1088 | When does a Hive entry read `landed`? (amends 768's "pushed after landing") | **Only with its push answered: the target fast-forwarded, pushed, then `state: 'landed'`, `landed` and `pushed` in one write.** Until then it stays where it was (`ready`). A person's landing with `merge.push` keeps its order: `landed`, then `pushed` | Hive reads `landed` as done and copies `pushed` once. Written before the push, both of HV12's queue landings recorded `pushed: false` for pushes that went |
| 1089 | Which `ready` does Hive land again? (narrows 770) | **Only one the target's checkout refused: the queue's "`<into>` was not moved…" message (`refusedByCheckout`). Any other `ready` waits, as `merging` does. And the merger refuses a second landing of an entry while one runs (409, "`<branch>` is landing")** | The queue writes `ready` a moment before it lands its own entry. Hive landed it then too: two fast-forwards and two pushes in 9 ms, the second's rejection the entry's `pushed` |

## As built

As planned, with three additions:

- **A second landing of the same entry is refused** while one runs (`landEntry` keeps the IDs in
  flight). The plan only stopped Hive from asking. Pushing before `landed` makes the window
  between the fast-forward and `landed` as long as the push (up to 120 s), and the entry reads
  `ready` meanwhile: a Land then would find the target moved and merge again. In one process only:
  another process merges only behind the queue's lock.
- **A re-landing's refusal words go before its push.** An entry Hive lands again after a refusal
  still carries "was not moved" while it pushes. A push slower than Hive's retry (60 s) would read
  as refused again. The message is cleared after the fast-forward, before the push.
- **A third test**, in `merges.test.ts`: while a Hive entry pushes, `land` is refused, and its log
  has one "Land in main" step.

The refusal's words are built in one place (`notMoved` in `merge-land.ts`), and
`refusedByCheckout` reads them, so the two cannot drift apart.

## Results

- **The tests**: the plan's two failed on `main`'s code as the plan says (`expected undefined to
  deeply equal { ok: true, remote: 'origin' }`; `"land" … called 1 times`); so did the third
  (`land` resolved instead of refusing). All three pass. `merges.test.ts`, `hive-runner.test.ts`
  and `mark-merged.test.ts` otherwise unchanged: 199 of 199, HV4's "the person's checkout in the
  way" among them.
- **`pnpm check`** (3871 tests) and **`pnpm build`** pass, and so do the merges and Hive e2e specs: 41 of 41.
- **A real queue landing to GitHub** (the private scratch repository of HV12, its `npm test` check
  of 0.2 s, the built merger driven by a script, the entry queued `by: 'hive'`): the entry read
  `queued`, `merging` (+1.8 s), `checking`, `ready` (+2.0 s), then `landed` (+5.8 s). The first
  `landed` read had `pushed: { ok: true, remote: 'origin' }`. Its log has one "Land in main" step,
  one fast-forward and one `Pushed to origin`; `git ls-remote` gave the merge, `b967062`. The
  entry was `ready` for 3.8 s while it pushed: the window the refused second landing covers.
  Hive's side of it (`follow`) was not in this run; the unit test covers it.
