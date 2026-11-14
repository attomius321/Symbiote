# Fix — The classifier reads no answer of Symbiote's own

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** built, ready for review (2026-11-14). Planned by the spike `spike/hv12-issue-loop-real-run`.

**Kind** fix · **Branch** `fix/classifier-own-answers` · **Size** S · **Depends on** none

## The brief

**What happens**: Hive answers an issue with the person's token (HV11), so each answer is a
comment by the repository's owner. The snapshot reads members' comments (decision 1001), so the
classifier reads Hive's own sentences as the owner's words:

- Issues 1 and 2 had landed through #9 and #10, been reverted, and reopened. Classified again, the
  classifier gave as a reason: "PR #9 is open but not merged, so by the comments the bug isn't
  fixed yet. Maintainers may want to check PR #9 before merging a second fix." The decision was
  right (take); the reason came from Hive's stale "A pull request is open: …".
- Each answer changes the snapshot's hash. After the "asked" comment, and after "working on this",
  the card says "The issue changed since it was classified" and offers Classify again. A start
  then classifies again first (decision 1011), at its cost.
- The snapshot names an owner's comment "Comment by a owner".

**How to reproduce**: a taken issue that Hive answered; `GET /api/issues/<n>`'s `snapshot` differs
from the record's. Or the tests below.

**Where to look**:
- `packages/cli/src/issue-snapshot.ts:116-119` (`commenter`), `:121-180` (`issueSnapshot`: the
  comments read, the hash, `a ${role}`).
- The issue's events: each `answered` line keeps the comment's `url` (HV11, decision 1071).
- `packages/cli/src/issue-classifier.ts`, where the snapshot is taken and the page's
  `snapshot` hash is computed (decision 1057).

**Out of scope**: comments the person writes by hand with the same account (they are the
person's); a bot account (HV11's later list).

**Done when**:
- A comment whose address is one of the issue's `answered` URLs is left out of the text and of the
  hash. The snapshot counts them on a line of their own ("Symbiote's own answers, left out: 2").
- An issue that only Hive commented on since its snapshot reads as unchanged.
- An owner's comment reads "Comment by an owner".

## The failing tests

Added to `packages/cli/test/issue-snapshot.test.ts` (it imports `Issue` and `IssueComment`
already); run red on HV12's branch, each on its assertion.

