# Journal: Fix — a queue landing's push is recorded as it went

[Index](../JOURNAL.md) · [Plan](../plan/fix-queue-landing-push.md)

## Fix — `landed` with its push answered; Hive never lands the queue's own `ready` (2026-11-14, branch `fix/queue-landing-push`)

Found by [HV12's real run](hv12-issue-loop-real-run.md): both queue landings pushed `main` to
GitHub and recorded `pushed: false`, and one landing pushed twice.

**Learned**:
- **One cause, met twice: Hive acts on a state read between two writes.** The queue wrote
  `landed`, then pushed, then wrote `pushed`; Hive copied `pushed` from the first write. The
  queue wrote `ready` after its check, then landed; Hive took that `ready` for a refused checkout
  (770) and landed it too. Each write wakes Hive, so any gap is read.
- **Pushing before `landed` widens another gap.** Between the fast-forward and `landed` the entry
  reads `ready` for as long as the push takes: up to 120 s, against milliseconds before. A Land
  in that window (Hive's, or the person's button) found the target moved and would have merged it
  again. The plan's tests did not cover it; a third test does, and the merger now refuses a second
  landing of an entry while one runs.
- **A re-landing carries its old refusal.** After a refused fast-forward the entry keeps "was not
  moved" while Hive's next Land pushes. A push slower than Hive's 60 s retry would read as refused
  again, so the message is cleared before the push.
- **A refusal is told by the queue's own words.** `refusedByCheckout` reads "`<into>` was not
  moved", built by the same helper that writes it. No new field in `MergeEntry`, which the viewer
  and the API share.

**Fixed**: `landEntry` (`packages/cli/src/merge-land.ts`) pushes a Hive entry before `landed` and
writes `state: 'landed'`, `landed` and `pushed` at once (decision 1088); a person's landing with
`merge.push` keeps its order. `follow` (`packages/cli/src/hive-landing.ts`) lands again only a
`ready` that `refusedByCheckout` says the checkout refused; any other `ready` waits as `merging`
does. `landEntry` refuses an entry already landing: 409, "`<branch>` is landing" (decision 1089).

**Verification**: the plan's two tests and a third failed on `main`'s code for the reasons the
plan gives, and pass. The merger's, Hive's and `mark_merged`'s tests are otherwise unchanged:
199 of 199, HV4's "the person's checkout in the way" among them. `pnpm check` (3871 tests),
`pnpm build`, and the merges and Hive e2e specs (`merges`, `merge-send`, `hive*`: 41 of 41)
pass. A real queue landing `by: 'hive'` to HV12's private scratch repository on GitHub, through
the built merger: its first `landed` read had `pushed: { ok: true, remote: 'origin' }`, its log
one "Land in main" step and one `Pushed to origin`, and GitHub's `main` was the merge. The entry
sat at `ready` for 3.8 s while it pushed. Not run: a whole Hive loop on GitHub, so Hive's side
(`follow`) is proven by the unit test only.
