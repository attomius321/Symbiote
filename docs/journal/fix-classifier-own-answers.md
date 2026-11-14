# Journal: Fix — the classifier reads no answer of Symbiote's own

[Index](../JOURNAL.md) · [Plan](../plan/fix-classifier-own-answers.md)

## Fix — Symbiote's comments and labels left out of the snapshot (2026-11-14, branch `fix/classifier-own-answers`)

Asked: Hive answers an issue with the person's token (HV11), so the snapshot read its comments as
the owner's (decision 1001). HV12's classifier gave Hive's stale "A pull request is open" as a
reason, and each answer changed the hash: the card said the issue changed, and a start classified
again first (1011).

**Learned**:
- **Labels changed the hash as much as comments.** Read only, the built branch hashed HV12's eight
  real issues as the Issues page does. With Hive's comments left out, issues 4 to 7 still read as
  changed: their only change was Hive's `symbiote: declined`. Issue 3's record had read
  `Labels: symbiote: question` too. Every step that writes a comment also sets or removes a label,
  so the labels Symbiote's `labelled` events added are left out as well (decision 1087).
- **GitLab's addresses differ between reading and writing.** The recorded gitlab-runner issue's
  `web_url` is `…/-/work_items/40247`, so a note reads as `…/work_items/40247#note_<id>`, while
  `commentOnIssue` records `…/-/issues/40247#note_<id>`. Comparing whole addresses would never
  leave a GitLab answer out. They are compared by the anchor, `note_<id>` or
  `issuecomment-<id>`, which names one comment on the forge (decision 1086).
- **Two places hash an issue.** The classifier, and the Issues page's `GET /api/issues/<n>`, whose
  hash a start compares with the record. Both read the events now, through one reader,
  `ownAnswers`.
- **The person's own words with the same account stay read.** Issue 3's answer to Hive's question
  was typed by hand by the owner's account, and no event records it.

**Fixed**: `issueSnapshot` takes `{ own, ownLabels }`. A comment whose anchor is an `answered`
event's is left out of the text and the hash, and counted as "Symbiote's own answers, left out:
n", a line written only when n > 0. A label a `labelled` event added, in any case, is left out of
Labels and the hash. An owner's comment reads "Comment by an owner".

**A record classified before the fix reads as changed once** where its hash held Hive's answers:
HV12's issues 1 to 3, which were classified again after Hive had answered them. Classifying one
again records a hash without them. An issue classified before Hive answered it (HV12's 4 to 8)
reads as unchanged at once.

**Verification**: the plan's two failing tests, and seven more (the count line, the person's own
comment with the same account, a GitLab note by its anchor, Symbiote's labels, the classifier's
and the Issues page's wiring). Each ran red on its assertion before the fix. HV9b's 30 snapshots
(vite, gitlab-runner, the hostile sets) have text, hash, counts and flags identical to `main`'s,
compared by recording each before and after. On HV12's real issues, read only:

| Issues | Record's hash now, `main` | This branch |
|---|---|---|
| 4–7 | changed | unchanged |
| 8 | changed | unchanged |
| 1–3 | changed | changed, once (their records held Hive's answers) |

Leaving out only the answers made after each classification, issues 1 and 2 match their records.
Issue 3 matches once Hive's removed `symbiote: question` is added back. `pnpm check`: 3,876 tests
in 278 files (one run at load average 29 timed out six slow tests in unrelated files; they passed
alone, and the next full run passed). `pnpm build` passed. `issues-classify.spec.ts` and
`issues-start.spec.ts`: 5 of 5. The whole e2e suite was not run: no viewer code changed.