```ts
describe("Symbiote's own answers on the issue (HV12)", () => {
  const own = (issue: Issue): IssueComment => ({
    author: { login: 'maintainer', role: 'owner' },
    body: 'A pull request is open: https://github.com/vitejs/vite/pull/9.',
    created: '2026-11-14T13:01:38Z',
    url: `${issue.url}#issuecomment-6877633148`,
  });

  it('are left out of what the classifier reads, and of the hash', () => {
    const issue = viteIssue();
    const answer = own(issue);
    const before = issueSnapshot(issue, AT);
    const after = (issueSnapshot as (...a: unknown[]) => ReturnType<typeof issueSnapshot>)(
      { ...issue, thread: [...issue.thread, answer] },
      AT,
      { own: [answer.url] },
    );
    expect(after.text).not.toContain('A pull request is open');
    expect(after.hash).toBe(before.hash);
  });

  it('names an owner\'s comment "an owner"', () => {
    const issue = viteIssue();
    const comment = { ...own(issue), body: 'It still fails on 6.1.', url: undefined };
    const { text } = issueSnapshot({ ...issue, thread: [comment] }, AT);
    expect(text).toContain('Comment by an owner,');
  });
});
```

The cast stands in for the third parameter the fix adds; once added, the call is typed.

## Verification

The tests above; HV9b's snapshot tests (the recorded vite and gitlab-runner issues, the hostile
sets) unchanged, their hashes too; `pnpm check`, `pnpm build`; `issues-classify.spec.ts`. A record
classified before the fix reads as changed once (its hash held Hive's answers): say so in the
journal.

## Decisions

1086 and 1087 were given to this fix; neither was on `main` or any branch on 2026-11-14.

| # | Question | Decision | Why |
|---|---|---|---|
| 1086 | Which comments on an issue are Symbiote's own, and what does the snapshot do with them? (narrows 1001's members' comments) | **A comment whose address is one of the issue's `answered` events' URLs (1071). It is left out of the text and the hash, and counted on its own line, "Symbiote's own answers, left out: n", written only when n > 0. Addresses are compared by the comment's anchor (`issuecomment-<id>`, `note_<id>`), else whole. A comment the person writes with the same account is read** | Hive answers with the person's token, so its comments carry the owner's role; the classifier read its stale "A pull request is open" as the owner's words, and each answer changed the hash. The events are the only sure mark: the account is the person's. GitLab reads a note as `/-/work_items/<n>#note_<id>` and an answer records `/-/issues/<n>#note_<id>`, so whole addresses would never match there. With no answer, the text is as it was, and every hash too |
| 1087 | Are the labels Symbiote sets on an issue part of its snapshot? (narrows 1001's labels) | **No: a label one of the issue's `labelled` events added (its name, in any case) is left out of the Labels line and the hash. A label of another name, or one the issue had that no event added, is read** | HV12's issues 4 to 7 changed only by Hive's `symbiote: declined`, and issue 3's record read Hive's `symbiote: question` as the issue's. "Asked" and "working on this" each come with a label, so with comments alone the card would still say the issue changed. The labels can be renamed (`hive.issues.labels`, 1018), so the events name them, not the defaults |

## As built

As planned, with four additions:

- **Symbiote's labels are left out too (decision 1087).** Read only, the built branch hashed
  HV12's eight real issues as the Issues page does. With comments alone left out, issues 4 to 7
  still read as changed. Their only change since they were classified was Hive's
  `symbiote: declined` label. Each step that writes a comment also sets or removes a label, so
  the brief's own symptom would have stayed.
- **Comments are matched by their anchor.** The recorded gitlab-runner issue's `web_url` is
  `…/-/work_items/40247`, while `GitLabForge.commentOnIssue` records `…/-/issues/40247#note_<id>`.
  Equal addresses would have left no GitLab answer out. The anchor names one comment on the forge.
- **Both places that hash the issue read the events.** The classifier (`issue-classifier.ts`
  reads them before `classifyIssue`) and the Issues page's `GET /api/issues/<n>`
  (`issuesService`'s new `own` argument, given by `command-view.ts`), which the start compares
  with the record (1011, 1057). One reader, `ownAnswers` in `issue-record.ts`.
- **The line is written only when there are answers**, so an issue Hive never answered reads
  exactly as before, its text and its hash.

A record classified before the fix may read as changed once: its hash held the Hive answers that
were on the issue when it was classified. Classifying it again records a hash without them.

## Results

Read only: HV12's private repository on GitHub (issues 1 to 8) and its records in
`/tmp/hv12-real/loc/symbiote`. Each record's hash was compared with the hash the Issues page
gives now, the one a start compares (1011, 1057).

| Issues | Record's hash now, `main` | This branch |
|---|---|---|
| 4–7 (refused, 1 answer and 1 label each, after the classification) | changed | unchanged |
| 8 (taken, 2 answers, a label set and removed) | changed | unchanged |
| 1–3 (classified again with Hive's answers on them) | changed | changed, once |

Issues 1 to 3 had 3, 3 and 2 of Hive's comments in their records' text. With only the answers
after each classification left out, 1 and 2 match their records. Issue 3 matches once the
`symbiote: question` label is added back: Hive removed it after the classification. Issue 3's
other owner comment, the person's answer typed by hand, is still read.

HV9b's 30 snapshots (vite, gitlab-runner, the hostile sets): text, hash, counts and flags
identical to `main`'s.
