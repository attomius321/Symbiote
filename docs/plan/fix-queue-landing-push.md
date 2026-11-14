# Fix — A queue landing's push is recorded as it went: landed after its push, landed once

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** planned (2026-11-14) by the spike `spike/hv12-issue-loop-real-run`. Not started.

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
