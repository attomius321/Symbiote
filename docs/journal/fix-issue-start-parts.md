# Journal: Fix — a take whose answer fills other kinds' parts starts

[Index](../JOURNAL.md) · [Plan](../plan/fix-issue-start-parts.md)

## Fix — the other kinds' parts kept in Notes (2026-11-14, branch `fix/issue-start-parts`)

Asked: Start in Hive and Nucleus's `start_from_issue` refused every take the real classifier
wrote in HV12 (6 of 6, `POST /api/issues/1/start` → 400, "a fix has no "What is known""). Opus
fills parts its kind does not have, and `startFromIssue` passed every part with text to
`start()`, which refuses a part outside `partsOf(kind)`.

**Learned**:
- **The tests had the bug's shape all along.** HV10b's fixture take (`a01`, Opus at high, HV9a)
  is a fix with `known` and `outOfScope`, and its request test expected both in the request,
  against its own comment. The test's `start` is a fake that never calls `workOf`, so it passed.
  The e2e fakes left every other kind's part empty, so `start()` never refused one there either.
- **The card's brief lost the same text.** `issueBrief` built the record's brief from the kind's
  parts only: issue 1's "Expected result: `5400000`" was in no brief, not even the one the card
  shows. The fix gives the card, the start and the classifier's length check one function.
- **HV12's takes cannot be replayed.** The run edited the 6 records by hand before starting
  them; no record or event keeps an original answer.

**Fixed**: `partsFor(kind, parts)` (`packages/cli/src/workspace-brief.ts`) keeps the kind's own
parts as written and adds each other part with text to Notes, after the classifier's notes, as
`<heading>: <text>` in the brief's order. `startFromIssue` sends those parts, and refuses with
words (409) when the brief would pass 20,000 characters. `issueBrief` and `answerMisfit`'s
`brief` check use it too. A person's own request to `start()` is still refused a part outside its
kind. Decision 1080.

**Verification**:
- The plan's test (`startFromIssue: a take with parts of other kinds (HV12)`) failed on `main`
  with `FeatureRefused: a fix has no "What is…`, as on HV12's branch, and passes. Two more tests
  there: each part under its heading in order, for a fix and a feature; and the refusal over the
  limit. In `issue-classify.test.ts`, the card's brief holds `What is known: …` in Notes, and an
  answer whose `known` passes the limit is a misfit. All five failed first for the right reason.
- HV10b's request test changed one line: its expected parts are filtered by `partsOf('fix')`.
- `issues-start.spec.ts`'s fake take is now a fix with `known` and `outOfScope`, and the spec
  checks the writer's prompt holds them in Notes. Run on `main`'s three source files it failed:
  no workspace opened. It passes on this branch.
- `pnpm check`: 3,871 tests in 278 files. `pnpm build` passed. The e2e of Start in Hive
  (`issues-start`, `issues-classify`, `issues-answered`): 8 of 8.
- Not verified: a real take from Opus started through this build (HV12's records were edited by
  hand, and a new real run is HV12b's).
