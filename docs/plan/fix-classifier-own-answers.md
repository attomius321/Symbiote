# Fix — The classifier reads no answer of Symbiote's own

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** planned (2026-11-14) by the spike `spike/hv12-issue-loop-real-run`. Not started.

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
