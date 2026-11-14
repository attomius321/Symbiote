
describe("Symbiote's own answers on the issue (HV12)", () => {
  // HV12's real run: Hive's answers are posted with the person's token, so the classifier read
  // them as an owner's comments ("PR #9 is open but not merged" after #9 had merged), and each
  // answer changed the snapshot's hash.
  const own = (issue: Issue): IssueComment => ({
    author: { login: 'maintainer', role: 'owner' },
    body: "A pull request is open: https://github.com/vitejs/vite/pull/9.",
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
