# Fix — A request merged while Hive pushes lands; it does not stop

[Index](../PLAN.md) · Found by [HV12's run again](../journal/hv12-issue-loop-real-run.md) (its second entry)

**Status:** planned (2026-11-14) by the spike `spike/hv12-real-run-again`.

**Kind** fix · **Branch** `fix/request-merged-while-pushing` · **Size** S · **Depends on** none

## The brief

**What happens**: Hive stops a workspace whose pull request has just merged, and lands it on its
next read of the request. In HV12's run again, request #9 (issue 2) conflicted after #10 merged:

| Time (UTC) | What |
|---|---|
| 16:36:52 | Hive reads #9 as not mergeable and sends its writer `hive.land` |
| 16:37:01 | The person resolves the conflict on GitHub: a merge commit on the branch |
| 16:37:14 | The person merges #9 |
| 16:37:21 | The writer commits its own merge of `main`; Hive checks it (0.21 s) and reviews it (14.7 s, $0.112, approved) |
| 16:37:38 | Hive pushes the branch: `! [rejected] … (fetch first)`. Hive stops the workspace: "the branch was not pushed to origin", `stop: landing` |
| 16:37:51 | Hive's request poll comes due: #9 merged, the workspace landed |

The stop says something false: the work had landed 24 s before it. Issue 2 had been closed by
#9's `Closes #2`, so Hive wrote nothing to it (decision 1073). An issue a merge does not close
gets "Symbiote stopped work on this" and `symbiote: stopped`, then the landing removes the label.

**How to reproduce**: the failing test below. On a real forge: a request that conflicts; while
Hive's writer merges the target in, resolve the conflict on the forge and merge the request.

**Where to look**:
- `packages/cli/src/hive-landing.ts:146-154` (`land`): the branch is pushed first. With a request,
  a push that fails stops the workspace (decision 792), before the request on record is read.
- `hive-landing.ts:170-177`: the request on record, read through the one gate (decision 791):
  merged lands the workspace, closed stops it, open goes on.
- `packages/cli/src/hive-forge.ts:255-267` (`watchRequest`): the gate reads the request only
  when its poll is due (60 s, `REQUEST_POLL_MS`).

**Out of scope**: a resolution on the forge that is not merged (the request open, the forge's
branch ahead of Hive's): it still stops as 792 says, with git's words. Taking the person's
commits into the workspace is another change. So is the writer's merge of `main` that repeats the
person's (one turn and a review, $0.112 of review here).

**Done when**:
- A push that fails at a landing, with a request on record, reads that request at once, whatever
  its poll says.
- Merged: the workspace lands as any merged request does. No `stuck` event, no "stopped" answer
  on its issue.
- Closed: stopped as `request-closed`. Open: stopped as today, with the push's words.

## Approach

In `land`, when the push fails and `record.request` is awaited, read it through the gate first,
past its poll (`watchRequest(…, { landing: true, now: true })`, a read that skips `dueRead`).
Merged and closed take the gate's own paths; only an open request, or none, stops with the
push's words.

## The failing test

Added to `packages/cli/test/hive-runner.test.ts`, in the `describe.each` of HV8's request
landings, after "cannot merge: the writer merges main in…". Run red on this branch (`main` at
`d531987`), on GitHub's and GitLab's fake forges alike: `expected [ 'started', 'turn-ended',
…(21) ] to not include 'stuck'`. The stop's note is the run's: `the branch was not pushed to
origin: … ! [rejected] … -> feature/six (fetch first)`. The events are the run's too: `sent`,
`turn-ended`, the check and the review, `landing`, `pushed`, `stuck`.

```ts
it('merged on the forge while the writer merged main in too: landed, not stopped (HV12 again)', async () => {
  const { repo, remote, forge, s } = await requesting();
  const worktree = await s.start('feature/six');
  const runner = s.runner();
  await s.fake.endTurn(worktree, { files: { 'src/a.ts': 'export const a = "six";\n' } });
  await settle(runner, s, () => Promise.resolve(forge.requests.length === 1), 'opened');
  // main moves on the forge, on the same line: the request conflicts; Hive asks the writer.
  repo.write({ 'src/a.ts': 'export const a = "main";\n' });
  repo.commit('M: a is main');
  repo.git('push', '--quiet', 'origin', 'main');
  repo.git('reset', '--quiet', '--hard', 'HEAD~1');
  forge.conflict(12);
  await settle(
    runner,
    s,
    async () => (await readHive(s.where, 'feature/six'))?.merges === 1,
    'the conflict sent',
  );
  // Meanwhile the person resolves the conflict on the forge (HV12 again: #9, 16:37:01).
  const person = tempDir();
  folders.push(person);
  gitIn(person, 'clone', '--quiet', remote, '.');
  gitIn(person, 'checkout', '--quiet', 'feature/six');
  try {
    gitIn(person, 'merge', 'origin/main');
  } catch {
    // the conflict
  }
  writeFileSync(join(person, 'src', 'a.ts'), 'export const a = "main" + "six";\n');
  gitIn(person, 'add', '-A');
  gitIn(person, 'commit', '-qm', "Merge branch 'main' into feature/six");
  gitIn(person, 'push', '--quiet', 'origin', 'feature/six');
  forge.conflict(12, false);
  // The writer merges main in too and ends its turn; Hive takes the turn's end.
  try {
    gitIn(worktree, 'merge', 'main');
  } catch {
    // the conflict
  }
  writeFileSync(join(worktree, 'src', 'a.ts'), 'export const a = "main" + "six";\n');
  gitIn(worktree, 'add', '-A');
  gitIn(worktree, 'commit', '-qm', 'Merge main into feature/six');
  await s.fake.endTurn(worktree);
  await runner.tick();
  expect(await stepOf(s, 'feature/six')).not.toBe('writing');
  // The person merges the request while Hive checks and reviews the writer's merge (16:37:14).
  const merge = forge.merge(12);
  await settle(
    runner,
    s,
    async () => ['landed', 'stuck'].includes((await stepOf(s, 'feature/six')) ?? ''),
    'landed or stopped',
  );
  // Today: its push is refused (fetch first) and Hive stops a workspace whose request merged.
  expect(events(s.where, 'feature/six')).not.toContain('stuck');
  expect(await stepOf(s, 'feature/six')).toBe('landed');
  expect(repo.git('rev-parse', 'main')).toBe(merge);
}, 30_000);
```

The merge on the forge comes after Hive has taken the turn's end (`runner.tick()`). With the
merge before it, Hive's look at `writing` reads the request first (the tests' poll is 0) and
lands it: the test then passes on `main`. The run's order is the one that fails.

## Verification

The test above, on both fake forges; HV8's request tests unchanged (`closed without a merge`,
`cannot merge…`, the restart). `pnpm check`, `pnpm build`.

## Decisions

1092 was free on `main` and every branch on 2026-11-14 (the brief gives HV12's run again
1092–1093).

| # | Question | Decision | Why |
|---|---|---|---|
| 1092 | A landing's push of the branch fails while a request is on record: what does Hive read first? (narrows 792) | **The request, at once, past its poll: merged lands the workspace, closed stops it as `request-closed`, open stops it as 792 says, with the push's words** | HV12 again: the person resolved #9's conflict on GitHub and merged it while Hive's writer merged `main` in too. The push was refused 24 s after the merge, and Hive stopped a landed workspace for 13 s, until its 60 s poll came due. A refused push is news about the forge's branch: read it before saying the work stopped |
